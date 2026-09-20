import { eq, sql } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  processedStripeEvents,
  stripeCustomers,
  subscriptions,
} from "../db/schema.js";
import type { Plan } from "./plan.js";

export type StoredSubscription = {
  userId: string;
  stripeSubscriptionId: string;
  plan: Plan;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

/**
 * Local persistence for billing state. Everything here is authoritative for
 * the application — Stripe is only consulted through the webhook and the
 * checkout/portal flows.
 */
export interface BillingRepository {
  getStripeCustomerId(userId: string): Promise<string | null>;
  /** Links a user to a Stripe customer; a no-op if the user is already linked. */
  linkStripeCustomer(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void>;
  findUserIdByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<string | null>;

  getSubscription(userId: string): Promise<StoredSubscription | null>;
  upsertSubscription(subscription: StoredSubscription): Promise<void>;

  hasProcessedEvent(eventId: string): Promise<boolean>;
  recordProcessedEvent(eventId: string): Promise<void>;
}

export function createDrizzleBillingRepository(
  db: Database,
): BillingRepository {
  return {
    async getStripeCustomerId(userId) {
      const [row] = await db
        .select({ id: stripeCustomers.stripeCustomerId })
        .from(stripeCustomers)
        .where(eq(stripeCustomers.userId, userId))
        .limit(1);

      return row?.id ?? null;
    },

    async linkStripeCustomer(userId, stripeCustomerId) {
      await db
        .insert(stripeCustomers)
        .values({ userId, stripeCustomerId })
        .onConflictDoNothing({ target: stripeCustomers.userId });
    },

    async findUserIdByStripeCustomerId(stripeCustomerId) {
      const [row] = await db
        .select({ userId: stripeCustomers.userId })
        .from(stripeCustomers)
        .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
        .limit(1);

      return row?.userId ?? null;
    },

    async getSubscription(userId) {
      const [row] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!row) return null;

      return {
        userId: row.userId,
        stripeSubscriptionId: row.stripeSubscriptionId,
        plan: row.plan as Plan,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      };
    },

    async upsertSubscription(subscription) {
      await db
        .insert(subscriptions)
        .values({
          userId: subscription.userId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            updatedAt: sql`now()`,
          },
        });
    },

    async hasProcessedEvent(eventId) {
      const [row] = await db
        .select({ eventId: processedStripeEvents.eventId })
        .from(processedStripeEvents)
        .where(eq(processedStripeEvents.eventId, eventId))
        .limit(1);

      return row !== undefined;
    },

    async recordProcessedEvent(eventId) {
      await db
        .insert(processedStripeEvents)
        .values({ eventId })
        .onConflictDoNothing({ target: processedStripeEvents.eventId });
    },
  };
}
