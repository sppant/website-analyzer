import type { SeoIssue } from "../types/seo";
import { getSeverityLabel } from "../utils/seo";

type TopFixesProps = {
  issues: SeoIssue[];
};

function TopFixes({ issues }: TopFixesProps) {
  const topFixes = [...issues]
    .sort((a, b) => {
      const severityOrder = {
        critical: 3,
        important: 2,
        opportunity: 1,
      };

      return (
        severityOrder[b.severity] - severityOrder[a.severity] ||
        b.points - a.points
      );
    })
    .slice(0, 3);

  if (topFixes.length === 0) {
    return null;
  }

  return (
    <div className="top-fixes">
      <div className="top-fixes-header">
        <div>
          <span className="top-fixes-label">PRIORITY ACTIONS</span>
          <h2>Top 3 Things to Fix</h2>
        </div>

        <span className="top-fixes-count">
          {topFixes.length} {topFixes.length === 1 ? "priority" : "priorities"}
        </span>
      </div>

      <div className="top-fixes-list">
        {topFixes.map((issue, index) => (
          <article
            key={issue.type}
            className={`top-fix ${issue.severity}`}
          >
            <div className="top-fix-number">{index + 1}</div>

            <div className="top-fix-content">
              <div className="top-fix-meta">
                <span className={`severity-badge ${issue.severity}`}>
                  {getSeverityLabel(issue.severity)}
                </span>

                <span>-{issue.points} points</span>
              </div>

              <h3>{issue.title}</h3>

              <p>{issue.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default TopFixes;
