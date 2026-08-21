import ScoreCard from "../ScoreCard";
import ResultSummary from "../ResultSummary";
import SeoAnalysis from "../SeoAnalysis";
import Opportunities from "../Opportunities";

import { sortIssues } from "../../utils/seo";

type ResultsDashboardProps = {
  result: {
    url: string;
    score: number;
    issues: Parameters<typeof sortIssues>[0];
    seo: Parameters<typeof SeoAnalysis>[0]["seo"];
  };
};

function ResultsDashboard({
  result,
}: ResultsDashboardProps) {
  const sortedIssues = sortIssues(result.issues);

  return (
    <section className="results">
      <ScoreCard score={result.score} />

      <ResultSummary
        url={result.url}
        issues={sortedIssues}
      />

      <SeoAnalysis seo={result.seo} />

      <Opportunities issues={sortedIssues} />
    </section>
  );
}

export default ResultsDashboard;
