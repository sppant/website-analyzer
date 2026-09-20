import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import type { BillingRepository } from "./billing-repository.js";
import {
  BillingError,
  type BillingService,
} from "./billing-service.js";
import { resolvePlan, type BillingState, type Plan } from "./plan.js";
import { WebhookSignatureError } from "./stripe-gateway.js";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * The user's effective plan, from local subscription state. Present
     * whenever a billing repository is wired (i.e. whenever there is a DB).
     */
    getUserPlan?: (userId: string) => Promise<Plan>;
    /**
     * Plan + a safe view of the subscription (status, cancel-at-period-end,
     * period end) for the account UI. Same wiring as `getUserPlan`.
     */
    getBillingState?: (userId: string) => Promise<BillingState>;
    /** Present only when Stripe is configured. */
    billingService?: BillingService;
  }
}

export type BillingPluginOptions = {
  repository: BillingRepository;
  /** Omitted when Stripe env vars are not configured — routes are then skipped. */
  billingService?: BillingService;
};

const billingPluginImpl: FastifyPluginAsync<BillingPluginOptions> = async (
  app,
  { repository, billingService },
) => {
  // Plan resolution always works from the local database.
  app.decorate("getUserPlan", async (userId: string): Promise<Plan> => {
    return resolvePlan(await repository.getSubscription(userId));
  });

  app.decorate(
    "getBillingState",
    async (userId: string): Promise<BillingState> => {
      const sub = await repository.getSubscription(userId);
      return {
        plan: resolvePlan(sub),
        subscription: sub
          ? {
              status: sub.status,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            }
          : null,
      };
    },
  );

  if (!billingService) {
    app.log.warn(
      "Stripe is not configured; billing endpoints are disabled (all users are Free).",
    );
    return;
  }

  app.decorate("billingService", billingService);

  app.post(
    "/api/billing/checkout",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      try {
        const result = await billingService.createCheckout(request.user!);

        if ("alreadyPro" in result) {
          return reply.status(409).send({
            error: "You already have an active Pro subscription.",
            code: "ALREADY_PRO",
          });
        }

        return { url: result.url };
      } catch (error) {
        return sendBillingError(
          error,
          reply,
          request,
          "Unable to start checkout. Please try again.",
        );
      }
    },
  );

  app.post(
    "/api/billing/portal",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      try {
        return await billingService.createPortal(request.user!);
      } catch (error) {
        return sendBillingError(
          error,
          reply,
          request,
          "Unable to open the billing portal. Please try again.",
        );
      }
    },
  );

  // The webhook needs the raw request body for signature verification, so it
  // lives in an encapsulated scope with a buffer content-type parser. Other
  // billing routes keep normal JSON parsing.
  await app.register(async (webhookScope) => {
    webhookScope.removeContentTypeParser("application/json");
    webhookScope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      },
    );

    webhookScope.post(
      "/api/billing/webhook",
      async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        if (typeof signature !== "string") {
          return reply
            .status(400)
            .send({ error: "Missing Stripe signature." });
        }

        try {
          await billingService.handleWebhook(
            request.body as Buffer,
            signature,
          );
          return { received: true };
        } catch (error) {
          if (error instanceof WebhookSignatureError) {
            request.log.warn(
              "Rejected a Stripe webhook with an invalid signature",
            );
            return reply.status(400).send({ error: "Invalid signature." });
          }

          // Processing failed — return non-2xx so Stripe retries.
          request.log.error(error, "Stripe webhook processing failed");
          return reply
            .status(500)
            .send({ error: "Webhook processing failed." });
        }
      },
    );
  });
};

function sendBillingError(
  error: unknown,
  reply: FastifyReply,
  request: FastifyRequest,
  fallbackMessage: string,
): FastifyReply {
  if (error instanceof BillingError) {
    return reply
      .status(error.statusCode)
      .send({ error: error.message, code: error.code });
  }

  request.log.error(error, "Billing request failed");
  return reply.status(502).send({ error: fallbackMessage });
}

export const billingPlugin = fp(billingPluginImpl, {
  name: "billing",
  dependencies: ["auth"],
});
