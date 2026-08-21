import type { SeoData } from "../types/seo";

type SeoAnalysisProps = {
  seo: SeoData;
  section?: "on-page" | "technical" | "social";
};

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
        <p>Total images: {seo.imageCount}</p>
        <p>Missing alt text: {seo.imagesMissingAlt}</p>
      </article>

      <article>
        <h3>Open Graph</h3>
        <p>
          Title: {seo.ogTitle ? "✓" : "Missing"}
        </p>
        <p>
          Description: {seo.ogDescription ? "✓" : "Missing"}
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
