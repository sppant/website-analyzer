import type { SeoData } from "../types/seo";

type SeoAnalysisProps = {
  seo: SeoData;
  section?: "on-page" | "technical" | "social";
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

          <p>
            {seo.internalLinks.internalLinks} internal links
          </p>

          <small>
            {seo.internalLinks.uniqueInternalUrls} unique destinations
          </small>

          <small>
            {seo.internalLinks.externalLinks} external links
          </small>

          {seo.internalLinks.genericAnchorDetails.length > 0 && (
            <div>
              <h4>
                Generic anchor text
              </h4>

              <p>
                {seo.internalLinks.genericAnchorLinks}{" "}
                {seo.internalLinks.genericAnchorLinks === 1
                  ? "link uses"
                  : "links use"}{" "}
                vague anchor text.
              </p>

              <ul>
                {seo.internalLinks.genericAnchorDetails.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <strong>
                        {link.anchor || "(empty)"}
                      </strong>
                      {" → "}
                      <span>{formatLinkUrl(link.url)}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {seo.internalLinks.emptyAnchorDetails.length > 0 && (
            <div>
              <h4>
                Empty anchor text
              </h4>

              <p>
                {seo.internalLinks.emptyAnchorLinks}{" "}
                internal{" "}
                {seo.internalLinks.emptyAnchorLinks === 1
                  ? "link has"
                  : "links have"}{" "}
                no visible anchor text.
              </p>

              <ul>
                {seo.internalLinks.emptyAnchorDetails.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <span>{formatLinkUrl(link.url)}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {seo.internalLinks.httpInternalDetails.length > 0 && (
            <div>
              <h4>
                HTTP internal links
              </h4>

              <p>
                These links should use HTTPS.
              </p>

              <ul>
                {seo.internalLinks.httpInternalDetails.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <strong>
                        {link.anchor || "(empty)"}
                      </strong>
                      {" → "}
                      <span>{formatLinkUrl(link.url)}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {seo.internalLinks.mostLinkedPages.length > 0 && (
            <div>
              <h4>
                Most linked pages
              </h4>

              <ul>
                {seo.internalLinks.mostLinkedPages.map(
                  (page) => (
                    <li key={page.url}>
                      <span>{formatLinkUrl(page.url)}</span>
                      {" — "}
                      {page.count}{" "}
                      {page.count === 1
                        ? "link"
                        : "links"}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {seo.internalLinks.selfLinks > 0 && (
            <small>
              {seo.internalLinks.selfLinks} self{" "}
              {seo.internalLinks.selfLinks === 1
                ? "link"
                : "links"}{" "}
              detected.
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
            <small>
              {seo.sitemapUrlCount} URLs discovered
            </small>
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
          {seo.imageCount}{" "}
          {seo.imageCount === 1 ? "image" : "images"} found
        </p>

        {seo.imagesMissingAlt > 0 ? (
          <>
            <p>
              <strong>
                {seo.imagesMissingAlt}{" "}
                {seo.imagesMissingAlt === 1
                  ? "image is"
                  : "images are"}{" "}
                missing alt text.
              </strong>
            </p>

            <ul>
              {seo.imagesMissingAltDetails
                .slice(0, 10)
                .map((image, index) => (
                  <li key={`${image.src}-${index}`}>
                    <span>{formatLinkUrl(image.src)}</span>
                  </li>
                ))}
            </ul>

            {seo.imagesMissingAltDetails.length > 10 && (
              <small>
                Showing the first 10 of{" "}
                {seo.imagesMissingAltDetails.length} affected images.
              </small>
            )}
          </>
        ) : (
          <p>✓ All images have alt text.</p>
        )}
      </article>

      <article>
        <h3>Open Graph</h3>

        <p>
          Title: {seo.ogTitle ? "✓" : "Missing"}
        </p>

        <p>
          Description:{" "}
          {seo.ogDescription ? "✓" : "Missing"}
        </p>

        <p>
          Image: {seo.ogImage ? "✓" : "Missing"}
        </p>
      </article>

      <article>
        <h3>Twitter / X</h3>

        <p>
          Card: {seo.twitterCard ? "✓" : "Missing"}
        </p>

        {seo.twitterCard && (
          <small>{seo.twitterCard}</small>
        )}
      </article>
    </div>
  );
}

export default SeoAnalysis;
