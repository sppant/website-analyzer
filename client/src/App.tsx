import { useState } from "react";
import type { FormEvent } from "react";

import "./App.css";

import AnalyzerForm from "./components/AnalyzerForm";
import FeatureHighlights from "./components/FeatureHighlights";
import HowItWorks from "./components/HowItWorks";
import ScoreCard from "./components/ScoreCard";
import ResultSummary from "./components/ResultSummary";
import SeoAnalysis from "./components/SeoAnalysis";
import Opportunities from "./components/Opportunities";
import TopFixes from "./components/TopFixes";
import SeoHealthBreakdown from "./components/SeoHealthBreakdown";
import GoogleSearchPreview from "./components/GoogleSearchPreview";

import { useSeoAnalyzer } from "./hooks/useSeoAnalyzer";
import { sortIssues } from "./utils/seo";

function App() {
  const [url, setUrl] = useState("");

  const { result, error, isLoading, analyze } = useSeoAnalyzer();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    analyze(url);
  }

  const sortedIssues = result ? sortIssues(result.issues) : [];

  return (
    <main>
      <header>
        <h1>Website SEO Opportunity Analyzer</h1>

        <p>
          Find the biggest opportunities to improve your website.
        </p>
      </header>

      <AnalyzerForm
        url={url}
        isLoading={isLoading}
        error={error}
        onUrlChange={setUrl}
        onSubmit={handleSubmit}
      />

      {!result && (
        <>
          <FeatureHighlights />

          <HowItWorks />
        </>
      )}

      {result && (
        <section>
          <ScoreCard score={result.score} />

          <TopFixes issues={sortedIssues} />

          <SeoHealthBreakdown seo={result.seo} />

          <GoogleSearchPreview url={result.url} seo={result.seo} />

          <ResultSummary url={result.url} issues={sortedIssues} />

          <SeoAnalysis seo={result.seo} />

          <Opportunities issues={sortedIssues} />
        </section>
      )}
    </main>
  );
}

export default App;
