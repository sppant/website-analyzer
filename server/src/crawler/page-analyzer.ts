import * as cheerio from "cheerio";

import {
  MAX_HTML_BYTES,
  type SiteContext,
} from "../analyzer/runAnalysis.js";
import {
  analyzeSeo,
  calculateSeoScore,
  type SeoData,
} from "../analyzer/seoRules.js";
import { fetchWithTimeout } from "../services/fetcher.js";
import { analyzeInternalLinks } from "../services/internalLinkAnalyzer.js";
import { analyzePageSpeed } from "../services/pageSpeedAnalyzer.js";
import { extractSeoData } from "../services/seoAnalyzer.js";
import { readResponseWithLimit } from "../utils/readResponse.js";
import { isSafeUrl } from "../utils/safeUrl.js";
import { normalizeUrl, sameSite } from "./normalize.js";
import type { CrawlPage } from "./types.js";

const PAGE_TIMEOUT_MS = 9000;

const EMPTY_PAGE_SPEED = {
  performanceScore: null,
  lcp: null,
  cls: null,
  inp: null,
  fcp: null,
  ttfb: null,
} as const;

/** Every anchor on a page — used for broken-link detection. */
export type PageLink = {
  /** Fragment-stripped absolute URL. */
  url: string;
  anchor: string;
  internal: boolean;
};

/**
 * Extracts every `<a href>` on a page as an absolute URL + anchor text.
 * Skips `#`, `mailto:`, `tel:`, `javascript:` and non-http(s) links. Dedupes
 * within the page.
 */
export function extractLinks(html: string, pageUrl: URL): PageLink[] {
  const $ = cheerio.load(html);
  const out: PageLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return;
    }

    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl.href);
    } catch {
      return;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;

    resolved.hash = "";
    const key = resolved.href;
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      url: key,
      anchor: $(element).text().replace(/\s+/g, " ").trim(),
      internal: sameSite(resolved, pageUrl),
    });
  });

  return out;
}

export type PageOutcome = {
  page: CrawlPage;
  /** Normalized same-site URLs discovered on this page (queue candidates). */
  internalTargets: string[];
  /** Every link on the page (for broken-link checking). */
  links: PageLink[];
};

/**
 * Fetches and analyzes one page, reusing the existing analyzer services.
 * Never throws — a fetch/parse failure is returned as a `CrawlPage` with
 * `ok: false` so one bad page cannot fail the whole crawl.
 *
 * Every request goes through `isSafeUrl` + `fetchWithTimeout` (the SSRF
 * boundary). `siteContext` (robots.txt / sitemap) is discovered once by the
 * caller and merged in here so per-page rules don't re-fetch it.
 */
export async function analyzePage(
  rawUrl: string,
  siteContext: SiteContext,
  options: {
    includePageSpeed?: boolean;
    onPageSpeedError?: (error: unknown) => void;
  } = {},
): Promise<PageOutcome> {
  const failed = (statusCode: number | null, error: string): PageOutcome => ({
    page: { url: rawUrl, ok: false, statusCode, score: null, issues: [], error },
    internalTargets: [],
    links: [],
  });

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return failed(null, "Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return failed(null, "Unsupported protocol");
  }
  if (parsed.username || parsed.password) {
    return failed(null, "URL contains credentials");
  }
  if (!(await isSafeUrl(parsed.href))) {
    return failed(null, "Blocked by security policy");
  }

  const response = await fetchWithTimeout(parsed.href, PAGE_TIMEOUT_MS);
  if (!response) {
    return failed(null, "No response");
  }
  if (!response.ok) {
    return failed(response.status, `HTTP ${response.status}`);
  }

  // Only analyze HTML pages — skip PDFs, feeds, key files, downloads, etc.
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/\b(text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
    return failed(response.status, `Not an HTML page (${contentType.split(";")[0]})`);
  }

  const html = await readResponseWithLimit(response, MAX_HTML_BYTES);
  if (html === null) {
    return failed(response.status, "Response too large");
  }

  let pageSpeed: SeoData["pageSpeed"] = { ...EMPTY_PAGE_SPEED };
  if (options.includePageSpeed) {
    try {
      pageSpeed = await analyzePageSpeed(parsed.href);
    } catch (error) {
      options.onPageSpeedError?.(error);
    }
  }

  const seo: SeoData = {
    ...extractSeoData(html, parsed),
    internalLinks: analyzeInternalLinks(html, parsed),
    ...siteContext,
    pageSpeed,
  };

  const issues = analyzeSeo(seo);
  const score = calculateSeoScore(issues);

  const links = extractLinks(html, parsed);

  const internalTargets: string[] = [];
  const seenTargets = new Set<string>();
  for (const link of links) {
    if (!link.internal) continue;
    const normalized = normalizeUrl(link.url);
    if (!normalized || seenTargets.has(normalized)) continue;
    seenTargets.add(normalized);
    internalTargets.push(normalized);
  }

  return {
    page: {
      url: parsed.href,
      ok: true,
      statusCode: response.status,
      score,
      seo,
      issues,
    },
    internalTargets,
    links,
  };
}
