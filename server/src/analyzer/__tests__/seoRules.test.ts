import { describe, expect, it } from "vitest";

import {
  analyzeSeo,
  calculateSeoScore,
  type SeoData,
} from "../seoRules.js";

function createSeoData(
  overrides: Partial<SeoData> = {},
): SeoData {
  return {
    title: "A Good SEO Title That Is Long Enough",
    titleLength: 38,

    metaDescription:
      "A useful meta description that explains what this page is about.",
    metaDescriptionLength: 120,

    h1Count: 1,
    h1s: ["Main Heading"],

    canonical: "https://example.com/",
    language: "en",
    viewport: "width=device-width, initial-scale=1",

    imageCount: 5,
    imagesMissingAlt: 0,

    https: true,

    robotsTxt: true,
    robotsTxtHasSitemap: true,
    robotsTxtBlocksAll: false,

    sitemapXml: true,
    sitemapUrlCount: 10,

    ogTitle: "Example Website",
    ogDescription: "Example description",
    ogImage: "https://example.com/image.jpg",

    twitterCard: "summary_large_image",

    internalLinks: {
      totalLinks: 10,
      internalLinks: 8,
      uniqueInternalUrls: 6,
      externalLinks: 2,

      emptyAnchorLinks: 0,
      genericAnchorLinks: 0,
      httpInternalLinks: 0,
      selfLinks: 0,

      internalUrls: [
        "https://example.com/",
        "https://example.com/about",
        "https://example.com/contact",
        "https://example.com/services",
        "https://example.com/blog",
        "https://example.com/pricing",
      ],

      emptyAnchorDetails: [],
      genericAnchorDetails: [],
      httpInternalDetails: [],

      mostLinkedPages: [],
    },

    ...overrides,
  };
}

