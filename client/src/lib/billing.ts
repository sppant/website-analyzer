import { ApiError, apiFetch } from "./api";

/**
 * Starts Stripe Checkout for the Pro plan by asking the server for a Checkout
 * URL and navigating to it. All Stripe details (price, customer) are decided
 * server-side — nothing sensitive touches the browser.
 *
 * Resolves `"already-pro"` if the server reports an existing subscription.
 */
export async function startProCheckout(): Promise<"redirecting" | "already-pro"> {
  try {
    const { url } = await apiFetch<{ url: string }>("/api/billing/checkout", {
      method: "POST",
    });
    window.location.assign(url);
    return "redirecting";
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return "already-pro";
    }
    throw error;
  }
}

/** Opens the Stripe Customer Portal for managing an existing subscription. */
export async function openBillingPortal(): Promise<void> {
  const { url } = await apiFetch<{ url: string }>("/api/billing/portal", {
    method: "POST",
  });
  window.location.assign(url);
}
