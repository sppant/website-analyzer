export type InternalLinkData = {
  totalLinks: number;
  internalLinks: number;
  uniqueInternalUrls: number;
  externalLinks: number;

  emptyAnchorLinks: number;
  genericAnchorLinks: number;
  httpInternalLinks: number;
  selfLinks: number;

  internalUrls: string[];

  emptyAnchorDetails: {
    url: string;
    anchor: string;
  }[];

  genericAnchorDetails: {
    url: string;
    anchor: string;
  }[];

  httpInternalDetails: {
    url: string;
    anchor: string;
  }[];

  mostLinkedPages: {
    url: string;
    count: number;
  }[];
};

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

  internalLinks: InternalLinkData;
};

export type SeoIssue = {
  type: string;
  severity: "critical" | "important" | "opportunity";
  title: string;
  description: string;
  recommendation: string;
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
            recommendation:
        "Enable HTTPS for the website and redirect HTTP requests to the HTTPS version.",

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
            recommendation:
        "Add a unique, descriptive <title> element that clearly explains the page topic. Aim for roughly 30–60 characters.",

points: 20,
    });
  } else if (seo.titleLength < 30) {
    issues.push({
      type: "short-title",
      severity: "important",
      title: "Page title is short",
      description:
        "Consider making the title more descriptive and useful for search engines and users.",
            recommendation:
        "Expand the page title to better describe the page and include its primary topic. Aim for roughly 30–60 characters.",

points: 8,
    });
  } else if (seo.titleLength > 60) {
    issues.push({
      type: "long-title",
      severity: "opportunity",
      title: "Page title may be too long",
      description:
        "Consider shortening the title so the most important information is easier to understand.",
            recommendation:
        "Shorten the page title so the most important information appears first. Aim for roughly 30–60 characters.",

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
            recommendation:
        "Add a unique meta description that summarizes the page and encourages users to click from search results. Aim for roughly 70–160 characters.",

points: 10,
    });
  } else if (seo.metaDescriptionLength < 70) {
    issues.push({
      type: "short-meta-description",
      severity: "opportunity",
      title: "Meta description is short",
      description:
        "Consider expanding the description to better explain the page.",
            recommendation:
        "Expand the meta description with useful information about the page while keeping it concise and relevant.",

points: 3,
    });
  } else if (seo.metaDescriptionLength > 160) {
    issues.push({
      type: "long-meta-description",
      severity: "opportunity",
      title: "Meta description may be too long",
      description:
        "Consider shortening the description to keep the most important information visible.",
            recommendation:
        "Shorten the meta description and place the most important information first. Aim for roughly 70–160 characters.",

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
            recommendation:
        "Add one clear H1 heading that describes the main topic or purpose of the page.",

points: 12,
    });
  } else if (seo.h1Count > 1) {
    issues.push({
      type: "multiple-h1",
      severity: "opportunity",
      title: "Multiple H1 headings",
      description:
        "Review the heading structure and make sure there is a clear primary heading.",
            recommendation:
        "Review the heading structure and keep one primary H1 for the main topic, using H2 and H3 headings for supporting sections.",

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
            recommendation:
        "Add a canonical link element pointing to the preferred URL for this page.",

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
            recommendation:
        'Add a lang attribute to the HTML element, such as <html lang="en">, using the appropriate language code.',

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
            recommendation:
        'Add a viewport meta tag such as <meta name="viewport" content="width=device-width, initial-scale=1">.',

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
            recommendation:
        "Add descriptive alt text to meaningful images. Use an empty alt attribute for purely decorative images.",

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
            recommendation:
        "Create a robots.txt file at the website root and use it to provide appropriate crawl instructions to search engines.",

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
            recommendation:
        "Create an XML sitemap containing the important indexable URLs on the website and make it available at a discoverable URL.",

points: 4,
    });
  }

  if (seo.internalLinks.internalLinks === 0) {
    issues.push({
      type: "no-internal-links",
      severity: "important",
      title: "No internal links found",
      description:
        "This page does not contain any links to other pages on the same website.",
      recommendation:
        "Add relevant contextual links to important pages on the website. Use descriptive anchor text that helps users and search engines understand the destination.",
      points: 6,
    });
  }

  if (seo.internalLinks.emptyAnchorLinks > 0) {
    issues.push({
      type: "empty-internal-link-anchors",
      severity: "opportunity",
      title: "Internal links have empty anchor text",
      description:
        `${seo.internalLinks.emptyAnchorLinks} internal link${
          seo.internalLinks.emptyAnchorLinks === 1 ? "" : "s"
        } ${
          seo.internalLinks.emptyAnchorLinks === 1 ? "has" : "have"
        } no visible anchor text.`,
      recommendation:
        "Add descriptive anchor text to internal links so users and search engines can understand what the linked page is about.",
      points: Math.min(
        seo.internalLinks.emptyAnchorLinks,
        3,
      ),
    });
  }

  if (seo.internalLinks.genericAnchorLinks > 0) {
    issues.push({
      type: "generic-internal-link-anchors",
      severity: "opportunity",
      title: "Internal links use generic anchor text",
      description:
        `${seo.internalLinks.genericAnchorLinks} internal link${
          seo.internalLinks.genericAnchorLinks === 1 ? "" : "s"
        } ${
          seo.internalLinks.genericAnchorLinks === 1 ? "uses" : "use"
        } vague anchor text such as "Read more" or "Click here".`,
      recommendation:
        "Replace generic anchor text with descriptive phrases that clearly communicate the topic or destination of the linked page.",
      points: Math.min(
        seo.internalLinks.genericAnchorLinks,
        3,
      ),
    });
  }

  if (seo.internalLinks.httpInternalLinks > 0) {
    issues.push({
      type: "http-internal-links",
      severity: "important",
      title: "Internal links point to HTTP URLs",
      description:
        `${seo.internalLinks.httpInternalLinks} internal link${
          seo.internalLinks.httpInternalLinks === 1 ? "" : "s"
        } ${
          seo.internalLinks.httpInternalLinks === 1 ? "points" : "point"
        } to an HTTP URL instead of HTTPS.`,
      recommendation:
        "Update internal links to use the HTTPS version of the destination URL.",
      points: Math.min(
        seo.internalLinks.httpInternalLinks * 2,
        6,
      ),
    });
  }

  if (!seo.ogTitle) {
    issues.push({
      type: "missing-og-title",
      severity: "opportunity",
      title: "Missing Open Graph title",
      description:
        "Add an Open Graph title to control how the page appears when shared on social platforms.",
            recommendation:
        "Add an og:title meta tag with a clear title for social sharing.",

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
            recommendation:
        "Add an og:description meta tag that summarizes the page for social sharing previews.",

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
            recommendation:
        "Add an og:image meta tag pointing to a suitable image for social sharing previews.",

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
            recommendation:
        "Add an appropriate Twitter/X card meta tag, such as summary_large_image, to improve link previews.",

points: 1,
    });
  }

  if (seo.internalLinks.internalLinks === 0) {
    issues.push({
      type: "no-internal-links",
      severity: "important",
      title: "No internal links found",
      description:
        "This page does not contain any links to other pages on the same website.",
      recommendation:
        "Add relevant contextual internal links to important pages on your website to improve navigation and help search engines discover related content.",
      points: 6,
    });
  } else if (seo.internalLinks.internalLinks < 3) {
    issues.push({
      type: "few-internal-links",
      severity: "opportunity",
      title: "Few internal links found",
      description:
        `Only ${seo.internalLinks.internalLinks} internal ${
          seo.internalLinks.internalLinks === 1 ? "link" : "links"
        } were found on this page.`,
      recommendation:
        "Consider adding more relevant contextual internal links to important pages and related content.",
      points: 3,
    });
  }

  if (seo.internalLinks.emptyAnchorLinks > 0) {
    issues.push({
      type: "empty-internal-link-anchors",
      severity: "opportunity",
      title: "Internal links have empty anchor text",
      description:
        `${seo.internalLinks.emptyAnchorLinks} internal ${
          seo.internalLinks.emptyAnchorLinks === 1 ? "link has" : "links have"
        } empty anchor text.`,
      recommendation:
        "Use descriptive anchor text for meaningful links so users and search engines can better understand the destination.",
      points: Math.min(
        seo.internalLinks.emptyAnchorLinks,
        4,
      ),
    });
  }

  if (seo.internalLinks.genericAnchorLinks > 0) {
    issues.push({
      type: "generic-internal-link-anchors",
      severity: "opportunity",
      title: "Generic internal link anchor text",
      description:
        `${seo.internalLinks.genericAnchorLinks} internal ${
          seo.internalLinks.genericAnchorLinks === 1 ? "link uses" : "links use"
        } generic anchor text such as "read more" or "click here".`,
      recommendation:
        "Replace generic anchor text with concise descriptions that communicate what users will find at the linked page.",
      points: Math.min(
        seo.internalLinks.genericAnchorLinks,
        4,
      ),
    });
  }

  if (seo.internalLinks.httpInternalLinks > 0) {
    issues.push({
      type: "http-internal-links",
      severity: "important",
      title: "Internal links use HTTP",
      description:
        `${seo.internalLinks.httpInternalLinks} internal ${
          seo.internalLinks.httpInternalLinks === 1 ? "link points" : "links point"
        } to an HTTP URL.`,
      recommendation:
        "Update internal links to use the HTTPS version of the destination URL.",
      points: Math.min(
        seo.internalLinks.httpInternalLinks * 2,
        6,
      ),
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
