import { useState } from "react";

import ScoreCard from "../ScoreCard";
import ResultSummary from "../ResultSummary";
import SeoAnalysis from "../SeoAnalysis";
import Opportunities from "../Opportunities";
import ConsultationCTA from "../ConsultationCTA";

import { sortIssues } from "../../utils/seo";

type ResultsDashboardProps = {
  result: {
    url: string;
    score: number;
    issues: Parameters<typeof sortIssues>[0];
    seo: Parameters<typeof SeoAnalysis>[0]["seo"];
  };
};

type Tab =
  | "overview"
  | "on-page"
  | "technical"
  | "social"
  | "opportunities";

function ResultsDashboard({ result }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const sortedIssues = sortIssues(result.issues);

  return (
    <section className="results">
      <ScoreCard score={result.score} />

      <ResultSummary
        url={result.url}
        issues={sortedIssues}
      />

      <nav className="results-tabs" aria-label="SEO results sections">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={activeTab === "on-page" ? "active" : ""}
          onClick={() => setActiveTab("on-page")}
        >
          On-Page SEO
        </button>

        <button
          className={activeTab === "technical" ? "active" : ""}
          onClick={() => setActiveTab("technical")}
        >
          Technical SEO
        </button>

        <button
          className={activeTab === "social" ? "active" : ""}
          onClick={() => setActiveTab("social")}
        >
          Social & Images
        </button>

        <button
          className={activeTab === "opportunities" ? "active" : ""}
          onClick={() => setActiveTab("opportunities")}
        >
          All Opportunities
        </button>
      </nav>

      {activeTab === "overview" && (
        <>
          <Opportunities issues={sortedIssues.slice(0, 3)} />
          <ConsultationCTA />
        </>
      )}

      {activeTab === "on-page" && (
        <SeoAnalysis
          seo={result.seo}
          section="on-page"
        />
      )}

      {activeTab === "technical" && (
        <SeoAnalysis
          seo={result.seo}
          section="technical"
        />
      )}

      {activeTab === "social" && (
        <SeoAnalysis
          seo={result.seo}
          section="social"
        />
      )}

      {activeTab === "opportunities" && (
        <>
          <Opportunities issues={sortedIssues} />
          <ConsultationCTA />
        </>
      )}
    </section>
  );
}

export default ResultsDashboard;
