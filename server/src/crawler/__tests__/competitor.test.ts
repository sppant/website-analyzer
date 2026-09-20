import { beforeEach, describe, expect, it, vi } from "vitest";

const { runAnalysis } = vi.hoisted(() => ({ runAnalysis: vi.fn() }));
vi.mock("../../analyzer/runAnalysis.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../analyzer/runAnalysis.js")>();
  return { ...actual, runAnalysis };
});

import { compareWebsites } from "../competitor.js";
import type { AnalysisResult } from "../../analyzer/runAnalysis.js";
import type { SeoData } from "../../analyzer/seoRules.js";

function seo(overrides: Partial<SeoData> = {}): SeoData {
  return {
    title: "Title",
    titleLength: 5,
    metaDescription: "desc",
    metaDescriptionLength: 4,
    h1Count: 1,
    h1s: ["h"],
    canonical: "https://x/",
    language: "en",
    viewport: "width=device-width",
    imageCount: 10,
    imagesMissingAlt: 0,
    imagesMissingAltDetails: [],
    https: true,
    robotsTxt: true,
    robotsTxtHasSitemap: true,
    robotsTxtBlocksAll: false,
    sitemapXml: true,
    sitemapUrlCount: 3,
    sitemapUrl: "https://x/sitemap.xml",
    sitemapType: "urlset",
    ogTitle: "o",
    ogDescription: "o",
    ogImage: "o",
    twitterCard: "summary",
    internalLinks: {
      totalLinks: 30,
      internalLinks: 24,
      uniqueInternalUrls: 12,
      externalLinks: 6,
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
    pageSpeed: {
      performanceScore: 74,
      lcp: 1,
      cls: 0,
      inp: 1,
      fcp: 1,
      ttfb: 1,
    },
    ...overrides,
  };
}

function result(url: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    url,
    statusCode: 200,
    score: 82,
    issues: [],
    seo: seo(),
    ...overrides,
  };
}

beforeEach(() => {
  runAnalysis.mockReset();
});

describe("compareWebsites", () => {
  it("analyzes both homepages and compares scores + metrics", async () => {
    runAnalysis
      .mockResolvedValueOnce(
        result("https://mine.com/", {
          score: 82,
          seo: seo({
            imagesMissingAlt: 7,
            internalLinks: { ...seo().internalLinks, internalLinks: 24 },
            pageSpeed: { ...seo().pageSpeed!, performanceScore: 74 },
          }),
        }),
      )
      .mockResolvedValueOnce(
        result("https://competitor.com/", {
          score: 91,
          seo: seo({
            imagesMissingAlt: 2,
            internalLinks: { ...seo().internalLinks, internalLinks: 61 },
            pageSpeed: { ...seo().pageSpeed!, performanceScore: 88 },
          }),
        }),
      );

    const cmp = await compareWebsites("https://mine.com", "https://competitor.com");

    expect(cmp.you.score).toBe(82);
    expect(cmp.competitor.score).toBe(91);
    expect(cmp.you.performanceScore).toBe(74);

    const metric = (label: string) =>
      cmp.metrics.find((m) => m.label === label)!;
    expect(metric("SEO score")).toMatchObject({ you: 82, competitor: 91 });
    expect(metric("Internal links")).toMatchObject({ you: 24, competitor: 61 });
    expect(metric("Images missing alt")).toMatchObject({
      you: 7,
      competitor: 2,
      higherIsBetter: false,
    });
    expect(metric("HTTPS")).toMatchObject({ kind: "boolean", you: true });
  });

  it("derives opportunities only from real gaps", async () => {
    runAnalysis
      .mockResolvedValueOnce(
        result("https://m/", {
          seo: seo({
            imagesMissingAlt: 4,
            internalLinks: { ...seo().internalLinks, internalLinks: 10 },
            pageSpeed: { ...seo().pageSpeed!, performanceScore: 60 },
          }),
        }),
      )
      .mockResolvedValueOnce(
        result("https://c/", {
          seo: seo({
            internalLinks: { ...seo().internalLinks, internalLinks: 61 },
            pageSpeed: { ...seo().pageSpeed!, performanceScore: 90 },
          }),
        }),
      );

    const cmp = await compareWebsites("https://m", "https://c");
    const joined = cmp.opportunities.join(" | ");
    expect(joined).toMatch(/internal linking/i);
    expect(joined).toMatch(/alt text to 4/i);
    expect(joined).toMatch(/Core Web Vitals/i);
    // Nothing invented: both have title/canonical/https/sitemap so no such advice.
    expect(joined).not.toMatch(/canonical/i);
    expect(cmp.opportunities.length).toBeLessThanOrEqual(5);
  });

  it("handles a competitor with PageSpeed unavailable", async () => {
    runAnalysis
      .mockResolvedValueOnce(result("https://m/"))
      .mockResolvedValueOnce(
        result("https://c/", {
          seo: seo({ pageSpeed: { ...seo().pageSpeed!, performanceScore: null } }),
        }),
      );

    const cmp = await compareWebsites("https://m", "https://competitor.com");
    expect(cmp.competitor.performanceScore).toBeNull();
    const perf = cmp.metrics.find((m) => m.label === "Performance")!;
    expect(perf.competitor).toBeNull();
    // No performance opportunity when one side is missing data.
    expect(cmp.opportunities.join(" ")).not.toMatch(/Core Web Vitals/i);
  });

  it("propagates an analyzer error for an unsafe competitor URL", async () => {
    const { AnalysisError } = await import("../../analyzer/runAnalysis.js");
    runAnalysis.mockImplementation(async (url: string) => {
      if (url.includes("169.254")) {
        throw new AnalysisError("This URL cannot be analyzed.");
      }
      return result("https://m/");
    });

    await expect(
      compareWebsites("https://m", "http://169.254.169.254"),
    ).rejects.toBeInstanceOf(AnalysisError);
  });
});
