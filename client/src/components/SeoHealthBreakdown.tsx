import type { SeoData } from "../types/seo";

type SeoHealthBreakdownProps = {
  seo: SeoData;
};

type Category = {
  name: string;
  checks: boolean[];
};

function SeoHealthBreakdown({ seo }: SeoHealthBreakdownProps) {
  const categories: Category[] = [
    {
      name: "Technical",
      checks: [
        seo.https,
        Boolean(seo.canonical),
        Boolean(seo.viewport),
        Boolean(seo.language),
      ],
    },
    {
      name: "On-Page",
      checks: [
        Boolean(seo.title),
        seo.titleLength >= 30 && seo.titleLength <= 60,
        Boolean(seo.metaDescription),
        seo.metaDescriptionLength >= 70 &&
          seo.metaDescriptionLength <= 160,
        seo.h1Count === 1,
        seo.imagesMissingAlt === 0,
      ],
    },
    {
      name: "Crawlability",
      checks: [
        seo.robotsTxt,
        !seo.robotsTxtBlocksAll,
        seo.sitemapXml,
        seo.robotsTxtHasSitemap,
      ],
    },
    {
      name: "Social",
      checks: [
        Boolean(seo.ogTitle),
        Boolean(seo.ogDescription),
        Boolean(seo.ogImage),
        Boolean(seo.twitterCard),
      ],
    },
  ];

  return (
    <div className="seo-health">
      <div className="seo-health-header">
        <div>
          <span className="seo-health-label">SEO OVERVIEW</span>
          <h2>SEO Health Breakdown</h2>
        </div>

        <span className="seo-health-description">
          How your page performs across key areas
        </span>
      </div>

      <div className="seo-health-grid">
        {categories.map((category) => {
          const passed = category.checks.filter(Boolean).length;
          const percentage = Math.round(
            (passed / category.checks.length) * 100
          );

          return (
            <div className="seo-health-item" key={category.name}>
              <div className="seo-health-item-header">
                <span>{category.name}</span>
                <strong>{percentage}%</strong>
              </div>

              <div className="seo-health-bar">
                <div
                  className="seo-health-bar-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <small>
                {passed} of {category.checks.length} checks passed
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SeoHealthBreakdown;
