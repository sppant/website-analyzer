import {
  analyzeSeo,
  calculateSeoScore,
  type SeoData,
  type SeoIssue,
} from "./seoRules.js";

import { fetchWithTimeout } from "../services/fetcher.js";
import { extractSeoData } from "../services/seoAnalyzer.js";
import { analyzeRobotsTxt } from "../services/robotsAnalyzer.js";
import { parseSitemapDocument } from "../services/sitemapAnalyzer.js";
import { analyzeInternalLinks } from "../services/internalLinkAnalyzer.js";
import {
  analyzePageSpeed,
  type PageSpeedData,
} from "../services/pageSpeedAnalyzer.js";

import { readResponseWithLimit } from "../utils/readResponse.js";
import { isSafeUrl } from "../utils/safeUrl.js";

export const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_ROBOTS_BYTES = 1 * 1024 * 1024;
const MAX_SITEMAP_BYTES = 5 * 1024 * 1024;

const EMPTY_PAGE_SPEED: PageSpeedData = {
  performanceScore: null,
  lcp: null,
  cls: null,
  inp: null,
  fcp: null,
  ttfb: null,
};

/**
 * Site-level SEO facts that are the same for every page on a domain (robots.txt
 * + sitemap). Discovered once and merged into each page's `SeoData` so the
 * per-page rules don't need to re-fetch them.
 */
export type SiteContext = Pick<
  SeoData,
  | "robotsTxt"
  | "robotsTxtHasSitemap"
  | "robotsTxtBlocksAll"
  | "sitemapXml"
  | "sitemapType"
  | "sitemapUrl"
  | "sitemapUrlCount"
>;

export const EMPTY_SITE_CONTEXT: SiteContext = {
  robotsTxt: false,
  robotsTxtHasSitemap: false,
  robotsTxtBlocksAll: false,
  sitemapXml: false,
  sitemapType: null,
  sitemapUrl: null,
  sitemapUrlCount: 0,
};

/**
 * The full result of analyzing a website.
 *
 * This is the contract the analysis engine returns to its callers. It is
 * deliberately free of any HTTP, authentication, subscription, or persistence
 * concerns so the engine stays reusable.
 */
export type AnalysisResult = {
  url: string;
  statusCode: number;
  seo: SeoData;
  score: number;
  issues: SeoIssue[];
};

/**
 * Raised when a website cannot be analyzed for an expected, client-facing
 * reason (unsupported protocol, credentials in the URL, an address that fails
 * the SSRF safety check, an unreachable site, an oversized response, ...).
 *
 * The HTTP layer maps this to a response status code. Unexpected errors are
 * left to propagate so the caller can decide how to handle them.
 */
export class AnalysisError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AnalysisError";
    this.statusCode = statusCode;
  }
}

export type RunAnalysisOptions = {
  /**
   * Called when PageSpeed data could not be collected. PageSpeed failures are
   * non-fatal: the analysis still completes with empty performance values.
   * The HTTP layer uses this to log the failure.
   */
  onPageSpeedError?: (error: unknown) => void;
};

/**
 * Fetch a URL and produce a complete SEO analysis.
 *
 * Security: every outbound request (the page and its redirects, plus
 * robots.txt and sitemap.xml) goes through `isSafeUrl` / `fetchWithTimeout`,
 * which enforce the SSRF boundary — HTTP/HTTPS only, credential rejection,
 * DNS resolution with public/unicast IP validation for both IPv4 and IPv6,
 * manual redirect handling with per-hop re-validation, a redirect limit, and
 * request timeouts. Response bodies are read with hard size limits.
 */
