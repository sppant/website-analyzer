import type { SeoData } from "../types/seo";

type SeoAnalysisProps = {
  seo: SeoData;
};

function SeoAnalysis({ seo }: SeoAnalysisProps) {
  return (
    <div className="analysis-section">
      <h2>SEO Analysis</h2>

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
        <p>{seo.h1Count}</p>

        {seo.h1s.length > 0 && (
          <ul>
            {seo.h1s.map((heading, index) => (
              <li key={`${heading}-${index}`}>{heading}</li>
            ))}
          </ul>
        )}
      </article>

      <article>
        <h3>Technical SEO</h3>
        <p>HTTPS: {seo.https ? "✓" : "✕"}</p>
        <p>Canonical: {seo.canonical ? "✓" : "Missing"}</p>
        <p>Language: {seo.language || "Missing"}</p>
        <p>Viewport: {seo.viewport ? "✓" : "Missing"}</p>
        <p>robots.txt: {seo.robotsTxt ? "✓" : "Missing"}</p>
        <p>Sitemap: {seo.sitemapXml ? "✓" : "Missing"}</p>
      </article>

      <article>
        <h3>Images</h3>
        <p>Total images: {seo.imageCount}</p>
        <p>Missing alt text: {seo.imagesMissingAlt}</p>
      </article>

      <article>
        <h3>Social Sharing</h3>
        <p>Open Graph title: {seo.ogTitle ? "✓" : "Missing"}</p>
        <p>
          Open Graph description:{" "}
          {seo.ogDescription ? "✓" : "Missing"}
        </p>
        <p>Open Graph image: {seo.ogImage ? "✓" : "Missing"}</p>
        <p>Twitter/X card: {seo.twitterCard ? "✓" : "Missing"}</p>
      </article>
    </div>
  );
}

export default SeoAnalysis;
