import { getScoreLabel } from "../utils/seo";

type ScoreCardProps = {
  score: number;
};

function ScoreCard({ score }: ScoreCardProps) {
  function handleDownloadPdf() {
    window.print();
  }

  return (
    <div className="score-card">
      <button
        type="button"
        className="download-pdf"
        onClick={handleDownloadPdf}
      >
        <span aria-hidden="true">↓</span>
        Download PDF
      </button>

      <p>SEO SCORE</p>

      <strong>{score}</strong>

      <span> / 100</span>

      <p>{getScoreLabel(score)}</p>
    </div>
  );
}

export default ScoreCard;
