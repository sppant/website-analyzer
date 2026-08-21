import type { SeoData } from "../types/seo";

type GoogleSearchPreviewProps = {
  url: string;
  seo: SeoData;
};

function GoogleSearchPreview({ url, seo }: GoogleSearchPreviewProps) {
  const title = seo.title || "Your page title will appear here";
  const description =
    seo.metaDescription ||
    "Your meta description will appear here. Add a meta description to control how your page may appear in search results.";

  let displayUrl = url;

  try {
    const parsedUrl = new URL(url);
    displayUrl = `${parsedUrl.hostname}${parsedUrl.pathname}`;
  } catch {
    // Keep the original URL if parsing fails.
  }

  return (
    <div className="google-preview">
      <div className="google-preview-header">
        <div>
          <span className="google-preview-label">SEARCH PREVIEW</span>
          <h2>Google Search Preview</h2>
        </div>

        <span className="google-preview-note">
          Approximate appearance in search results
        </span>
      </div>

      <div className="google-result">
        <div className="google-result-site">
          <div className="google-site-icon">
            {displayUrl.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="google-site-name">
              {(() => {
                try {
                  return new URL(url).hostname;
                } catch {
                  return url;
                }
              })()}
            </div>

            <div className="google-site-url">
              {displayUrl}
            </div>
          </div>
        </div>

        <h3 className="google-result-title">{title}</h3>

        <p className="google-result-description">{description}</p>
      </div>

      <div className="google-preview-stats">
        <div className="google-preview-stat">
          <span>Title</span>

          <strong
            className={
              seo.titleLength >= 30 && seo.titleLength <= 60
                ? "good"
                : "warning"
            }
          >
            {seo.titleLength} / 60
          </strong>
        </div>

        <div className="google-preview-stat">
          <span>Meta description</span>

          <strong
            className={
              seo.metaDescriptionLength >= 70 &&
              seo.metaDescriptionLength <= 160
                ? "good"
                : "warning"
            }
          >
            {seo.metaDescriptionLength} / 160
          </strong>
        </div>
      </div>
    </div>
  );
}

export default GoogleSearchPreview;
