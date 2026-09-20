export type Plan = "free" | "pro";

export const PLAN_ANALYSIS_LIMIT: Record<Plan, number> = {
  free: 5,
  pro: 50,
};

export const PLAN_PROJECT_LIMIT: Record<Plan, number> = {
  free: 1,
  pro: 10,
};

/**
 * Safe view of the user's Stripe subscription, from `/api/auth/me`. No Stripe
 * identifiers — just enough to show "cancels on …" / "payment failed" in the
 * account UI. `null` when the user has never subscribed.
 */
export type PublicSubscription = {
  status: string;
  cancelAtPeriodEnd: boolean;
  /** ISO timestamp, or null. */
  currentPeriodEnd: string | null;
};
