export type SeoData = {
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

export type SeoIssue = {
  type: string;
  severity: "critical" | "important" | "opportunity";
  title: string;
  description: string;
  points: number;
};

export function analyzeSeo(seo: SeoData): SeoIssue[] {
  const issues: SeoIssue[] = [];

  if (!seo.https) {
    issues.push({
      type: "no-https",
      severity: "critical",
      title: "Website is not using HTTPS",
      description:
        "HTTPS is a fundamental security and trust requirement for modern websites.",
      points: 15,
    });
  }

  if (!seo.title) {
    issues.push({
      type: "missing-title",
      severity: "critical",
      title: "Missing page title",
      description:
        "Add a descriptive title that clearly communicates what the page is about.",
      points: 20,
    });
  } else if (seo.titleLength < 30) {
    issues.push({
      type: "short-title",
      severity: "important",
      title: "Page title is short",
      description:
        "Consider making the title more descriptive and useful for search engines and users.",
      points: 8,
    });
  } else if (seo.titleLength > 60) {
    issues.push({
      type: "long-title",
      severity: "opportunity",
      title: "Page title may be too long",
      description:
        "Consider shortening the title so the most important information is easier to understand.",
      points: 4,
    });
  }

  if (!seo.metaDescription) {
    issues.push({
      type: "missing-meta-description",
      severity: "important",
      title: "Missing meta description",
      description:
        "Add a useful meta description that summarizes the page and encourages clicks from search results.",
      points: 10,
    });
  } else if (seo.metaDescriptionLength < 70) {
    issues.push({
      type: "short-meta-description",
      severity: "opportunity",
      title: "Meta description is short",
      description:
        "Consider expanding the description to better explain the page.",
      points: 3,
    });
  } else if (seo.metaDescriptionLength > 160) {
    issues.push({
      type: "long-meta-description",
      severity: "opportunity",
      title: "Meta description may be too long",
      description:
        "Consider shortening the description to keep the most important information visible.",
      points: 3,
    });
  }

  if (seo.h1Count === 0) {
    issues.push({
      type: "missing-h1",
      severity: "critical",
      title: "Missing H1 heading",
      description:
        "Add a clear primary heading that describes the main topic of the page.",
      points: 12,
    });
  } else if (seo.h1Count > 1) {
    issues.push({
      type: "multiple-h1",
      severity: "opportunity",
      title: "Multiple H1 headings",
      description:
        "Review the heading structure and make sure there is a clear primary heading.",
      points: 3,
    });
  }

  if (!seo.canonical) {
    issues.push({
      type: "missing-canonical",
      severity: "important",
      title: "Missing canonical URL",
      description:
        "Consider adding a canonical URL to help search engines understand the preferred version of this page.",
      points: 5,
    });
  }

  if (!seo.language) {
    issues.push({
      type: "missing-language",
      severity: "opportunity",
      title: "Missing language declaration",
      description:
        "Add a language attribute to the HTML element.",
      points: 2,
    });
  }

  if (!seo.viewport) {
    issues.push({
      type: "missing-viewport",
      severity: "important",
      title: "Missing viewport meta tag",
      description:
        "Add a viewport meta tag so the page behaves correctly on mobile devices.",
      points: 6,
    });
  }

  if (seo.imagesMissingAlt > 0) {
    issues.push({
      type: "images-missing-alt",
      severity: "important",
      title: "Images are missing alt text",
      description:
        `${seo.imagesMissingAlt} image${
          seo.imagesMissingAlt === 1 ? "" : "s"
        } ${
          seo.imagesMissingAlt === 1 ? "is" : "are"
        } missing alt text.`,
      points: Math.min(seo.imagesMissingAlt * 2, 8),
    });
  }

  if (!seo.robotsTxt) {
    issues.push({
      type: "missing-robots-txt",
      severity: "opportunity",
      title: "robots.txt not found",
      description:
        "Consider adding a robots.txt file to provide crawl instructions to search engines.",
      points: 2,
    });
  }

  if (!seo.sitemapXml) {
    issues.push({
      type: "missing-sitemap",
      severity: "important",
      title: "XML sitemap not found",
      description:
        "Consider adding an XML sitemap to help search engines discover important pages.",
      points: 4,
    });
  }

  if (!seo.ogTitle) {
    issues.push({
      type: "missing-og-title",
      severity: "opportunity",
      title: "Missing Open Graph title",
      description:
        "Add an Open Graph title to control how the page appears when shared on social platforms.",
      points: 1,
    });
  }

  if (!seo.ogDescription) {
    issues.push({
      type: "missing-og-description",
      severity: "opportunity",
      title: "Missing Open Graph description",
      description:
        "Add an Open Graph description for better social sharing previews.",
      points: 1,
    });
  }

  if (!seo.ogImage) {
    issues.push({
      type: "missing-og-image",
      severity: "opportunity",
      title: "Missing Open Graph image",
      description:
        "Add an Open Graph image to improve the appearance of shared links.",
      points: 1,
    });
  }

  if (!seo.twitterCard) {
    issues.push({
      type: "missing-twitter-card",
      severity: "opportunity",
      title: "Missing Twitter/X card",
      description:
        "Add a Twitter/X card meta tag to control how shared links are displayed.",
      points: 1,
    });
  }

  return issues;
}

export function calculateSeoScore(
  issues: SeoIssue[]
): number {
  const deductions = issues.reduce(
    (total, issue) => total + issue.points,
    0
  );

  return Math.max(0, Math.min(100, 100 - deductions));
}
