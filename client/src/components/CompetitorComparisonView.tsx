import type {
  CompetitorComparison,
  CompetitorMetric,
} from "../types/crawl";

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function cell(metric: CompetitorMetric, side: "you" | "competitor") {
  const value = metric[side];
  if (value === null || value === undefined) return <span className="muted">—</span>;
  if (metric.kind === "boolean") {
    return value ? (
      <span className="cmp-yes">✓</span>
    ) : (
      <span className="cmp-no">✕</span>
    );
  }
  return <span>{value}</span>;
}

function winner(metric: CompetitorMetric): "you" | "competitor" | null {
  const a = metric.you;
  const b = metric.competitor;
  if (typeof a !== "number" || typeof b !== "number") {
    if (typeof a === "boolean" && typeof b === "boolean" && a !== b) {
      return a ? "you" : "competitor";
    }
    return null;
  }
  if (a === b) return null;
  const youHigher = a > b;
  return youHigher === metric.higherIsBetter ? "you" : "competitor";
}

function CompetitorComparisonView({
  comparison,
}: {
  comparison: CompetitorComparison;
}) {
  return (
    <div className="cmp-view">
      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th>SEO comparison</th>
              <th>You</th>
              <th>Competitor</th>
            </tr>
            <tr className="cmp-urls">
              <td />
              <td>{host(comparison.you.url)}</td>
              <td>{host(comparison.competitor.url)}</td>
            </tr>
          </thead>
          <tbody>
            {comparison.metrics.map((metric) => {
              const win = winner(metric);
              return (
                <tr key={metric.label}>
                  <td>{metric.label}</td>
                  <td className={win === "you" ? "cmp-win" : ""}>
                    {cell(metric, "you")}
                  </td>
                  <td className={win === "competitor" ? "cmp-win" : ""}>
                    {cell(metric, "competitor")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comparison.opportunities.length > 0 && (
        <section className="cmp-opportunities">
          <h3>Your biggest opportunities</h3>
          <ol>
            {comparison.opportunities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default CompetitorComparisonView;
