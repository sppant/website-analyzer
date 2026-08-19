import type { SeoIssue } from "../types/seo";

const severityPriority: Record<SeoIssue["severity"], number> = {
  critical: 0,
  important: 1,
  opportunity: 2,
};

export function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs improvement";
  return "Poor";
}

export function getSeverityLabel(severity: SeoIssue["severity"]) {
  if (severity === "critical") return "Critical";
  if (severity === "important") return "Important";
  return "Opportunity";
}

export function sortIssues(issues: SeoIssue[]) {
  return [...issues].sort(
    (a, b) => severityPriority[a.severity] - severityPriority[b.severity],
  );
}
