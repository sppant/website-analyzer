import type { SeoData } from "../types/seo";

type SeoAnalysisProps = {
  seo: SeoData;
  section?: "on-page" | "technical" | "social" | "performance";
};

function formatLinkUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

function SeoAnalysis({ seo, section = "on-page" }: SeoAnalysisProps) {
  if (section === "on-page") {
    return (
      <div className="analysis-section">
        <h2>On-Page SEO</h2>

        <article>
          <h3>Page Title</h3>
          <p>{seo.title || "Missing"}</p>
          <small>{seo.titleLength} characters</small>
        </article>

        <article>
          <h3>Meta Description</h3>
          <p>{seo.metaDescription || "Missing"}</p>
          <small>{seo.metaDescriptionLength} characters</small>
        </article>

        <article>
          <h3>H1 Headings</h3>
          <p>{seo.h1Count} found</p>

          {seo.h1s.length > 0 && (
            <ul>
              {seo.h1s.map((heading, index) => (
                <li key={`${heading}-${index}`}>{heading}</li>
              ))}
            </ul>
          )}
        </article>

        <article>
          <h3>Internal Linking</h3>

          <p>{seo.internalLinks.internalLinks} internal links</p>

          <small>
            {seo.internalLinks.uniqueInternalUrls} unique destinations
          </small>

          <small>{seo.internalLinks.externalLinks} external links</small>

          {seo.internalLinks.genericAnchorDetails.length > 0 && (
            <div>
              <h4>Generic anchor text</h4>

              <p>
                {seo.internalLinks.genericAnchorLinks}{" "}
                {seo.internalLinks.genericAnchorLinks === 1
                  ? "link uses"
                  : "links use"}{" "}
                vague anchor text.
              </p>

              <ul>
                {seo.internalLinks.genericAnchorDetails.map((link, index) => (
                  <li key={`${link.url}-${index}`}>
                    <strong>{link.anchor || "(empty)"}</strong>
                    {" → "}
                    <span>{formatLinkUrl(link.url)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seo.internalLinks.emptyAnchorDetails.length > 0 && (
            <div>
              <h4>Empty anchor text</h4>

              <p>
                {seo.internalLinks.emptyAnchorLinks} internal{" "}
                {seo.internalLinks.emptyAnchorLinks === 1
                  ? "link has"
                  : "links have"}{" "}
                no visible anchor text.
              </p>

              <ul>
                {seo.internalLinks.emptyAnchorDetails.map((link, index) => (
                  <li key={`${link.url}-${index}`}>
                    <span>{formatLinkUrl(link.url)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seo.internalLinks.httpInternalDetails.length > 0 && (
            <div>
              <h4>HTTP internal links</h4>

              <p>These links should use HTTPS.</p>

              <ul>
                {seo.internalLinks.httpInternalDetails.map((link, index) => (
                  <li key={`${link.url}-${index}`}>
                    <strong>{link.anchor || "(empty)"}</strong>
                    {" → "}
                    <span>{formatLinkUrl(link.url)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seo.internalLinks.mostLinkedPages.length > 0 && (
            <div>
              <h4>Most linked pages</h4>

              <ul>
                {seo.internalLinks.mostLinkedPages.map((page) => (
                  <li key={page.url}>
                    <span>{formatLinkUrl(page.url)}</span>
                    {" — "}
                    {page.count} {page.count === 1 ? "link" : "links"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seo.internalLinks.selfLinks > 0 && (
            <small>
              {seo.internalLinks.selfLinks} self{" "}
              {seo.internalLinks.selfLinks === 1 ? "link" : "links"} detected.
            </small>
          )}
        </article>
      </div>
    );
  }

  if (section === "technical") {
    return (
      <div className="analysis-section">
        <h2>Technical SEO</h2>

        <article>
          <h3>HTTPS</h3>
          <p>{seo.https ? "✓ Enabled" : "✕ Not enabled"}</p>
        </article>

        <article>
          <h3>Canonical URL</h3>
          <p>{seo.canonical || "Missing"}</p>
        </article>

        <article>
          <h3>Language</h3>
          <p>{seo.language || "Missing"}</p>
        </article>

        <article>
          <h3>Viewport</h3>
          <p>{seo.viewport ? "✓ Configured" : "Missing"}</p>
        </article>

        <article>
          <h3>robots.txt</h3>
          <p>{seo.robotsTxt ? "✓ Found" : "Missing"}</p>

          {seo.robotsTxt && (
            <small>
              {seo.robotsTxtBlocksAll
                ? "Warning: broad blocking detected"
                : seo.robotsTxtHasSitemap
                  ? "Sitemap reference found"
                  : "No sitemap reference found"}
            </small>
          )}
        </article>

        <article>
          <h3>XML Sitemap</h3>
          <p>{seo.sitemapXml ? "✓ Found" : "Missing"}</p>

          {seo.sitemapXml && (
            <small>{seo.sitemapUrlCount} URLs discovered</small>
          )}
        </article>
      </div>
    );
  }

  if (section === "performance") {
    return (
      <div className="analysis-section performance-analysis">
        <h2>Page Performance</h2>
        <article className="page-speed-section">
          <h3>Performance</h3>

          {seo.pageSpeed ? (
            <>
              {(() => {
                const ps = seo.pageSpeed;
                const score = ps.performanceScore;

                const getScoreStatus = (value: number | null) => {
                  if (value === null) return "Not available";
                  if (value >= 90) return "Good";
                  if (value >= 50) return "Needs improvement";
                  return "Poor";
                };

                const getMetricStatus = (
                  value: number | null,
                  good: number,
                  warning: number,
                ) => {
                  if (value === null) return "Not available";
                  if (value <= good) return "Good";
                  if (value <= warning) return "Needs improvement";
                  return "Poor";
                };

                const getStatusClass = (status: string) => {
                  return status.toLowerCase().replace(/\s+/g, "-");
                };

                const formatMs = (value: number | null) => {
                  if (value === null) return "—";
                  return `${Math.round(value)} ms`;
                };

                const formatSeconds = (value: number | null) => {
                  if (value === null) return "—";
                  return `${(value / 1000).toFixed(2)}s`;
                };

                const formatCls = (value: number | null) => {
                  if (value === null) return "—";
                  return value.toFixed(3);
                };

                const scoreStatus = getScoreStatus(score);

                const lcpStatus = getMetricStatus(ps.lcp, 2500, 4000);

                const clsStatus = getMetricStatus(ps.cls, 0.1, 0.25);

                const inpStatus = getMetricStatus(ps.inp, 200, 500);

                const fcpStatus = getMetricStatus(ps.fcp, 1800, 3000);

                const ttfbStatus = getMetricStatus(ps.ttfb, 800, 1800);

                const scoreWidth =
                  score === null ? 0 : Math.min(Math.max(score, 0), 100);

                const metricBarWidth = (value: number | null, max: number) => {
                  if (value === null) return 0;

                  return Math.min(Math.max((value / max) * 100, 2), 100);
                };

                return (
                  <>
                    <div className="performance-summary">
                      <div className="performance-score">
                        <div
                          className="performance-score-ring"
                          style={{
                            background: `conic-gradient(
                            currentColor ${scoreWidth * 3.6}deg,
                            #e5e7eb ${scoreWidth * 3.6}deg
                          )`,
                          }}
                        >
                          <div className="performance-score-inner">
                            <strong>{score ?? "—"}</strong>
                            <span>/ 100</span>
                          </div>
                        </div>

                        <div>
                          <strong>Performance Score</strong>
                          <span
                            className={`metric-status ${getStatusClass(
                              scoreStatus,
                            )}`}
                          >
                            {scoreStatus}
                          </span>
                        </div>
                      </div>

                      <div className="performance-summary-text">
                        {score === null ? (
                          <p>
                            Performance data was not available for this
                            analysis.
                          </p>
                        ) : clsStatus === "Poor" ? (
                          <p>
                            Your site loads relatively quickly, but
                            <strong>
                              {" "}
                              layout stability is the main performance problem
                            </strong>
                            .
                          </p>
                        ) : score >= 90 ? (
                          <p>
                            Your site shows strong overall performance. Keep
                            monitoring Core Web Vitals as the site changes.
                          </p>
                        ) : (
                          <p>
                            Your site has some performance opportunities that
                            could improve loading speed and user experience.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="performance-metrics">
                      <h4>Core Web Vitals</h4>

                      <div className="performance-metric-grid">
                        <div
                          className={`performance-metric-card ${getStatusClass(lcpStatus)}`}
                        >
                          <span className="metric-label">LCP</span>
                          <strong>{formatSeconds(ps.lcp)}</strong>
                          <span className="metric-status">{lcpStatus}</span>
                          <small>Target: &lt; 2.5s</small>
                        </div>

                        <div
                          className={`performance-metric-card ${getStatusClass(clsStatus)}`}
                        >
                          <span className="metric-label">CLS</span>
                          <strong>{formatCls(ps.cls)}</strong>
                          <span className="metric-status">{clsStatus}</span>
                          <small>Target: &lt; 0.10</small>
                        </div>

                        <div
                          className={`performance-metric-card ${getStatusClass(inpStatus)}`}
                        >
                          <span className="metric-label">INP</span>
                          <strong>{formatMs(ps.inp)}</strong>
                          <span className="metric-status">{inpStatus}</span>
                          <small>Target: &lt; 200ms</small>
                        </div>
                      </div>
                    </div>

                    <div className="performance-metrics">
                      <h4>Loading Performance</h4>

                      <div className="performance-bars">
                        <div className="performance-bar-row">
                          <div className="performance-bar-header">
                            <span>LCP</span>
                            <strong>{formatSeconds(ps.lcp)}</strong>
                          </div>

                          <div className="performance-bar-track">
                            <div
                              className={`performance-bar ${getStatusClass(lcpStatus)}`}
                              style={{
                                width: `${metricBarWidth(ps.lcp, 5000)}%`,
                              }}
                            />
                          </div>

                          <small>
                            Good: &lt; 2.5s · Needs improvement: 2.5–4s · Poor:
                            &gt; 4s
                          </small>
                        </div>

                        <div className="performance-bar-row">
                          <div className="performance-bar-header">
                            <span>FCP</span>
                            <strong>{formatMs(ps.fcp)}</strong>
                          </div>

                          <div className="performance-bar-track">
                            <div
                              className={`performance-bar ${getStatusClass(fcpStatus)}`}
                              style={{
                                width: `${metricBarWidth(ps.fcp, 3600)}%`,
                              }}
                            />
                          </div>

                          <small>
                            Good: &lt; 1.8s · Needs improvement: 1.8–3s · Poor:
                            &gt; 3s
                          </small>
                        </div>

                        <div className="performance-bar-row">
                          <div className="performance-bar-header">
                            <span>TTFB</span>
                            <strong>{formatMs(ps.ttfb)}</strong>
                          </div>

                          <div className="performance-bar-track">
                            <div
                              className={`performance-bar ${getStatusClass(ttfbStatus)}`}
                              style={{
                                width: `${metricBarWidth(ps.ttfb, 2400)}%`,
                              }}
                            />
                          </div>

                          <small>
                            Good: &lt; 800ms · Needs improvement: 800ms–1.8s ·
                            Poor: &gt; 1.8s
                          </small>
                        </div>

                        <div className="performance-bar-row">
                          <div className="performance-bar-header">
                            <span>CLS</span>
                            <strong>{formatCls(ps.cls)}</strong>
                          </div>

                          <div className="performance-bar-track">
                            <div
                              className={`performance-bar ${getStatusClass(clsStatus)}`}
                              style={{
                                width: `${metricBarWidth(ps.cls, 0.5)}%`,
                              }}
                            />
                          </div>

                          <small>
                            Good: &lt; 0.10 · Needs improvement: 0.10–0.25 ·
                            Poor: &gt; 0.25
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="performance-attention">
                      <h4>What needs attention?</h4>

                      {clsStatus === "Poor" && (
                        <div className="performance-warning">
                          <strong>CLS is too high</strong>

                          <p>
                            Your page may visibly shift while loading. A CLS of{" "}
                            <strong>{formatCls(ps.cls)}</strong> is above
                            Google's recommended target of 0.10.
                          </p>

                          <small>
                            Common causes include images without fixed
                            dimensions, dynamically injected content, web fonts,
                            ads, and embedded content.
                          </small>
                        </div>
                      )}

                      {lcpStatus === "Poor" && (
                        <div className="performance-warning">
                          <strong>LCP is too slow</strong>

                          <p>
                            The main content is taking too long to become
                            visible. Aim for an LCP below 2.5 seconds.
                          </p>
                        </div>
                      )}

                      {fcpStatus === "Poor" && (
                        <div className="performance-warning">
                          <strong>First content is appearing slowly</strong>

                          <p>
                            FCP measures how quickly the first visible content
                            appears. Reducing render-blocking resources can
                            help.
                          </p>
                        </div>
                      )}

                      {ttfbStatus === "Poor" && (
                        <div className="performance-warning">
                          <strong>Server response time is high</strong>

                          <p>
                            Your server is taking a relatively long time to
                            begin responding. Check hosting, server-side
                            processing, caching, and CDN configuration.
                          </p>
                        </div>
                      )}

                      {inpStatus === "Not available" && (
                        <div className="performance-info">
                          <strong>INP was not available</strong>

                          <p>
                            PageSpeed did not return an INP value for this test.
                            This does not necessarily mean that your site has
                            poor interaction performance.
                          </p>
                        </div>
                      )}

                      {clsStatus !== "Poor" &&
                        lcpStatus !== "Poor" &&
                        fcpStatus !== "Poor" &&
                        ttfbStatus !== "Poor" &&
                        inpStatus !== "Not available" && (
                          <div className="performance-success">
                            <strong>
                              No major performance issues detected.
                            </strong>

                            <p>
                              Your reported loading and Core Web Vitals metrics
                              are within their recommended ranges.
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="performance-actions">
                      <h4>Recommended actions</h4>

                      <ol>
                        {clsStatus === "Poor" && (
                          <>
                            <li>
                              Set explicit width and height attributes on images
                              and other media.
                            </li>
                            <li>
                              Reserve space for dynamically loaded content such
                              as ads, embeds, and banners.
                            </li>
                            <li>Check web font loading for layout shifts.</li>
                          </>
                        )}

                        {lcpStatus === "Poor" && (
                          <li>
                            Optimize the largest above-the-fold element,
                            especially hero images and large text blocks.
                          </li>
                        )}

                        {fcpStatus === "Poor" && (
                          <li>
                            Reduce render-blocking CSS and JavaScript and
                            prioritize critical content.
                          </li>
                        )}

                        {ttfbStatus === "Poor" && (
                          <li>
                            Improve server-side caching, hosting performance,
                            and CDN configuration.
                          </li>
                        )}

                        {clsStatus !== "Poor" &&
                          lcpStatus !== "Poor" &&
                          fcpStatus !== "Poor" &&
                          ttfbStatus !== "Poor" && (
                            <li>
                              Continue monitoring performance as new content and
                              features are added.
                            </li>
                          )}
                      </ol>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <p>Performance data unavailable.</p>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="analysis-section">
      <h2>Social & Images</h2>

      <article>
        <h3>Images</h3>

        <p>
          {seo.imageCount} {seo.imageCount === 1 ? "image" : "images"} found
        </p>

        {seo.imagesMissingAlt > 0 ? (
          <>
            <p>
              <strong>
                {seo.imagesMissingAlt}{" "}
                {seo.imagesMissingAlt === 1 ? "image is" : "images are"} missing
                alt text.
              </strong>
            </p>

            <ul>
              {seo.imagesMissingAltDetails.slice(0, 10).map((image, index) => (
                <li key={`${image.src}-${index}`}>
                  <span>{formatLinkUrl(image.src)}</span>
                </li>
              ))}
            </ul>

            {seo.imagesMissingAltDetails.length > 10 && (
              <small>
                Showing the first 10 of {seo.imagesMissingAltDetails.length}{" "}
                affected images.
              </small>
            )}
          </>
        ) : (
          <p>✓ All images have alt text.</p>
        )}
      </article>

      <article>
        <h3>Open Graph</h3>

        <p>Title: {seo.ogTitle ? "✓" : "Missing"}</p>

        <p>Description: {seo.ogDescription ? "✓" : "Missing"}</p>

        <p>Image: {seo.ogImage ? "✓" : "Missing"}</p>
      </article>

      <article>
        <h3>Twitter / X</h3>

        <p>Card: {seo.twitterCard ? "✓" : "Missing"}</p>

        {seo.twitterCard && <small>{seo.twitterCard}</small>}
      </article>
    </div>
  );
}

export default SeoAnalysis;
