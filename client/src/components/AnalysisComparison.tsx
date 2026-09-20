import type { AnalysisComparison as Comparison } from "../types/project";

function ChangeBadge({ value }: { value: number }) {
  const sign = value > 0 ? "+" : "";
  const tone = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span className={`comparison-change comparison-change-${tone}`}>
      {sign}
      {value}
    </span>
  );
}

function AnalysisComparison({ comparison }: { comparison: Comparison }) {
  const { before, after, scoreChange, issues, fields } = comparison;

  return (
    <div className="comparison">
      <div className="comparison-score">
        <div>
          <span>Before</span>
          <strong>{before.score}</strong>
        </div>
        <div>
          <span>Now</span>
          <strong>{after.score}</strong>
        </div>
        <div>
          <span>Change</span>
          <ChangeBadge value={scoreChange} />
        </div>
      </div>

      <div className="comparison-issues-summary">
        <div>
          <strong>{issues.originalCount}</strong>
          <span>Original issues</span>
        </div>
        <div>
          <strong>{issues.currentCount}</strong>
          <span>Current issues</span>
        </div>
        <div className="good">
          <strong>{issues.fixedCount}</strong>
          <span>Fixed</span>
        </div>
        <div className={issues.newCount > 0 ? "warning" : ""}>
          <strong>{issues.newCount}</strong>
          <span>New</span>
        </div>
      </div>

      {fields.length > 0 && (
        <table className="comparison-fields">
          <tbody>
            {fields.map((field) => (
              <tr key={field.label}>
                <td>{field.label}</td>
                <td className="comparison-fields-values">
                  <span>{field.before}</span>
                  <span aria-hidden="true"> → </span>
                  <span className={field.improved ? "good" : "warning"}>
                    {field.after}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="comparison-issue-lists">
        {issues.fixed.length > 0 && (
          <div>
            <h4 className="good">Fixed ({issues.fixed.length})</h4>
            <ul>
              {issues.fixed.map((issue) => (
                <li key={issue.type}>{issue.title}</li>
              ))}
            </ul>
          </div>
        )}
        {issues.introduced.length > 0 && (
          <div>
            <h4 className="warning">New ({issues.introduced.length})</h4>
            <ul>
              {issues.introduced.map((issue) => (
                <li key={issue.type}>{issue.title}</li>
              ))}
            </ul>
          </div>
        )}
        {issues.remaining.length > 0 && (
          <div>
            <h4>Still to fix ({issues.remaining.length})</h4>
            <ul>
              {issues.remaining.map((issue) => (
                <li key={issue.type}>{issue.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisComparison;
