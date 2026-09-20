import { createHash, randomBytes } from "node:crypto";

import type { Mailer } from "../services/mailer.js";
import {
  DuplicateEmailError,
  type AuthRepository,
} from "./auth-repository.js";
import { hashPassword, verifyPassword } from "./password.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicUser = {
  id: string;
  email: string;
};

export type IssuedSession = {
  token: string;
  expiresAt: Date;
};

export type AuthResult = {
  user: PublicUser;
  session: IssuedSession;
};

/**
 * An expected, client-facing authentication failure. The HTTP layer maps
 * `statusCode` onto the response; the message is safe to show to users.
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** SHA-256 (hex) of an opaque token, used as its database key. */
export function hashSessionToken(token: string): string {
  return sha256Hex(token);
}

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

const INVALID_RESET_TOKEN_MESSAGE =
  "This password reset link is invalid or has expired.";

export const PASSWORD_RESET_RESPONSE = { message: GENERIC_RESET_MESSAGE };

export type AuthServiceDeps = {
  mailer: Mailer;
  /** Base URL used to build the reset link, e.g. https://seo.webxdevelop.com */
  appUrl: string;
};

function toPublicUser(user: { id: string; email: string }): PublicUser {
  return { id: user.id, email: user.email };
}

function assertValidEmail(rawEmail: unknown): string {
  if (typeof rawEmail !== "string") {
    throw new AuthError("Email and password are required.", 400);
  }

  const email = normalizeEmail(rawEmail);

  if (
    email.length === 0 ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    throw new AuthError("Enter a valid email address.", 400);
  }

  return email;
}

function assertValidPassword(rawPassword: unknown): string {
  if (typeof rawPassword !== "string") {
    throw new AuthError("Email and password are required.", 400);
  }

  if (rawPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      400,
    );
  }

  if (rawPassword.length > MAX_PASSWORD_LENGTH) {
    throw new AuthError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      400,
    );
  }

  return rawPassword;
}

function buildResetUrl(appUrl: string, token: string): string {
  const url = new URL("/reset-password", appUrl);
  url.searchParams.set("token", token);
  return url.href;
}

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(
  repository: AuthRepository,
  deps: AuthServiceDeps,
) {
  // A real Argon2 hash used to equalize the work done on the "unknown email"
  // login path, so response timing does not leak whether an account exists.
  let decoyHash: Promise<string> | null = null;
  const getDecoyHash = () => {
    decoyHash ??= hashPassword(randomBytes(16).toString("hex"));
    return decoyHash;
  };

  async function issueSession(userId: string): Promise<IssuedSession> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await repository.createSession({
      id: hashSessionToken(token),
      userId,
      expiresAt,
    });

    return { token, expiresAt };
  }

  return {
    async signup(rawEmail: unknown, rawPassword: unknown): Promise<AuthResult> {
      const email = assertValidEmail(rawEmail);
      const password = assertValidPassword(rawPassword);

      if (await repository.findUserByEmail(email)) {
        throw new AuthError("An account with this email already exists.", 409);
      }

      const passwordHash = await hashPassword(password);

      let user;
      try {
        user = await repository.createUser({ email, passwordHash });
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          throw new AuthError(
            "An account with this email already exists.",
            409,
          );
        }
        throw error;
      }

      return { user: toPublicUser(user), session: await issueSession(user.id) };
    },

    async login(rawEmail: unknown, rawPassword: unknown): Promise<AuthResult> {
      if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
        throw new AuthError("Email and password are required.", 400);
      }

      const email = normalizeEmail(rawEmail);
      const user = await repository.findUserByEmail(email);

      if (!user) {
        // Do the same amount of work as a real verification.
        await verifyPassword(await getDecoyHash(), rawPassword);
        throw new AuthError("Invalid email or password.", 401);
      }

      if (!(await verifyPassword(user.passwordHash, rawPassword))) {
        throw new AuthError("Invalid email or password.", 401);
      }

      return { user: toPublicUser(user), session: await issueSession(user.id) };
    },

    async logout(token: string | null): Promise<void> {
      if (!token) return;
      await repository.deleteSession(hashSessionToken(token));
    },

    /**
     * Starts a password reset. Always resolves without revealing whether the
     * email is registered — the route returns a fixed generic message. If the
     * account exists, any outstanding tokens are replaced with a fresh
     * single-use token and a reset link is sent via the mailer.
     */
    async requestPasswordReset(rawEmail: unknown): Promise<void> {
      if (typeof rawEmail !== "string") return;

      const email = normalizeEmail(rawEmail);
      if (!email || !EMAIL_PATTERN.test(email)) return;

      // Opportunistic cleanup — no background job.
      await repository.deleteExpiredPasswordResetTokens(new Date());

      const user = await repository.findUserByEmail(email);
      if (!user) return;

      await repository.deletePasswordResetTokensForUser(user.id);

      const token = randomBytes(32).toString("base64url");
      await repository.createPasswordResetToken({
        userId: user.id,
        tokenHash: sha256Hex(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      await deps.mailer.sendPasswordResetEmail({
        to: user.email,
        resetUrl: buildResetUrl(deps.appUrl, token),
      });
    },

    /**
     * Completes a password reset: validates the token, sets the new password,
     * spends the token, and signs the user out of all existing sessions.
     */
    async resetPassword(
      rawToken: unknown,
      rawNewPassword: unknown,
    ): Promise<void> {
      if (typeof rawToken !== "string" || !rawToken) {
        throw new AuthError(INVALID_RESET_TOKEN_MESSAGE, 400);
      }

      const record = await repository.findPasswordResetTokenByHash(
        sha256Hex(rawToken),
      );

      if (
        !record ||
        record.usedAt !== null ||
        record.expiresAt.getTime() <= Date.now()
      ) {
        throw new AuthError(INVALID_RESET_TOKEN_MESSAGE, 400);
      }

      const password = assertValidPassword(rawNewPassword);
      const passwordHash = await hashPassword(password);

      // Spend the token first; if another request already did, reject.
      const consumed = await repository.consumePasswordResetToken(
        record.id,
        new Date(),
      );
      if (!consumed) {
        throw new AuthError(INVALID_RESET_TOKEN_MESSAGE, 400);
      }

      await repository.updateUserPassword({
        userId: record.userId,
        passwordHash,
      });
      await repository.deletePasswordResetTokensForUser(record.userId);
      await repository.deleteSessionsForUser(record.userId);
    },

    /**
     * Resolves the session cookie token to the authenticated user, or `null`.
     * Expired sessions are treated as unauthenticated and cleaned up.
     */
    async resolveSession(token: string | null): Promise<PublicUser | null> {
      if (!token) return null;

      const found = await repository.findSessionWithUser(
        hashSessionToken(token),
      );
      if (!found) return null;

      if (found.session.expiresAt.getTime() <= Date.now()) {
        await repository.deleteSession(found.session.id);
        return null;
      }

      return toPublicUser(found.user);
    },
  };
}
