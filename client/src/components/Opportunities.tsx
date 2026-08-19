import type { SeoIssue } from "../types/seo";
import { getSeverityLabel } from "../utils/seo";

type OpportunitiesProps = {
  issues: SeoIssue[];
};

function Opportunities({ issues }: OpportunitiesProps) {
  return (
    <div className="opportunities-section">
      <h2>Biggest Opportunities</h2>

      {issues.length === 0 ? (
        <div className="empty-state">
          <strong>No issues found</strong>

          <p>
            This page passed all of the checks currently available.
          </p>
        </div>
      ) : (
        issues.map((issue) => (
          <article
            key={issue.type}
            className={`issue-card ${issue.severity}`}
          >
            <div className="issue-header">
              <span className={`severity-badge ${issue.severity}`}>
                {getSeverityLabel(issue.severity)}
              </span>

              <small>-{issue.points} points</small>
            </div>

            <h3>{issue.title}</h3>

            <p>{issue.description}</p>
          </article>
        ))
      )}
    </div>
  );
}

export default Opportunities;
