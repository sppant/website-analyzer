import { useState } from "react";
import type { FormEvent } from "react";

import AnalyzerForm from "../components/AnalyzerForm";
import FeatureHighlights from "../components/FeatureHighlights";
import HowItWorks from "../components/HowItWorks";
import ResultsDashboard from "../components/results/ResultsDashboard";

import { useSeoAnalyzer } from "../hooks/useSeoAnalyzer";

function AnalyzerPage() {
  const [url, setUrl] = useState("");

  const { result, error, isLoading, analyze } = useSeoAnalyzer();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    analyze(url);
  }

  return (
    <>
      <header>
        <h1>Website SEO Opportunity Analyzer</h1>

        <p>
          Find the biggest opportunities to improve your website.
        </p>
      </header>

      <div id="analyzer-form">
        <AnalyzerForm
          url={url}
          isLoading={isLoading}
          error={error}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
        />
      </div>

      {!result && (
        <>
          <div id="features">
            <FeatureHighlights />
          </div>

          <div id="how-it-works">
            <HowItWorks />
          </div>
        </>
      )}

      {result && <ResultsDashboard result={result} />}
    </>
  );
}

export default AnalyzerPage;
