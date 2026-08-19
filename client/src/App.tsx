import { useState } from "react";
import type { FormEvent } from "react";

import "./App.css";

type SeoData = {
  title: string;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1s: string[];
  canonical: string | null;
  language: string | null;
  viewport: string | null;
  imageCount: number;
  imagesMissingAlt: number;
  https: boolean;
  robotsTxt: boolean;
  robotsTxtHasSitemap: boolean;
  robotsTxtBlocksAll: boolean;
  sitemapXml: boolean;
  sitemapUrlCount: number;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
};

type SeoIssue = {
  type: string;
  severity: "critical" | "important" | "opportunity";
  title: string;
  description: string;
  points: number;
};

type AnalysisResult = {
  url: string;
  statusCode: number;
  seo: SeoData;
  score: number;
  issues: SeoIssue[];
};

function App() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url.trim());

      if (
        !["http:", "https:"].includes(
          parsedUrl.protocol
        )
      ) {
        setError(
          "Please enter a valid HTTP or HTTPS URL."
        );
        return;
      }
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: parsedUrl.href,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function getScoreLabel(score: number) {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs improvement";
    return "Poor";
  }

  function getSeverityLabel(
    severity: SeoIssue["severity"]
  ) {
    if (severity === "critical") {
      return "Critical";
    }

    if (severity === "important") {
      return "Important";
    }

    return "Opportunity";
  }

  function sortIssues(issues: SeoIssue[]) {
    const priority = {
      critical: 0,
      important: 1,
      opportunity: 2,
    };

    return [...issues].sort(
      (a, b) =>
        priority[a.severity] -
        priority[b.severity]
    );
  }

  const sortedIssues = result
    ? sortIssues(result.issues)
    : [];

  const criticalCount = sortedIssues.filter(
    (issue) => issue.severity === "critical"
  ).length;

  const importantCount = sortedIssues.filter(
    (issue) => issue.severity === "important"
  ).length;

  const opportunityCount = sortedIssues.filter(
    (issue) => issue.severity === "opportunity"
  ).length;

  return (
    <main>
      <header>
        <h1>Website SEO Opportunity Analyzer</h1>

        <p>
          Find the biggest opportunities to improve
          your website.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="website-url">
          Website URL
        </label>

        <input
          id="website-url"
          type="text"
          value={url}
          onChange={(event) =>
            setUrl(event.target.value)
          }
          placeholder="https://example.com"
        />

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading
            ? "Analyzing..."
            : "Analyze Website"}
        </button>

        {error && (
          <p role="alert">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section>
          {/* SCORE */}

          <div className="score-card">
            <p>SEO SCORE</p>

            <strong>
              {result.score}
            </strong>

            <span> / 100</span>

            <p>
              {getScoreLabel(result.score)}
            </p>
          </div>

          {/* SUMMARY */}

          <div className="result-summary">
            <div>
              <h2>
                {result.issues.length}{" "}
                {result.issues.length === 1
                  ? "opportunity"
                  : "opportunities"}{" "}
                found
              </h2>

              <p>{result.url}</p>
            </div>

            <div className="severity-summary">
              <span className="severity-count critical">
                {criticalCount} Critical
              </span>

              <span className="severity-count important">
                {importantCount} Important
              </span>

              <span className="severity-count opportunity">
                {opportunityCount} Opportunities
              </span>
            </div>
          </div>

          {/* SEO DATA */}

          <div className="analysis-section">
            <h2>SEO Analysis</h2>

            <article>
              <h3>Page Title</h3>

              <p>
                {result.seo.title ||
                  "Missing"}
              </p>

              <small>
                {result.seo.titleLength} characters
              </small>
            </article>

            <article>
              <h3>Meta Description</h3>

              <p>
                {result.seo.metaDescription ||
                  "Missing"}
              </p>

              <small>
                {result.seo.metaDescriptionLength}{" "}
                characters
              </small>
            </article>

            <article>
              <h3>H1 Headings</h3>

              <p>
                {result.seo.h1Count}
              </p>

              {result.seo.h1s.length > 0 && (
                <ul>
                  {result.seo.h1s.map(
                    (heading, index) => (
                      <li key={index}>
                        {heading}
                      </li>
                    )
                  )}
                </ul>
              )}
            </article>

            <article>
              <h3>Technical SEO</h3>

              <p>
                HTTPS:{" "}
                {result.seo.https
                  ? "✓"
                  : "✕"}
              </p>

              <p>
                Canonical:{" "}
                {result.seo.canonical
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                Language:{" "}
                {result.seo.language ||
                  "Missing"}
              </p>

              <p>
                Viewport:{" "}
                {result.seo.viewport
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                robots.txt:{" "}
                {result.seo.robotsTxt
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                Sitemap:{" "}
                {result.seo.sitemapXml
                  ? "✓"
                  : "Missing"}
              </p>
            </article>

            <article>
              <h3>Images</h3>

              <p>
                Total images:{" "}
                {result.seo.imageCount}
              </p>

              <p>
                Missing alt text:{" "}
                {result.seo.imagesMissingAlt}
              </p>
            </article>

            <article>
              <h3>Social Sharing</h3>

              <p>
                Open Graph title:{" "}
                {result.seo.ogTitle
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                Open Graph description:{" "}
                {result.seo.ogDescription
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                Open Graph image:{" "}
                {result.seo.ogImage
                  ? "✓"
                  : "Missing"}
              </p>

              <p>
                Twitter/X card:{" "}
                {result.seo.twitterCard
                  ? "✓"
                  : "Missing"}
              </p>
            </article>
          </div>

          {/* OPPORTUNITIES */}

          <div className="opportunities-section">
            <h2>Biggest Opportunities</h2>

            {sortedIssues.length === 0 ? (
              <div className="empty-state">
                <strong>
                  No issues found
                </strong>

                <p>
                  This page passed all of the
                  checks currently available.
                </p>
              </div>
            ) : (
              sortedIssues.map((issue) => (
                <article
                  key={issue.type}
                  className={`issue-card ${issue.severity}`}
                >
                  <div className="issue-header">
                    <span
                      className={`severity-badge ${issue.severity}`}
                    >
                      {getSeverityLabel(
                        issue.severity
                      )}
                    </span>

                    <small>
                      -{issue.points} points
                    </small>
                  </div>

                  <h3>
                    {issue.title}
                  </h3>

                  <p>
                    {issue.description}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
