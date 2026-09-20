import type {
  BillingRepository,
  StoredSubscription,
} from "../billing-repository.js";

export function createInMemoryBillingRepository(): BillingRepository {
  const customerIdByUser = new Map<string, string>();
  const userByCustomerId = new Map<string, string>();
  const subscriptionByUser = new Map<string, StoredSubscription>();
  const processedEvents = new Set<string>();

  return {
    async getStripeCustomerId(userId) {
      return customerIdByUser.get(userId) ?? null;
    },

    async linkStripeCustomer(userId, stripeCustomerId) {
      if (customerIdByUser.has(userId)) return; // no-op if already linked
      customerIdByUser.set(userId, stripeCustomerId);
      userByCustomerId.set(stripeCustomerId, userId);
    },

    async findUserIdByStripeCustomerId(stripeCustomerId) {
      return userByCustomerId.get(stripeCustomerId) ?? null;
    },

    async getSubscription(userId) {
      return subscriptionByUser.get(userId) ?? null;
    },

    async upsertSubscription(subscription) {
      subscriptionByUser.set(subscription.userId, { ...subscription });
    },

    async hasProcessedEvent(eventId) {
      return processedEvents.has(eventId);
    },

    async recordProcessedEvent(eventId) {
      processedEvents.add(eventId);
    },
  };
}
