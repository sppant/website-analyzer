/**
 * Plans and the single billing policy that decides Pro access.
 *
 * There are exactly two plans and one subscription product. This file is the
 * one place that knows the plan → limit mapping and which subscription
 * statuses count as Pro.
 */
export type Plan = "free" | "pro";

/** Analyses allowed per calendar month, per plan. */
export const ANALYSIS_LIMITS: Record<Plan, number> = {
  free: 5,
  pro: 50,
};

export function analysisLimitForPlan(plan: Plan): number {
  return ANALYSIS_LIMITS[plan];
}

/** Projects a user may own, per plan. */
export const PROJECT_LIMITS: Record<Plan, number> = {
  free: 1,
  pro: 10,
};

export function projectLimitForPlan(plan: Plan): number {
  return PROJECT_LIMITS[plan];
}

/**
 * Pro website tools (crawler / competitor comparison) draw down the same
 * monthly allowance as single-page analyses. A full crawl is a much heavier
 * operation, so it costs more "units". The server always decides the cost —
 * never the client.
 */
export const CRAWL_COST_UNITS = 5;
export const COMPARISON_COST_UNITS = 2;

/** Hard cap on pages fetched per crawl, enforced server-side. */
export const MAX_CRAWL_PAGES = 100;
/** Concurrent page fetches during a crawl. */
export const CRAWL_CONCURRENCY = 3;
/**
 * Wall-clock budget for the page-fetching phase of a crawl. Once spent, no new
 * pages are dequeued; whatever was analysed so far is returned. Generous —
 * a normal 100-page crawl finishes well inside this — but bounds a crawl
 * pointed at deliberately slow hosts. The broken-link phase has its own budget
 * (`LINK_CHECK_BUDGET_MS`).
 */
export const CRAWL_BUDGET_MS = 90_000;
/** Concurrent HEAD/GET checks during broken-link detection. */
export const LINK_CHECK_CONCURRENCY = 8;
/** Upper bound on distinct link destinations verified per crawl. */
export const MAX_LINKS_CHECKED = 300;
/** Wall-clock budget for the whole broken-link phase (ms). */
export const LINK_CHECK_BUDGET_MS = 40_000;

/**
 * Saved analysis history, score tracking and comparisons are Pro-only. Free
 * accounts can still run analyses and keep one project — the individual past
 * analyses just aren't browsable until they upgrade.
 */
export function planAllowsHistory(plan: Plan): boolean {
  return plan === "pro";
}

/**
 * Subscription statuses that grant Pro access.
 *
 * `past_due` is included on purpose: when a renewal payment fails Stripe
 * retries for ~2 weeks. We keep the user on Pro during that grace window; once
 * the retries are exhausted Stripe moves the subscription to `canceled` /
 * `unpaid` and the next webhook drops the user back to Free.
 */
export const PRO_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
  "past_due",
]);

/** The minimal local subscription shape the plan decision needs. */
export type LocalSubscription = {
  plan: string;
  status: string;
};

/**
 * Subscription fields that are safe to return to the authenticated user (no
 * Stripe identifiers). Lets the frontend show "cancels on …" / "payment failed"
 * without ever talking to Stripe.
 */
export type PublicSubscription = {
  status: string;
  cancelAtPeriodEnd: boolean;
  /** ISO timestamp of the current period end, or null. */
  currentPeriodEnd: string | null;
};

/** What `/api/auth/me` (and login / signup) report about billing. */
export type BillingState = {
  plan: Plan;
  subscription: PublicSubscription | null;
};

/**
 * The user's effective plan, derived entirely from locally stored subscription
 * state (never from Stripe on the request path, never from the client).
 */
export function resolvePlan(subscription: LocalSubscription | null): Plan {
  if (
    subscription &&
    subscription.plan === "pro" &&
    PRO_STATUSES.has(subscription.status)
  ) {
    return "pro";
  }
  return "free";
}
