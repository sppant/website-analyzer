import type { AnalysisResult } from "../analyzer/runAnalysis.js";
import type { SeoData, SeoIssue } from "../analyzer/seoRules.js";

/** An issue identified only by its stable `type` (never by recommendation text). */
export type IssueRef = {
  type: string;
  severity: SeoIssue["severity"];
  title: string;
};

export type FieldChange = {
  label: string;
  before: string;
  after: string;
  /** true when the change is an improvement. */
  improved: boolean;
};

export type AnalysisComparison = {
  before: { score: number; url: string };
  after: { score: number; url: string };
  scoreChange: number;
  issues: {
    fixed: IssueRef[];
    remaining: IssueRef[];
    introduced: IssueRef[];
    originalCount: number;
    currentCount: number;
    fixedCount: number;
    newCount: number;
  };
  /** Concrete metric deltas taken straight from `AnalysisResult.seo`. */
  fields: FieldChange[];
};

function toRef(issue: SeoIssue): IssueRef {
  return { type: issue.type, severity: issue.severity, title: issue.title };
}

/** Dedupe by `type` — the analyzer never emits the same type twice, but be safe. */
function byType(issues: SeoIssue[]): Map<string, SeoIssue> {
  const map = new Map<string, SeoIssue>();
  for (const issue of issues) {
    if (!map.has(issue.type)) map.set(issue.type, issue);
  }
  return map;
}

type FieldSpec = {
  label: string;
  /** Human-readable current value. */
  value: (seo: SeoData) => string;
  /** Lower score = better. Used to decide `improved` and whether to show the row. */
  rank: (seo: SeoData) => number;
};

const FIELD_SPECS: FieldSpec[] = [
  {
    label: "Missing image alt text",
    value: (s) => String(s.imagesMissingAlt),
    rank: (s) => s.imagesMissingAlt,
  },
  {
    label: "Internal links",
    value: (s) => String(s.internalLinks?.internalLinks ?? 0),
    // More internal links is better → negate so lower rank = better.
    rank: (s) => -(s.internalLinks?.internalLinks ?? 0),
  },
  {
    label: "H1 heading",
    value: (s) => (s.h1Count === 0 ? "Missing" : s.h1Count > 1 ? "Multiple" : "OK"),
    rank: (s) => (s.h1Count === 1 ? 0 : 1),
  },
  {
    label: "Meta description",
    value: (s) => (s.metaDescription ? "Present" : "Missing"),
    rank: (s) => (s.metaDescription ? 0 : 1),
  },
  {
    label: "Page title",
    value: (s) => (s.title ? "Present" : "Missing"),
    rank: (s) => (s.title ? 0 : 1),
  },
  {
    label: "Canonical URL",
    value: (s) => (s.canonical ? "Present" : "Missing"),
    rank: (s) => (s.canonical ? 0 : 1),
  },
  {
    label: "HTTPS",
    value: (s) => (s.https ? "Enabled" : "Not enabled"),
    rank: (s) => (s.https ? 0 : 1),
  },
  {
    label: "XML sitemap",
    value: (s) => (s.sitemapXml ? "Found" : "Missing"),
    rank: (s) => (s.sitemapXml ? 0 : 1),
  },
  {
    label: "robots.txt",
    value: (s) => (s.robotsTxt ? "Found" : "Missing"),
    rank: (s) => (s.robotsTxt ? 0 : 1),
  },
];

function diffFields(before: SeoData, after: SeoData): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const spec of FIELD_SPECS) {
    const beforeValue = spec.value(before);
    const afterValue = spec.value(after);
    if (beforeValue === afterValue) continue;
    changes.push({
      label: spec.label,
      before: beforeValue,
      after: afterValue,
      improved: spec.rank(after) < spec.rank(before),
    });
  }
  return changes;
}

/**
 * Compares two analyses of the same site. Only data present in
 * `AnalysisResult` is used; issues are matched by `SeoIssue.type`.
 */
export function compareAnalyses(
  before: AnalysisResult,
  after: AnalysisResult,
): AnalysisComparison {
  const beforeIssues = byType(before.issues);
  const afterIssues = byType(after.issues);

  const fixed: IssueRef[] = [];
  const remaining: IssueRef[] = [];
  const introduced: IssueRef[] = [];

  for (const [type, issue] of beforeIssues) {
    if (afterIssues.has(type)) remaining.push(toRef(afterIssues.get(type)!));
    else fixed.push(toRef(issue));
  }
  for (const [type, issue] of afterIssues) {
    if (!beforeIssues.has(type)) introduced.push(toRef(issue));
  }

  return {
    before: { score: before.score, url: before.url },
    after: { score: after.score, url: after.url },
    scoreChange: after.score - before.score,
    issues: {
      fixed,
      remaining,
      introduced,
      originalCount: beforeIssues.size,
      currentCount: afterIssues.size,
      fixedCount: fixed.length,
      newCount: introduced.length,
    },
    fields: diffFields(before.seo, after.seo),
  };
}
