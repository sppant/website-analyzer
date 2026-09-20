type Point = { date: string; score: number };

type ScoreTrendProps = {
  /** Oldest → newest. */
  points: Point[];
};

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 34 };

function x(index: number, count: number): number {
  if (count <= 1) return PAD.left;
  const span = WIDTH - PAD.left - PAD.right;
  return PAD.left + (index / (count - 1)) * span;
}

function y(score: number): number {
  const span = HEIGHT - PAD.top - PAD.bottom;
  return PAD.top + (1 - score / 100) * span;
}

/**
 * Lightweight SVG line chart of SEO score over time. No charting library.
 */
function ScoreTrend({ points }: ScoreTrendProps) {
  if (points.length === 0) return null;

  const coords = points.map((point, index) => ({
    ...point,
    cx: x(index, points.length),
    cy: y(point.score),
  }));

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`)
    .join(" ");

  const area = `${line} L ${coords[coords.length - 1]!.cx.toFixed(1)} ${
    HEIGHT - PAD.bottom
  } L ${coords[0]!.cx.toFixed(1)} ${HEIGHT - PAD.bottom} Z`;

  const last = coords[coords.length - 1]!;
  const gridScores = [0, 25, 50, 75, 100];

  return (
    <div className="score-trend">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`SEO score trend: ${points
          .map((p) => p.score)
          .join(", ")}`}
      >
        {gridScores.map((score) => (
          <g key={score}>
            <line
              className="score-trend-grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(score)}
              y2={y(score)}
            />
            <text
              className="score-trend-axis"
              x={PAD.left - 8}
              y={y(score) + 3}
              textAnchor="end"
            >
              {score}
            </text>
          </g>
        ))}

        <path className="score-trend-area" d={area} />
        <path className="score-trend-line" d={line} />

        {coords.map((c, i) => (
          <circle
            key={c.date + i}
            className="score-trend-dot"
            cx={c.cx}
            cy={c.cy}
            r={i === coords.length - 1 ? 4 : 3}
          />
        ))}

        <text
          className="score-trend-value"
          x={last.cx}
          y={last.cy - 10}
          textAnchor="middle"
        >
          {last.score}
        </text>
      </svg>
    </div>
  );
}

export default ScoreTrend;
