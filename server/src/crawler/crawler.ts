import {
  CRAWL_BUDGET_MS,
  CRAWL_CONCURRENCY,
  MAX_CRAWL_PAGES,
} from "../billing/plan.js";
import {
  AnalysisError,
  discoverSiteContext,
  EMPTY_SITE_CONTEXT,
} from "../analyzer/runAnalysis.js";
import { isSafeUrl } from "../utils/safeUrl.js";
import { checkLinks } from "./link-checker.js";
import { canonicalHost, normalizeUrl, sameSite } from "./normalize.js";
import { analyzePage, type PageLink } from "./page-analyzer.js";
import { runCrawlQueue } from "./pool.js";
import type {
  CommonIssue,
  CrawlPage,
  CrawlResult,
  CrawlSummary,
} from "./types.js";

export type CrawlOptions = {
  /** Clamped to `MAX_CRAWL_PAGES` by the server regardless of what is passed. */
  maxPages?: number;
  onPageSpeedError?: (error: unknown) => void;
  /** Wall-clock budget for the page-fetching phase (ms). Defaults to `CRAWL_BUDGET_MS`. */
  budgetMs?: number;
};

function buildSummary(pages: CrawlPage[]): CrawlSummary {
  const ok = pages.filter((p) => p.ok);
  const scores = ok.map((p) => p.score ?? 0);
  const websiteScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  let critical = 0;
  let important = 0;
  let opportunity = 0;
  let totalIssues = 0;

  // type -> { meta, distinct page count }
  const byType = new Map<
    string,
    { title: string; severity: CommonIssue["severity"]; pages: number }
  >();

  for (const page of ok) {
    const typesOnPage = new Set<string>();
    for (const issue of page.issues) {
      totalIssues += 1;
      if (issue.severity === "critical") critical += 1;
      else if (issue.severity === "important") important += 1;
      else opportunity += 1;

      if (!typesOnPage.has(issue.type)) {
        typesOnPage.add(issue.type);
        const existing = byType.get(issue.type);
        if (existing) existing.pages += 1;
        else
          byType.set(issue.type, {
            title: issue.title,
            severity: issue.severity,
            pages: 1,
          });
      }
    }
  }

  const commonIssues: CommonIssue[] = [...byType.entries()]
    .map(([type, meta]) => ({ type, ...meta }))
    .sort((a, b) => b.pages - a.pages)
    .slice(0, 12);

  return {
    websiteScore,
    pagesAnalyzed: ok.length,
    pagesFailed: pages.length - ok.length,
    totalIssues,
    criticalIssues: critical,
    importantIssues: important,
    opportunityIssues: opportunity,
    commonIssues,
  };
}

/**
 * Crawls a website starting from `rootUrl`, staying on the same site, and
 * produces per-page analyses + an aggregate summary + a broken-link report.
 *
 * - The root is validated up front; a bad root URL throws `AnalysisError`.
 * - Every fetched URL (pages, discovered links, external destinations) goes
 *   through `isSafeUrl` + `fetchWithTimeout`. No page is trusted just because
 *   it was linked from the user's own site.
 * - PageSpeed runs for the root page only.
 * - One failing page never fails the crawl.
 */
export async function crawlWebsite(
  rootUrl: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const pagesLimit = Math.min(
    Math.max(1, options.maxPages ?? MAX_CRAWL_PAGES),
    MAX_CRAWL_PAGES,
  );

  let root: URL;
  try {
    root = new URL(rootUrl);
  } catch {
    throw new AnalysisError("Enter a valid website URL.");
  }
  if (root.protocol !== "http:" && root.protocol !== "https:") {
    throw new AnalysisError("Only HTTP and HTTPS URLs are supported.");
  }
  if (root.username || root.password) {
    throw new AnalysisError("URLs containing credentials are not supported.");
  }
  if (!(await isSafeUrl(root.href))) {
    throw new AnalysisError("This URL cannot be analyzed.");
  }

  // Site-level facts (robots.txt / sitemap) — fetched exactly once.
  let siteContext = { ...EMPTY_SITE_CONTEXT };
  try {
    siteContext = await discoverSiteContext(root.origin);
  } catch {
    /* non-fatal — pages just won't have robots/sitemap context */
  }

  const rootNormalized = normalizeUrl(root.href)!;

  // Analyze the root (with PageSpeed) before starting the queue.
  const rootOutcome = await analyzePage(rootNormalized, siteContext, {
    includePageSpeed: true,
    onPageSpeedError: options.onPageSpeedError,
  });

  if (!rootOutcome.page.ok) {
    throw new AnalysisError(
      `The homepage could not be analyzed (${rootOutcome.page.error}).`,
    );
  }

  const linksBySource: { sourceUrl: string; links: PageLink[] }[] = [
    { sourceUrl: rootOutcome.page.url, links: rootOutcome.links },
  ];

  const onSite = (candidate: string): boolean => {
    try {
      return sameSite(new URL(candidate), root);
    } catch {
      return false;
    }
  };

  const keepAsTarget = (url: string): boolean =>
    onSite(url) && url !== rootNormalized;

  const seeds = rootOutcome.internalTargets.filter(keepAsTarget);

  const pages = await runCrawlQueue<CrawlPage>({
    seeds,
    maxPages: pagesLimit - 1, // the root is already counted
    concurrency: CRAWL_CONCURRENCY,
    deadline: Date.now() + (options.budgetMs ?? CRAWL_BUDGET_MS),
    process: async (url) => {
      const outcome = await analyzePage(url, siteContext, {
        includePageSpeed: false,
      });
      linksBySource.push({ sourceUrl: url, links: outcome.links });
      return {
        page: outcome.page,
        discovered: outcome.internalTargets.filter(keepAsTarget),
      };
    },
  });

  // Non-HTML resources (PDFs, feeds, downloads) get fetched during discovery
  // but are not "pages" — drop them from the report entirely.
  const allPages = [rootOutcome.page, ...pages].filter(
    (page) => page.ok || !page.error?.startsWith("Not an HTML page"),
  );
  const brokenLinks = await checkLinks(linksBySource);

  return {
    rootUrl: root.href,
    pagesAnalyzed: allPages.filter((p) => p.ok).length,
    pagesLimit,
    pages: allPages,
    summary: buildSummary(allPages),
    brokenLinks,
    pageSpeedRootOnly: true,
  };
}

/** Same-site host used by the crawl (for display / logging). */
export function crawlHost(url: string): string {
  try {
    return canonicalHost(new URL(url).hostname);
  } catch {
    return url;
  }
}
