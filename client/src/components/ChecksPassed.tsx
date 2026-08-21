import type { SeoData } from "../types/seo";

type PassedCheck = {
  label: string;
};

type ChecksPassedProps = {
  seo: SeoData;
};

function ChecksPassed({ seo }: ChecksPassedProps) {
  const checks: PassedCheck[] = [];

  if (seo.title.trim()) {
    checks.push({ label: "Page title is present" });
  }

  if (seo.titleLength >= 30 && seo.titleLength <= 60) {
    checks.push({ label: "Page title length is optimized" });
  }

  if (seo.metaDescription?.trim()) {
    checks.push({ label: "Meta description is present" });
  }

  if (
    seo.metaDescriptionLength >= 120 &&
    seo.metaDescriptionLength <= 160
  ) {
    checks.push({ label: "Meta description length is optimized" });
  }

  if (seo.h1Count >= 1) {
    checks.push({ label: "H1 heading is present" });
  }

  if (seo.h1Count === 1) {
    checks.push({ label: "Page has exactly one H1" });
  }

  if (seo.https) {
    checks.push({ label: "HTTPS is enabled" });
  }

  if (seo.canonical?.trim()) {
    checks.push({ label: "Canonical URL is configured" });
  }

  if (seo.language?.trim()) {
    checks.push({ label: "Page language is declared" });
  }

  if (seo.viewport?.trim()) {
    checks.push({ label: "Viewport is configured" });
  }

  if (seo.robotsTxt) {
    checks.push({ label: "robots.txt is present" });
  }

  if (seo.robotsTxt && !seo.robotsTxtBlocksAll) {
    checks.push({ label: "robots.txt is not blocking the site" });
  }

  if (seo.sitemapXml) {
    checks.push({ label: "XML sitemap is present" });
  }

  if (seo.imageCount === 0 || seo.imagesMissingAlt === 0) {
    checks.push({ label: "Images have alt text" });
  }

  if (
    seo.ogTitle &&
    seo.ogDescription &&
    seo.ogImage
  ) {
    checks.push({ label: "Open Graph tags are configured" });
  }

  if (seo.twitterCard?.trim()) {
    checks.push({ label: "Twitter / X card is configured" });
  }

  return (
    <section className="checks-passed">
      <div className="checks-passed-header">
        <div>
          <span className="section-eyebrow">WHAT'S WORKING</span>
          <h2>{checks.length} Checks Passed</h2>
          <p>
            Your website is already getting these SEO fundamentals right.
          </p>
        </div>

        <div className="checks-passed-count" aria-label={`${checks.length} checks passed`}>
          <strong>{checks.length}</strong>
          <span>passed</span>
        </div>
      </div>

      <div className="passed-checks">
        {checks.map((check) => (
          <div className="passed-check" key={check.label}>
            <span className="passed-check-icon" aria-hidden="true">
              ✓
            </span>
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ChecksPassed;
