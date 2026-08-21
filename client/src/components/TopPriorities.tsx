import type { SeoIssue } from "../types/seo";
import { getSeverityLabel } from "../utils/seo";

type TopPrioritiesProps = {
  issues: SeoIssue[];
};

function TopPriorities({ issues }: TopPrioritiesProps) {
  const priorities = [...issues]
    .sort((a, b) => {
      const severityOrder = {
        critical: 0,
        important: 1,
        opportunity: 2,
      };

      return (
        severityOrder[a.severity] - severityOrder[b.severity] ||
        b.points - a.points
      );
    })
    .slice(0, 3);

  const potentialPoints = priorities.reduce(
    (total, issue) => total + issue.points,
    0,
  );

  if (priorities.length === 0) {
    return null;
  }

  return (
    <div className="top-priorities">
      <div className="top-priorities-header">
        <div>
          <span className="top-priorities-eyebrow">
            PRIORITY ACTIONS
          </span>

          <h2>Top 3 things to fix</h2>

          <p>
            Start with these issues for the biggest potential impact.
          </p>
        </div>

        <div className="potential-points">
          <strong>+{potentialPoints}</strong>
          <span>potential points</span>
        </div>
      </div>

      <div className="priority-list">
        {priorities.map((issue, index) => (
          <article
            key={issue.type}
            className={`priority-card ${issue.severity}`}
          >
            <div className="priority-number">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="priority-content">
              <div className="priority-meta">
                <span className={`severity-badge ${issue.severity}`}>
                  {getSeverityLabel(issue.severity)}
                </span>

                <span className="priority-points">
                  -{issue.points} points
                </span>
              </div>

              <h3>{issue.title}</h3>

              <p>{issue.description}</p>

              <div className="priority-fix">
                <strong>How to fix</strong>
                <span>{issue.recommendation}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default TopPriorities;
