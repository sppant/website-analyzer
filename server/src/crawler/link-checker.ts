import {
  LINK_CHECK_BUDGET_MS,
  LINK_CHECK_CONCURRENCY,
  MAX_LINKS_CHECKED,
} from "../billing/plan.js";

/** Upper bound on individual broken-link rows kept in the report. */
const MAX_BROKEN_LINK_ROWS = 200;
import { fetchWithTimeout } from "../services/fetcher.js";
import { pooledForEach } from "./pool.js";
import { normalizeUrl } from "./normalize.js";
import type { PageLink } from "./page-analyzer.js";
import type { BrokenLink, BrokenLinkReport } from "./types.js";

const LINK_TIMEOUT_MS = 5000;

type LinkStatus = {
  status: number | null;
  statusText: string;
  broken: boolean;
};

/**
 * Checks one destination. Uses the same SSRF-safe `fetchWithTimeout` as every
 * other request — it resolves redirects internally, so `301 → 200` comes back
 * as a 200 (not broken). A `null` response means unreachable (timeout, DNS
 * failure, refused, too many redirects, or blocked by the security policy).
 */
async function checkOne(url: string): Promise<LinkStatus> {
  let response: Response | null;
  try {
    response = await fetchWithTimeout(url, LINK_TIMEOUT_MS);
  } catch {
    response = null;
  }

  if (!response) {
    return { status: null, statusText: "Unreachable", broken: true };
  }

  // Free the body — we only need the status line.
  try {
    await response.body?.cancel();
  } catch {
    /* ignore */
  }

  const { status } = response;

  if (status >= 200 && status < 300) {
    return { status, statusText: `${status} OK`, broken: false };
  }

  // fetchWithTimeout only returns a 3xx when it had no Location to follow.
  if (status >= 300 && status < 400) {
    return {
      status,
      statusText: `${status} Redirect (no target)`,
      broken: true,
    };
  }

  return {
    status,
    statusText: `${status} ${response.statusText || "Error"}`.trim(),
    broken: true,
  };
}

/**
 * Verifies every distinct link destination collected during a crawl and
 * reports the broken ones, attributed back to the pages that link to them.
 *
 * Failures are isolated: one dead destination never stops the others.
 */
export async function checkLinks(
  linksBySource: { sourceUrl: string; links: PageLink[] }[],
): Promise<BrokenLinkReport> {
  // Collapse to distinct destinations, remembering every (source, anchor).
  const destinations = new Map<
    string,
    { internal: boolean; refs: { sourceUrl: string; anchor: string }[] }
  >();

  for (const { sourceUrl, links } of linksBySource) {
    for (const link of links) {
      const key = normalizeUrl(link.url) ?? link.url;
      let entry = destinations.get(key);
      if (!entry) {
        entry = { internal: link.internal, refs: [] };
        destinations.set(key, entry);
      }
      entry.refs.push({ sourceUrl, anchor: link.anchor });
    }
  }

  // Check internal destinations first — a broken link on your own site is the
  // most actionable finding — then external, up to the cap.
  const targets = [...destinations.entries()]
    .sort(
      ([, a], [, b]) => Number(b.internal) - Number(a.internal),
    )
    .map(([url]) => url)
    .slice(0, MAX_LINKS_CHECKED);
  const statuses = new Map<string, LinkStatus>();

  // One slow/dead host must never hang the crawl: stop starting new checks
  // once the phase budget is spent. Anything unchecked is simply not reported.
  const deadline = Date.now() + LINK_CHECK_BUDGET_MS;

  await pooledForEach(targets, LINK_CHECK_CONCURRENCY, async (target) => {
    if (Date.now() > deadline) return;
    statuses.set(target, await checkOne(target));
  });

  const broken: BrokenLink[] = [];
  let total = 0;
  let internal = 0;
  let external = 0;
  let actuallyChecked = 0;

  for (const target of targets) {
    const status = statuses.get(target);
    const entry = destinations.get(target);
    if (!status) continue;
    actuallyChecked += 1;
    if (!entry || !status.broken) continue;

    for (const ref of entry.refs) {
      total += 1;
      if (entry.internal) internal += 1;
      else external += 1;

      if (broken.length < MAX_BROKEN_LINK_ROWS) {
        broken.push({
          sourceUrl: ref.sourceUrl,
          targetUrl: target,
          type: entry.internal ? "internal" : "external",
          status: status.status,
          statusText: status.statusText,
          anchor: ref.anchor,
        });
      }
    }
  }

  return {
    total,
    internal,
    external,
    checked: actuallyChecked,
    links: broken,
  };
}
