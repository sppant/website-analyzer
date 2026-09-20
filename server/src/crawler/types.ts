import type { SeoData, SeoIssue } from "../analyzer/seoRules.js";
import type { AnalysisResult } from "../analyzer/runAnalysis.js";

/** One page visited during a crawl. */
export type CrawlPage = {
  url: string;
  /** false when the page could not be fetched / analyzed. */
  ok: boolean;
  statusCode: number | null;
  score: number | null;
  /** Present only for a successfully analyzed page. */
  seo?: SeoData;
  issues: SeoIssue[];
  /** Set when `ok` is false. */
  error?: string;
};

export type CommonIssue = {
  type: string;
  title: string;
  severity: SeoIssue["severity"];
  /** How many distinct pages had this issue. */
  pages: number;
};

export type CrawlSummary = {
  /** Simple average of the per-page scores (successful pages only). */
  websiteScore: number;
  pagesAnalyzed: number;
  pagesFailed: number;
  totalIssues: number;
  criticalIssues: number;
  importantIssues: number;
  opportunityIssues: number;
  /** Most frequent issue types across the site, most common first. */
  commonIssues: CommonIssue[];
};

export type BrokenLink = {
  sourceUrl: string;
  targetUrl: string;
  type: "internal" | "external";
  /** null when the destination could not be reached at all. */
  status: number | null;
  /** e.g. "404 Not Found", "Unreachable", "Redirect (no target)". */
  statusText: string;
  anchor: string;
};

export type BrokenLinkReport = {
  total: number;
  internal: number;
  external: number;
  /** Number of distinct destinations actually checked (capped). */
  checked: number;
  links: BrokenLink[];
};

export type CrawlResult = {
  rootUrl: string;
  pagesAnalyzed: number;
  pagesLimit: number;
  pages: CrawlPage[];
  summary: CrawlSummary;
  brokenLinks: BrokenLinkReport;
  /** true when performance data is present for the homepage only. */
  pageSpeedRootOnly: boolean;
};

// --- competitor comparison ------------------------------------------------

export type CompetitorMetric = {
  label: string;
  /** "number" | "boolean" — controls how the UI renders it. */
  kind: "number" | "boolean";
  you: number | boolean | null;
  competitor: number | boolean | null;
  /** true if a higher value is better (used to pick the "winner"). */
  higherIsBetter: boolean;
};

export type CompetitorSide = {
  url: string;
  score: number;
  issueCount: number;
  performanceScore: number | null;
};

export type CompetitorComparison = {
  you: CompetitorSide;
  competitor: CompetitorSide;
  metrics: CompetitorMetric[];
  /** Concrete, data-backed things the user could improve. Never invented. */
  opportunities: string[];
  /** The two underlying analyses, so the UI can drill in if it wants. */
  analyses: { you: AnalysisResult; competitor: AnalysisResult };
};
