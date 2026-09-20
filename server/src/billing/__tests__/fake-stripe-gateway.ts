import { vi } from "vitest";

import {
  WebhookSignatureError,
  type GatewaySubscription,
  type GatewayWebhookEvent,
  type StripeGateway,
} from "../stripe-gateway.js";

/**
 * Records calls and returns canned data. `constructWebhookEvent` accepts the
 * magic signature `"valid"` (so route-level tests can exercise the happy path)
 * and rejects anything else — real signature verification is covered
 * separately with the actual Stripe SDK.
 */
export function createFakeStripeGateway(overrides?: {
  subscriptions?: Record<string, GatewaySubscription>;
}) {
  const state = {
    nextCustomerId: 1,
    subscriptions: overrides?.subscriptions ?? {},
  };

  const createCustomer = vi.fn(async (_input: { email: string; userId: string }) => {
    return `cus_fake_${state.nextCustomerId++}`;
  });

  const createCheckoutSession = vi.fn(
    async (input: {
      customerId: string;
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }) => ({ url: `https://checkout.stripe.test/session/${input.userId}` }),
  );

  const createPortalSession = vi.fn(
    async (input: { customerId: string; returnUrl: string }) => ({
      url: `https://billing.stripe.test/portal/${input.customerId}`,
    }),
  );

  const retrieveSubscription = vi.fn(async (id: string) => {
    const sub = state.subscriptions[id];
    if (!sub) throw new Error(`fake gateway: unknown subscription ${id}`);
    return sub;
  });

  const parseSubscription = vi.fn(
    (raw: Record<string, unknown>): GatewaySubscription => ({
      id: String(raw.id ?? ""),
      customerId:
        typeof raw.customer === "string" ? raw.customer : "",
      status: String(raw.status ?? ""),
      currentPeriodEnd:
        typeof raw.current_period_end === "number"
          ? new Date(raw.current_period_end * 1000)
          : null,
      cancelAtPeriodEnd: raw.cancel_at_period_end === true,
      userId:
        raw.metadata && typeof raw.metadata === "object" && "user_id" in raw.metadata
          ? String((raw.metadata as { user_id: unknown }).user_id)
          : null,
    }),
  );

  const constructWebhookEvent = vi.fn(
    (rawBody: Buffer | string, signature: string): GatewayWebhookEvent => {
      if (signature !== "valid") {
        throw new WebhookSignatureError("fake gateway: bad signature");
      }
      const parsed = JSON.parse(rawBody.toString()) as {
        id: string;
        type: string;
        data: { object: Record<string, unknown> };
      };
      return {
        id: parsed.id,
        type: parsed.type,
        object: parsed.data.object,
      };
    },
  );

  const gateway: StripeGateway = {
    createCustomer,
    createCheckoutSession,
    createPortalSession,
    retrieveSubscription,
    parseSubscription,
    constructWebhookEvent,
  };

  return {
    gateway,
    calls: {
      createCustomer,
      createCheckoutSession,
      createPortalSession,
      retrieveSubscription,
      constructWebhookEvent,
    },
    setSubscription(sub: GatewaySubscription) {
      state.subscriptions[sub.id] = sub;
    },
  };
}
