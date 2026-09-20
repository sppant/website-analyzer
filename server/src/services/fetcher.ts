import { Agent } from "undici";

import { isSafeUrl, ssrfSafeLookup } from "../utils/safeUrl.js";

const USER_AGENT = "WebsiteSEOOpportunityAnalyzer/1.0";

/**
 * Every outbound request in the app goes through this dispatcher. Its custom
 * `lookup` resolves the hostname once, validates every resolved address, and
 * connects the socket to that exact validated IP — so the address that was
 * checked is the address that is dialed (no DNS-rebinding / TOCTOU window).
 * The original hostname is still used for the HTTP `Host` header and TLS SNI.
 */
const ssrfSafeDispatcher = new Agent({
  connect: {
    lookup: ssrfSafeLookup,
    timeout: 10_000,
  },
  // Bound slow servers at the transport layer too. `readResponseWithLimit`
  // applies an overall wall-clock budget on top of this per-chunk timeout.
  headersTimeout: 15_000,
  bodyTimeout: 30_000,
});

export async function fetchWithTimeout(
  url: string,
  timeout = 10000,
  maxRedirects = 5,
): Promise<Response | null> {
  let currentUrl = url;

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount++
  ) {
    // Fast, best-effort pre-check (protocol, credentials, obvious bad hosts).
    // The authoritative TOCTOU-safe check happens in the dispatcher's lookup.
    if (!(await isSafeUrl(currentUrl))) {
      return null;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
        redirect: "manual",
        dispatcher: ssrfSafeDispatcher,
      } as RequestInit & { dispatcher: Agent });

      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = response.headers.get("location");

      if (!location) {
        return response;
      }

      // Discard the redirect body so the pooled socket is freed promptly.
      if (response.body) {
        await response.body.cancel().catch(() => {});
      }

      currentUrl = new URL(location, currentUrl).href;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
