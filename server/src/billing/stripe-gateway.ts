import type Stripe from "stripe";

/** Raised by `constructWebhookEvent` when the Stripe signature is invalid. */
export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

/** A Stripe subscription normalized to just what the app stores. */
export type GatewaySubscription = {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** From `subscription.metadata.user_id`, when present. */
  userId: string | null;
};

export type GatewayWebhookEvent = {
  id: string;
  type: string;
  object: Record<string, unknown>;
};

/**
 * Thin boundary around the Stripe SDK. Everything the billing service needs
 * from Stripe goes through here, which keeps the SDK out of route handlers and
 * lets tests substitute a fake.
 */
export interface StripeGateway {
  createCustomer(input: {
    email: string;
    userId: string;
  }): Promise<string>;

  createCheckoutSession(input: {
    customerId: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  retrieveSubscription(subscriptionId: string): Promise<GatewaySubscription>;

  /** Normalizes a subscription object taken from a webhook event payload. */
  parseSubscription(object: Record<string, unknown>): GatewaySubscription;

  /** Verifies the signature and returns the event, or throws WebhookSignatureError. */
  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
  ): GatewayWebhookEvent;
}

export type StripeGatewayConfig = {
  webhookSecret: string;
  priceId: string;
};

export function createStripeGateway(
  stripe: Stripe,
  config: StripeGatewayConfig,
): StripeGateway {
  return {
    async createCustomer({ email, userId }) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id: userId },
      });
      return customer.id;
    },

    async createCheckoutSession({ customerId, userId, successUrl, cancelUrl }) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: config.priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { user_id: userId },
        subscription_data: { metadata: { user_id: userId } },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL.");
      }
      return { url: session.url };
    },

    async createPortalSession({ customerId, returnUrl }) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return { url: session.url };
    },

    async retrieveSubscription(subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return parseSubscription(
        subscription as unknown as Record<string, unknown>,
      );
    },

    parseSubscription,

    constructWebhookEvent(rawBody, signature) {
      try {
        const event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          config.webhookSecret,
        );
        return {
          id: event.id,
          type: event.type,
          object: event.data.object as unknown as Record<string, unknown>,
        };
      } catch (error) {
        throw new WebhookSignatureError(
          error instanceof Error ? error.message : "Invalid Stripe signature.",
        );
      }
    },
  };
}

function parseSubscription(
  raw: Record<string, unknown>,
): GatewaySubscription {
  return {
    id: String(raw.id ?? ""),
    customerId: extractCustomerId(raw.customer),
    status: String(raw.status ?? ""),
    currentPeriodEnd: extractPeriodEnd(raw),
    cancelAtPeriodEnd: raw.cancel_at_period_end === true,
    userId: extractUserId(raw.metadata),
  };
}

function extractCustomerId(customer: unknown): string {
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object" && "id" in customer) {
    return String((customer as { id: unknown }).id);
  }
  return "";
}

function extractUserId(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "user_id" in metadata) {
    const value = (metadata as { user_id: unknown }).user_id;
    return typeof value === "string" && value ? value : null;
  }
  return null;
}

/**
 * `current_period_end` lives on the subscription in older API versions and on
 * the subscription item in newer ones — check both.
 */
function extractPeriodEnd(raw: Record<string, unknown>): Date | null {
  if (typeof raw.current_period_end === "number") {
    return new Date(raw.current_period_end * 1000);
  }

  const items = (
    raw.items as { data?: Array<{ current_period_end?: unknown }> } | undefined
  )?.data;
  const fromItem = items?.[0]?.current_period_end;
  if (typeof fromItem === "number") {
    return new Date(fromItem * 1000);
  }

  return null;
}

/** Extracts the subscription id from an invoice event payload. */
export function invoiceSubscriptionId(
  invoice: Record<string, unknown>,
): string | null {
  if (typeof invoice.subscription === "string") return invoice.subscription;

  const parent = invoice.parent as
    | { subscription_details?: { subscription?: unknown } }
    | undefined;
  if (typeof parent?.subscription_details?.subscription === "string") {
    return parent.subscription_details.subscription;
  }

  const lines = (
    invoice.lines as { data?: Array<{ subscription?: unknown }> } | undefined
  )?.data;
  const fromLine = lines?.find(
    (line) => typeof line.subscription === "string",
  )?.subscription;

  return typeof fromLine === "string" ? fromLine : null;
}
