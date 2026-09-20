import type { BillingRepository } from "./billing-repository.js";
import { PRO_STATUSES, resolvePlan, type Plan } from "./plan.js";
import {
  invoiceSubscriptionId,
  type GatewaySubscription,
  type GatewayWebhookEvent,
  type StripeGateway,
} from "./stripe-gateway.js";

/** An expected, client-facing billing failure. */
export class BillingError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "BillingError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

type BillingUser = { id: string; email: string };

export type CheckoutResult = { url: string } | { alreadyPro: true };

export type BillingService = ReturnType<typeof createBillingService>;

export function createBillingService(deps: {
  gateway: StripeGateway;
  repository: BillingRepository;
  appUrl: string;
}) {
  const { gateway, repository, appUrl } = deps;

  async function getPlan(userId: string): Promise<Plan> {
    return resolvePlan(await repository.getSubscription(userId));
  }

  /** Returns the user's Stripe customer id, creating the customer if needed. */
  async function ensureCustomer(user: BillingUser): Promise<string> {
    const existing = await repository.getStripeCustomerId(user.id);
    if (existing) return existing;

    const customerId = await gateway.createCustomer({
      email: user.email,
      userId: user.id,
    });
    await repository.linkStripeCustomer(user.id, customerId);

    // Re-read in case a concurrent request linked a different customer first;
    // the extra Stripe customer is harmless (Stripe does not bill for it).
    return (await repository.getStripeCustomerId(user.id)) ?? customerId;
  }

  async function syncSubscription(
    userId: string,
    subscription: GatewaySubscription,
  ): Promise<void> {
    const existing = await repository.getSubscription(userId);

    // Stripe events are not strictly ordered. If the user already has a
    // different, currently-entitled subscription, a late non-entitling event
    // for a superseded subscription must not revoke Pro access.
    if (
      existing &&
      existing.stripeSubscriptionId !== subscription.id &&
      resolvePlan(existing) === "pro" &&
      !PRO_STATUSES.has(subscription.status)
    ) {
      return;
    }

    await repository.upsertSubscription({
      userId,
      stripeSubscriptionId: subscription.id,
      plan: "pro",
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  }

  async function resolveUserId(
    subscription: GatewaySubscription,
  ): Promise<string | null> {
    return (
      subscription.userId ??
      (await repository.findUserIdByStripeCustomerId(subscription.customerId))
    );
  }

  async function processEvent(event: GatewayWebhookEvent): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.object;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const userId =
          readUserId(session.metadata) ??
          (customerId
            ? await repository.findUserIdByStripeCustomerId(customerId)
            : null);

        if (!userId) return;
        if (customerId) {
          await repository.linkStripeCustomer(userId, customerId);
        }

        if (typeof session.subscription === "string") {
          const subscription = await gateway.retrieveSubscription(
            session.subscription,
          );
          await syncSubscription(userId, subscription);
        }
        return;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = gateway.parseSubscription(event.object);
        const userId = await resolveUserId(subscription);
        if (userId) await syncSubscription(userId, subscription);
        return;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const subscriptionId = invoiceSubscriptionId(event.object);
        if (!subscriptionId) return;

        const subscription =
          await gateway.retrieveSubscription(subscriptionId);
        const userId = await resolveUserId(subscription);
        if (userId) await syncSubscription(userId, subscription);
        return;
      }

      default:
        // Unknown / unhandled event types are safely ignored.
        return;
    }
  }

  return {
    getPlan,

    async createCheckout(user: BillingUser): Promise<CheckoutResult> {
      if ((await getPlan(user.id)) === "pro") {
        return { alreadyPro: true };
      }

      const customerId = await ensureCustomer(user);

      return gateway.createCheckoutSession({
        customerId,
        userId: user.id,
        successUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl: `${appUrl}/pricing?checkout=cancelled`,
      });
    },

    async createPortal(user: { id: string }): Promise<{ url: string }> {
      const customerId = await repository.getStripeCustomerId(user.id);
      if (!customerId) {
        throw new BillingError(
          "No billing account is set up for this user.",
          400,
          "NO_BILLING_ACCOUNT",
        );
      }

      return gateway.createPortalSession({
        customerId,
        returnUrl: `${appUrl}/dashboard`,
      });
    },

    /**
     * Verifies the signature, then keeps local subscription state in sync with
     * Stripe. Idempotent: an event that was already processed is a no-op. A
     * processing failure throws (the route returns non-2xx so Stripe retries).
     */
    async handleWebhook(
      rawBody: Buffer | string,
      signature: string,
    ): Promise<void> {
      const event = gateway.constructWebhookEvent(rawBody, signature);

      if (await repository.hasProcessedEvent(event.id)) return;

      await processEvent(event);

      await repository.recordProcessedEvent(event.id);
    },
  };
}

function readUserId(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "user_id" in metadata) {
    const value = (metadata as { user_id: unknown }).user_id;
    return typeof value === "string" && value ? value : null;
  }
  return null;
}
