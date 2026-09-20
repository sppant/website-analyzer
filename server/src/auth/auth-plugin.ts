import fastifyCookie from "@fastify/cookie";
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";

import type { BillingState } from "../billing/plan.js";
import type { Mailer } from "../services/mailer.js";
import type { AuthRepository } from "./auth-repository.js";
import {
  AuthError,
  createAuthService,
  PASSWORD_RESET_RESPONSE,
  type AuthService,
  type PublicUser,
} from "./auth-service.js";

const SESSION_COOKIE = "session";

// Brute-force protection for the credential endpoints.
const AUTH_RATE_LIMIT = { max: 10, timeWindow: "10 minutes" } as const;

// Tighter limit for password reset requests (email sending / enumeration abuse).
const FORGOT_PASSWORD_RATE_LIMIT = {
  max: 5,
  timeWindow: "15 minutes",
} as const;

declare module "fastify" {
  interface FastifyRequest {
    /** The authenticated user, or `null` for anonymous requests. */
    user: PublicUser | null;
  }

  interface FastifyInstance {
    authService: AuthService;
    /** preHandler guard: responds 401 unless the request is authenticated. */
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    /**
     * preHandler guard: 401 if unauthenticated, 403 `PRO_REQUIRED` if the
     * authenticated user is not on the Pro plan (resolved server-side from the
     * local subscription record).
     */
    requirePro: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

export type AuthPluginOptions = {
  repository: AuthRepository;
  sessionSecret: string;
  isProduction: boolean;
  mailer: Mailer;
  appUrl: string;
};

const authPluginImpl: FastifyPluginAsync<AuthPluginOptions> = async (
  app,
  { repository, sessionSecret, isProduction, mailer, appUrl },
) => {
  const authService = createAuthService(repository, { mailer, appUrl });

  await app.register(fastifyCookie, { secret: sessionSecret });

  app.decorate("authService", authService);
  app.decorateRequest("user", null);

  function readSessionToken(request: FastifyRequest): string | null {
    const raw = request.cookies[SESSION_COOKIE];
    if (!raw) return null;

    const unsigned = request.unsignCookie(raw);
    return unsigned.valid && unsigned.value ? unsigned.value : null;
  }

  function setSessionCookie(
    reply: FastifyReply,
    token: string,
    expiresAt: Date,
  ): void {
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      signed: true,
    });
  }

  function clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
  }

  // Populate request.user for every request. Anonymous requests (no cookie)
  // return immediately without touching the database.
  app.addHook("onRequest", async (request) => {
    request.user = await authService.resolveSession(readSessionToken(request));
  });

  app.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        await reply.status(401).send({ error: "Authentication required." });
      }
    },
  );

  app.decorate(
    "requirePro",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        await reply.status(401).send({ error: "Authentication required." });
        return;
      }
      // `getUserPlan` is decorated by the billing plugin (registered after
      // this one); with no billing wired, everyone is Free.
      const plan = app.getUserPlan
        ? await app.getUserPlan(request.user.id)
        : "free";
      if (plan !== "pro") {
        await reply.status(403).send({
          error: "This feature is available on the Pro plan.",
          code: "PRO_REQUIRED",
        });
      }
    },
  );

  // The user's plan + subscription view come from local subscription state
  // (never the client). `getBillingState` is decorated by the billing plugin;
  // if billing is not wired the answer is always Free with no subscription.
  const billingStateFor = (userId: string): Promise<BillingState> =>
    app.getBillingState
      ? app.getBillingState(userId)
      : Promise.resolve({ plan: "free", subscription: null });

  app.post(
    "/api/auth/signup",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;

      try {
        const { user, session } = await authService.signup(
          body.email,
          body.password,
        );
        setSessionCookie(reply, session.token, session.expiresAt);
        return reply.status(201).send({ user, ...(await billingStateFor(user.id)) });
      } catch (error) {
        return sendAuthError(error, reply, request);
      }
    },
  );

  app.post(
    "/api/auth/login",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;

      try {
        const { user, session } = await authService.login(
          body.email,
          body.password,
        );
        setSessionCookie(reply, session.token, session.expiresAt);
        return reply.send({ user, ...(await billingStateFor(user.id)) });
      } catch (error) {
        return sendAuthError(error, reply, request);
      }
    },
  );

  app.post("/api/auth/logout", async (request, reply) => {
    await authService.logout(readSessionToken(request));
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.post(
    "/api/auth/forgot-password",
    { config: { rateLimit: FORGOT_PASSWORD_RATE_LIMIT } },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;

      try {
        await authService.requestPasswordReset(body.email);
      } catch (error) {
        // Never leak failures here — always return the generic response.
        request.log.error(error, "requestPasswordReset failed");
      }

      return reply.send(PASSWORD_RESET_RESPONSE);
    },
  );

  app.post(
    "/api/auth/reset-password",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;

      try {
        await authService.resetPassword(body.token, body.password);
        return reply.send({ ok: true });
      } catch (error) {
        return sendAuthError(error, reply, request);
      }
    },
  );

  app.get(
    "/api/auth/me",
    { preHandler: app.requireAuth },
    async (request) => {
      return {
        user: request.user,
        ...(await billingStateFor(request.user!.id)),
      };
    },
  );
};

function sendAuthError(
  error: unknown,
  reply: FastifyReply,
  request: FastifyRequest,
): FastifyReply {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  request.log.error(error);
  return reply
    .status(500)
    .send({ error: "Something went wrong. Please try again." });
}

/**
 * Registered with `fastify-plugin` so `request.user`, `requireAuth` and the
 * auth routes are available on the whole app (not just an encapsulated scope).
 */
export const authPlugin = fp(authPluginImpl, { name: "auth" });
