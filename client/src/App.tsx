import { useState } from "react";
import type { FormEvent } from "react";

import "./App.css";

import AnalyzerForm from "./components/AnalyzerForm";
import FeatureHighlights from "./components/FeatureHighlights";
import HowItWorks from "./components/HowItWorks";
import ResultsDashboard from "./components/results/ResultsDashboard";

import { useSeoAnalyzer } from "./hooks/useSeoAnalyzer";

function App() {
  const [url, setUrl] = useState("");

  const { result, error, isLoading, analyze } = useSeoAnalyzer();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    analyze(url);
  }

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

      {result && <ResultsDashboard result={result} />}
    </main>
  );
}

export default App;
