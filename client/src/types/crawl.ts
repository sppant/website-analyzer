import type { AnalysisResult, SeoData, SeoIssue } from "./seo";

export type CrawlPage = {
  url: string;
  ok: boolean;
  statusCode: number | null;
  score: number | null;
  seo?: SeoData;
  issues: SeoIssue[];
  error?: string;
};

export type CrawlCommonIssue = {
  type: string;
  title: string;
  severity: SeoIssue["severity"];
  pages: number;
};

export type CrawlSummary = {
  websiteScore: number;
  pagesAnalyzed: number;
  pagesFailed: number;
  totalIssues: number;
  criticalIssues: number;
  importantIssues: number;
  opportunityIssues: number;
  commonIssues: CrawlCommonIssue[];
};

export type BrokenLink = {
  sourceUrl: string;
  targetUrl: string;
  type: "internal" | "external";
  status: number | null;
  statusText: string;
  anchor: string;
};

export type BrokenLinkReport = {
  total: number;
  internal: number;
  external: number;
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
  pageSpeedRootOnly: boolean;
};

export type CrawlSummaryRow = {
  id: string;
  projectId: string | null;
  rootUrl: string;
  score: number;
  pagesAnalyzed: number;
  brokenLinkCount: number;
  createdAt: string;
};

export type StoredCrawl = CrawlSummaryRow & { result: CrawlResult };

// --- competitor comparison ---------------------------------------------

export type CompetitorMetric = {
  label: string;
  kind: "number" | "boolean";
  you: number | boolean | null;
  competitor: number | boolean | null;
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
  opportunities: string[];
  analyses: { you: AnalysisResult; competitor: AnalysisResult };
};
