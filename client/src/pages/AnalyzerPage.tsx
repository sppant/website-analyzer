import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AnalyzerForm from "../components/AnalyzerForm";
import FeatureHighlights from "../components/FeatureHighlights";
import HowItWorks from "../components/HowItWorks";
import ProductPreview from "../components/ProductPreview";
import BusinessBenefits from "../components/BusinessBenefits";
import FAQ from "../components/FAQ";
import FAQSchema from "../components/FAQSchema";
import BottomCTA from "../components/BottomCTA";
import ResultsDashboard from "../components/results/ResultsDashboard";
import AnalysisLoader from "../components/AnalysisLoader";
import UpgradeButton from "../components/UpgradeButton";
import SaveAnalysisCTA from "../components/SaveAnalysisCTA";
import Seo from "../components/Seo";

import { useSeoAnalyzer } from "../hooks/useSeoAnalyzer";
import { useUsage } from "../hooks/useUsage";
import { useAuth } from "../auth/AuthContext";

function AnalyzerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillUrl = searchParams.get("url") ?? "";

  const [url, setUrl] = useState(prefillUrl);

  const { status } = useAuth();
  const { usage, refresh: refreshUsage } = useUsage();
  const { result, error, limitReached, isLoading, analyze } = useSeoAnalyzer({
    onSuccess: refreshUsage,
    onLimitReached: refreshUsage,
  });

  // The marketing site (web/) hands off here with `?url=` prefilled — run that
  // analysis once on load, then strip the param so a refresh doesn't repeat it.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !prefillUrl) return;
    autoRan.current = true;
    analyze(prefillUrl);
    setSearchParams({}, { replace: true });
  }, [prefillUrl, analyze, setSearchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    analyze(url);
  }

  const isAuthed = status === "authenticated";
  const plan = usage?.plan ?? "free";

  return (
    <>
      <Seo
        title="SEO Analyzer Tool | SEO Opportunity Analyzer"
        description="Run a free SEO analysis of any page. Check titles, meta descriptions, headings, technical SEO, Core Web Vitals and social tags, then get a prioritized list of fixes."
        path="/"
        noindex
      />

      <header>
        <h1>Free Website SEO Analyzer</h1>

        <p>
          Analyze any website's SEO in seconds. The SEO Opportunity Analyzer
          checks on-page, technical and social signals — page titles, meta
          descriptions, headings, canonical tags, robots.txt, sitemaps, Core
          Web Vitals and more — then ranks the opportunities worth fixing
          first. Free, no account needed.
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

        {isAuthed && usage && !limitReached && (
          <p className="usage-hint">
            {usage.remaining} of {usage.limit} analyses left this month.{" "}
            <Link to="/dashboard">View history</Link>
          </p>
        )}
      </div>

      {limitReached && usage && (
        <div className="limit-notice">
          {plan === "pro" ? (
            <p>
              You've used all {usage.limit} Pro analyses this month. Your quota
              resets on{" "}
              {new Date(usage.resetsAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
              .
            </p>
          ) : (
            <>
              <p>
                You've used all {usage.limit} free analyses this month. Upgrade
                to Pro for 50 analyses/month, saved history, score tracking and
                up to 10 projects.
              </p>
              <UpgradeButton label="Upgrade to Pro — $9/month" />
            </>
          )}
        </div>
      )}

      {isLoading && <AnalysisLoader />}

      {!result && !isLoading && !limitReached && (
        <>
          <ProductPreview />

          <BusinessBenefits />

          <div id="features">
            <FeatureHighlights />
          </div>

          <div id="how-it-works">
            <HowItWorks />
          </div>

          <FAQ />
          <FAQSchema />

          <BottomCTA />
        </>
      )}

      {result && !isLoading && (
        <>
          <ResultsDashboard
            result={result}
            onReanalyze={() => analyze(result.url)}
            isLoading={isLoading}
          />
          <SaveAnalysisCTA url={result.url} />
        </>
      )}
    </>
  );
}

export default AnalyzerPage;
