import { getScoreLabel } from "../utils/seo";

type ScoreCardProps = {
  score: number;
};

function ScoreCard({ score }: ScoreCardProps) {
  return (
    <div className="score-card">
      <p>SEO SCORE</p>

      <strong>{score}</strong>

      <span> / 100</span>

      <p>{getScoreLabel(score)}</p>
    </div>
  );
}

export default ScoreCard;
