import type { SeoIssue } from "../types/seo";

type ResultSummaryProps = {
  url: string;
  issues: SeoIssue[];
};

function ResultSummary({ url, issues }: ResultSummaryProps) {
  const criticalCount = issues.filter(
    (issue) => issue.severity === "critical",
  ).length;

  const importantCount = issues.filter(
    (issue) => issue.severity === "important",
  ).length;

  const opportunityCount = issues.filter(
    (issue) => issue.severity === "opportunity",
  ).length;

  return (
    <div className="result-summary">
      <div>
        <h2>
          {issues.length}{" "}
          {issues.length === 1 ? "opportunity" : "opportunities"} found
        </h2>

        <p>{url}</p>
      </div>

      <div className="severity-summary">
        <span className="severity-count critical">
          {criticalCount} Critical
        </span>

        <span className="severity-count important">
          {importantCount} Important
        </span>

        <span className="severity-count opportunity">
          {opportunityCount} Opportunities
        </span>
      </div>
    </div>
  );
}

export default ResultSummary;
