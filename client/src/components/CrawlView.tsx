import { useState } from "react";

import ResultsDashboard from "./results/ResultsDashboard";
import type { CrawlPage, CrawlResult } from "../types/crawl";

function path(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
}

function PageDetail({ page, onClose }: { page: CrawlPage; onClose: () => void }) {
  if (!page.ok || !page.seo || page.score === null) {
    return (
      <div className="crawl-page-detail">
        <button type="button" className="link-button" onClick={onClose}>
          ← Back to pages
        </button>
        <p className="usage-remaining">
          This page could not be analyzed: {page.error ?? "unknown error"}.
        </p>
      </div>
    );
  }
  return (
    <div className="crawl-page-detail">
      <button type="button" className="link-button" onClick={onClose}>
        ← Back to pages
      </button>
      <ResultsDashboard
        result={{
          url: page.url,
          score: page.score,
          issues: page.issues,
          seo: page.seo,
        }}
      />
    </div>
  );
}

function CrawlView({ result }: { result: CrawlResult }) {
  const [openPage, setOpenPage] = useState<string | null>(null);

  const s = result.summary;
  const opened = openPage
    ? result.pages.find((p) => p.url === openPage)
    : null;

  if (opened) {
    return <PageDetail page={opened} onClose={() => setOpenPage(null)} />;
  }

  const sortedPages = [...result.pages].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );

  return (
    <div className="crawl-view">
      <div className="crawl-health">
        <span className="section-eyebrow">WEBSITE SEO HEALTH</span>
        <strong>{s.websiteScore}</strong>
        <span className="crawl-health-max">/ 100</span>
        <p className="crawl-health-note">
          Average score across {s.pagesAnalyzed} page
          {s.pagesAnalyzed === 1 ? "" : "s"}
          {s.pagesFailed > 0 ? ` · ${s.pagesFailed} failed to load` : ""}
        </p>
      </div>

      <dl className="crawl-stats">
        <div>
          <dt>Pages analyzed</dt>
          <dd>{s.pagesAnalyzed}</dd>
        </div>
        <div>
          <dt>Total issues</dt>
          <dd>{s.totalIssues}</dd>
        </div>
        <div className="crit">
          <dt>Critical</dt>
          <dd>{s.criticalIssues}</dd>
        </div>
        <div className="imp">
          <dt>Important</dt>
          <dd>{s.importantIssues}</dd>
        </div>
        <div>
          <dt>Opportunities</dt>
          <dd>{s.opportunityIssues}</dd>
        </div>
        <div>
          <dt>Broken links</dt>
          <dd>{result.brokenLinks.total}</dd>
        </div>
      </dl>

      {result.pageSpeedRootOnly && (
        <p className="crawl-note">
          Performance / Core Web Vitals data is collected for the homepage only.
        </p>
      )}

      <section className="crawl-section">
        <h3>Pages</h3>
        <div className="crawl-table-wrap">
          <table className="crawl-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Score</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {sortedPages.map((page) => (
                <tr key={page.url}>
                  <td>
                    <button
                      type="button"
                      className="crawl-page-link"
                      onClick={() => setOpenPage(page.url)}
                    >
                      {path(page.url)}
                    </button>
                  </td>
                  <td className="num">
                    {page.ok ? page.score : `— (${page.error ?? "failed"})`}
                  </td>
                  <td className="num">{page.ok ? page.issues.length : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {s.commonIssues.length > 0 && (
        <section className="crawl-section">
          <h3>Most common issues</h3>
          <ul className="crawl-common-issues">
            {s.commonIssues.map((issue) => (
              <li key={issue.type} className={issue.severity}>
                <span>{issue.title}</span>
                <span className="crawl-common-count">
                  {issue.pages} page{issue.pages === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="crawl-section">
        <h3>
          Broken links{" "}
          {result.brokenLinks.total > 0 && (
            <span className="crawl-broken-count">
              {result.brokenLinks.total} found · {result.brokenLinks.internal}{" "}
              internal · {result.brokenLinks.external} external
            </span>
          )}
        </h3>
        {result.brokenLinks.total === 0 ? (
          <p className="usage-remaining">
            No broken links found across {result.brokenLinks.checked} checked
            destinations.
          </p>
        ) : (
          <ul className="broken-links">
            {result.brokenLinks.links.map((link, index) => (
              <li key={`${link.sourceUrl}-${link.targetUrl}-${index}`}>
                <div className="broken-link-row">
                  <div>
                    <span className="broken-link-label">Source</span>
                    <button
                      type="button"
                      className="crawl-page-link"
                      onClick={() => setOpenPage(link.sourceUrl)}
                    >
                      {path(link.sourceUrl)}
                    </button>
                  </div>
                  <div>
                    <span className="broken-link-label">Broken link</span>
                    <code>
                      {link.type === "internal"
                        ? path(link.targetUrl)
                        : link.targetUrl}
                    </code>
                  </div>
                  <div>
                    <span className="broken-link-label">Status</span>
                    <span className="broken-link-status">{link.statusText}</span>
                  </div>
                  {link.anchor && (
                    <div>
                      <span className="broken-link-label">Anchor</span>
                      <span>“{link.anchor}”</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default CrawlView;
