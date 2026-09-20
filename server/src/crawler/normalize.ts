/**
 * URL normalization for crawl deduplication.
 *
 * Two URLs are the "same page" for crawl purposes when they differ only by:
 *   - a fragment (`#section`)          → always dropped
 *   - a trailing slash                 → dropped, except on the root path
 *   - host casing / a leading `www.`   → lower-cased, `www.` stripped
 *   - query parameter ORDER            → params are sorted
 *
 * Query parameters are otherwise KEPT — `/products?id=1` and `/products?id=2`
 * are genuinely different pages and must stay separate.
 */

/** Host with casing lowered and a single leading `www.` removed. */
export function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** True when both URLs are on the same site (ignoring `www.` and case). */
export function sameSite(a: URL, b: URL): boolean {
  return canonicalHost(a.hostname) === canonicalHost(b.hostname);
}

/**
 * Returns a stable canonical form of a URL, or `null` if it is not an
 * http(s) URL we can parse. Never throws.
 */
export function normalizeUrl(input: string, base?: string): string | null {
  let url: URL;
  try {
    url = base ? new URL(input, base) : new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  url.hash = "";
  // Lower-case the host and drop a single leading `www.` — the crawler already
  // treats `www.` and the bare host as one site, so this keeps dedup consistent.
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  // Drop a trailing slash on non-root paths.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  // Sort query params so order doesn't create duplicates.
  if (url.search) {
    url.searchParams.sort();
    url.search = url.searchParams.toString()
      ? `?${url.searchParams.toString()}`
      : "";
  }

  // Drop a default port.
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  return url.href;
}
