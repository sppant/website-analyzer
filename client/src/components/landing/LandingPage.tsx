import type { FormEvent } from "react";

import AnalyzerForm from "../AnalyzerForm";
import FeatureList from "./FeatureList";
import HowItWorks from "./HowItWorks";

type LandingPageProps = {
  url: string;
  isLoading: boolean;
  error: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LandingPage({
  url,
  isLoading,
  error,
  onUrlChange,
  onSubmit,
}: LandingPageProps) {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            SEO Opportunity Analyzer
          </span>

          <h1>
            Find the SEO opportunities
            <br />
            your website is missing.
          </h1>

          <p className="hero-description">
            Analyze your website for technical and on-page SEO
            issues and get a prioritized list of improvements.
          </p>

          <AnalyzerForm
            url={url}
            isLoading={isLoading}
            error={error}
            onUrlChange={onUrlChange}
            onSubmit={onSubmit}
          />

          <FeatureList />
        </div>
      </section>

      <HowItWorks />
    </>
  );
}

export default LandingPage;