export async function runAnalysis(
  rawUrl: string,
  options: RunAnalysisOptions = {},
): Promise<AnalysisResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new AnalysisError("Enter a valid URL, including https://");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AnalysisError("Only HTTP and HTTPS URLs are supported.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new AnalysisError("URLs containing credentials are not supported.");
  }

  if (!(await isSafeUrl(parsedUrl.href))) {
    throw new AnalysisError("This URL cannot be analyzed.");
  }

  const response = await fetchWithTimeout(parsedUrl.href);

  if (!response) {
    throw new AnalysisError(
      "The website did not respond within the allowed time.",
    );
  }

  if (!response.ok) {
    throw new AnalysisError(`Website returned HTTP ${response.status}`);
  }

  const html = await readResponseWithLimit(response, MAX_HTML_BYTES);

  if (html === null) {
    throw new AnalysisError("The website response is too large to analyze.");
  }

  let pageSpeed: PageSpeedData;

  try {
    pageSpeed = await analyzePageSpeed(parsedUrl.href);
  } catch (error) {
    options.onPageSpeedError?.(error);
    pageSpeed = { ...EMPTY_PAGE_SPEED };
  }

  const seo: SeoData = {
    ...extractSeoData(html, parsedUrl),
    internalLinks: analyzeInternalLinks(html, parsedUrl),
    pageSpeed,
  };

  Object.assign(seo, await discoverSiteContext(parsedUrl.origin));

  const issues = analyzeSeo(seo);
  const score = calculateSeoScore(issues);

  return {
    url: parsedUrl.href,
    statusCode: response.status,
    seo,
    score,
    issues,
  };
}

/** At most this many sitemap URLs are probed per analysis (no broad crawling). */
const MAX_SITEMAP_CANDIDATES = 5;

/**
 * Discovers the site-level robots.txt + sitemap facts for an origin. Shared by
 * `runAnalysis` and the crawler so a multi-page crawl fetches them exactly once.
 *
 * Every candidate URL (including the attacker-controllable ones from
 * `robots.txt`) goes through `fetchWithTimeout`, which enforces the full SSRF
 * boundary. No direct `fetch`.
 */
export async function discoverSiteContext(
  origin: string,
): Promise<SiteContext> {
  const context: SiteContext = { ...EMPTY_SITE_CONTEXT };

  const robotsUrl = new URL("/robots.txt", origin).href;
  const conventionalSitemapUrls = [
    new URL("/sitemap.xml", origin).href,
    new URL("/sitemap_index.xml", origin).href,
  ];

  const [robotsResponse, firstSitemapResponse] = await Promise.all([
    fetchWithTimeout(robotsUrl, 5000),
    fetchWithTimeout(conventionalSitemapUrls[0], 5000),
  ]);

  let robotsSitemapUrls: string[] = [];

  if (robotsResponse?.ok) {
    const robotsText = await readResponseWithLimit(
      robotsResponse,
      MAX_ROBOTS_BYTES,
    );

    if (robotsText !== null) {
      const robots = analyzeRobotsTxt(robotsText);
      context.robotsTxt = robots.robotsTxt;
      context.robotsTxtHasSitemap = robots.robotsTxtHasSitemap;
      context.robotsTxtBlocksAll = robots.robotsTxtBlocksAll;
      robotsSitemapUrls = robots.sitemapUrls;
    }
  }

  const [defaultSitemapUrl] = conventionalSitemapUrls;

  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const url of [...robotsSitemapUrls, ...conventionalSitemapUrls]) {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push(normalized);
    if (candidates.length >= MAX_SITEMAP_CANDIDATES) break;
  }

  for (const candidate of candidates) {
    const response =
      candidate === defaultSitemapUrl
        ? firstSitemapResponse
        : await fetchWithTimeout(candidate, 5000);

    if (!response?.ok) continue;

    const text = await readResponseWithLimit(response, MAX_SITEMAP_BYTES);
    if (text === null) continue;

    const parsed = parseSitemapDocument(text);
    if (parsed.type === null) continue;

    context.sitemapXml = true;
    context.sitemapType = parsed.type;
    context.sitemapUrl = response.url || candidate;
    context.sitemapUrlCount = parsed.count;
    return context;
  }

  return context;
}
