import { getScoreLabel } from "../utils/seo";

type ScoreCardProps = {
  score: number;
  onReanalyze?: () => void;
  isLoading?: boolean;
};

function ScoreCard({
  score,
  onReanalyze,
  isLoading = false,
}: ScoreCardProps) {
  function handleDownloadPdf() {
    window.print();
  }

  return (
    <div className="score-card">
      <div className="score-card-actions">
        {onReanalyze && (
          <button
            type="button"
            className="score-action-button"
            onClick={onReanalyze}
            disabled={isLoading}
          >
            <span aria-hidden="true">↻</span>
            {isLoading ? "Analyzing..." : "Re-run Analysis"}
          </button>
        )}

        <button
          type="button"
          className="score-action-button"
          onClick={handleDownloadPdf}
        >
          <span aria-hidden="true">↓</span>
          Download PDF
        </button>
      </div>

      <p>SEO SCORE</p>

      <strong>{score}</strong>

      <span> / 100</span>

      <p>{getScoreLabel(score)}</p>
    </div>
  );
}

export default ScoreCard;