describe("analyzeSeo", () => {
  it("returns no issues for a well-optimized page", () => {
    const issues = analyzeSeo(createSeoData());

    expect(issues).toHaveLength(0);
  });

  it("detects a missing title", () => {
    const issues = analyzeSeo(
      createSeoData({
        title: "",
        titleLength: 0,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-title",
        severity: "critical",
        points: 20,
      }),
    );
  });

  it("detects a short title", () => {
    const issues = analyzeSeo(
      createSeoData({
        title: "Short title",
        titleLength: 11,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "short-title",
        severity: "important",
        points: 8,
      }),
    );
  });

  it("detects a long title", () => {
    const issues = analyzeSeo(
      createSeoData({
        title: "A".repeat(61),
        titleLength: 61,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "long-title",
        severity: "opportunity",
        points: 4,
      }),
    );
  });

  it("detects a missing meta description", () => {
    const issues = analyzeSeo(
      createSeoData({
        metaDescription: null,
        metaDescriptionLength: 0,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-meta-description",
        severity: "important",
        points: 10,
      }),
    );
  });

  it("detects a missing H1", () => {
    const issues = analyzeSeo(
      createSeoData({
        h1Count: 0,
        h1s: [],
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-h1",
        severity: "critical",
        points: 12,
      }),
    );
  });

  it("detects multiple H1 headings", () => {
    const issues = analyzeSeo(
      createSeoData({
        h1Count: 2,
        h1s: ["Heading 1", "Heading 2"],
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "multiple-h1",
        severity: "opportunity",
        points: 3,
      }),
    );
  });

  it("detects missing canonical URL", () => {
    const issues = analyzeSeo(
      createSeoData({
        canonical: null,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-canonical",
        severity: "important",
        points: 5,
      }),
    );
  });

  it("detects images missing alt text", () => {
    const issues = analyzeSeo(
      createSeoData({
        imageCount: 5,
        imagesMissingAlt: 3,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "images-missing-alt",
        severity: "important",
        points: 6,
      }),
    );
  });

  it("detects missing robots.txt", () => {
    const issues = analyzeSeo(
      createSeoData({
        robotsTxt: false,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-robots-txt",
        severity: "opportunity",
        points: 2,
      }),
    );
  });

  it("detects a missing XML sitemap", () => {
    const issues = analyzeSeo(
      createSeoData({
        sitemapXml: false,
        sitemapUrlCount: 0,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-sitemap",
        severity: "important",
        points: 4,
      }),
    );
  });

  it("detects missing Open Graph metadata", () => {
    const issues = analyzeSeo(
      createSeoData({
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing-og-title",
        }),
        expect.objectContaining({
          type: "missing-og-description",
        }),
        expect.objectContaining({
          type: "missing-og-image",
        }),
      ]),
    );
  });

  it("detects missing Twitter/X card", () => {
    const issues = analyzeSeo(
      createSeoData({
        twitterCard: null,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "missing-twitter-card",
        severity: "opportunity",
        points: 1,
      }),
    );
  });

  it("detects pages with no internal links", () => {
    const issues = analyzeSeo(
      createSeoData({
        internalLinks: {
          totalLinks: 2,
          internalLinks: 0,
          uniqueInternalUrls: 0,
          externalLinks: 2,
          emptyAnchorLinks: 0,
          genericAnchorLinks: 0,
          httpInternalLinks: 0,
          selfLinks: 0,
          internalUrls: [],
          emptyAnchorDetails: [],
          genericAnchorDetails: [],
          httpInternalDetails: [],
          mostLinkedPages: [],
        },
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "no-internal-links",
        severity: "important",
        points: 6,
      }),
    );
  });

  it("detects empty internal link anchors", () => {
    const issues = analyzeSeo(
      createSeoData({
        internalLinks: {
          totalLinks: 5,
          internalLinks: 5,
          uniqueInternalUrls: 3,
          externalLinks: 0,
          emptyAnchorLinks: 2,
          genericAnchorLinks: 0,
          httpInternalLinks: 0,
          selfLinks: 0,
          internalUrls: [],
          emptyAnchorDetails: [],
          genericAnchorDetails: [],
          httpInternalDetails: [],
          mostLinkedPages: [],
        },
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "empty-internal-link-anchors",
        severity: "opportunity",
        points: 2,
      }),
    );
  });

  it("detects generic internal link anchors", () => {
    const issues = analyzeSeo(
      createSeoData({
        internalLinks: {
          totalLinks: 5,
          internalLinks: 5,
          uniqueInternalUrls: 3,
          externalLinks: 0,
          emptyAnchorLinks: 0,
          genericAnchorLinks: 4,
          httpInternalLinks: 0,
          selfLinks: 0,
          internalUrls: [],
          emptyAnchorDetails: [],
          genericAnchorDetails: [],
          httpInternalDetails: [],
          mostLinkedPages: [],
        },
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "generic-internal-link-anchors",
        severity: "opportunity",
        points: 3,
      }),
    );
  });

  it("detects non-HTTPS websites", () => {
    const issues = analyzeSeo(
      createSeoData({
        https: false,
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "no-https",
        severity: "critical",
        points: 15,
      }),
    );
  });
});

describe("calculateSeoScore", () => {
  it("returns 100 when there are no issues", () => {
    expect(calculateSeoScore([])).toBe(100);
  });

  it("subtracts issue points from the score", () => {
    const issues = [
      {
        type: "test-1",
        severity: "critical" as const,
        title: "Issue 1",
        description: "Test issue",
        recommendation: "Fix the issue.",
        points: 20,
      },
      {
        type: "test-2",
        severity: "important" as const,
        title: "Issue 2",
        description: "Test issue",
        recommendation: "Fix the issue.",
        points: 10,
      },
    ];

    expect(calculateSeoScore(issues)).toBe(70);
  });

  it("never returns a score below 0", () => {
    const issues = [
      {
        type: "large-issue",
        severity: "critical" as const,
        title: "Large issue",
        description: "Test issue",
        recommendation: "Fix the issue.",
        points: 150,
      },
    ];

    expect(calculateSeoScore(issues)).toBe(0);
  });

  it("never returns a score above 100", () => {
    expect(
      calculateSeoScore([
        {
          type: "test",
          severity: "opportunity",
          title: "Test",
          description: "Test",
          recommendation: "Fix the issue.",
          points: -50,
        },
      ]),
    ).toBe(100);
  });
});
