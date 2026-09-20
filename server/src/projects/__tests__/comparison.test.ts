import { describe, expect, it } from "vitest";

import type { AnalysisResult } from "../../analyzer/runAnalysis.js";
import type { SeoData, SeoIssue } from "../../analyzer/seoRules.js";
import { compareAnalyses } from "../comparison.js";

function issue(type: string, overrides: Partial<SeoIssue> = {}): SeoIssue {
  return {
    type,
    severity: "important",
    title: type,
    description: "d",
    recommendation: "fix it",
    points: 5,
    ...overrides,
  };
}

function seo(overrides: Partial<SeoData> = {}): SeoData {
  return {
    title: "Title",
    titleLength: 5,
    metaDescription: "desc",
    metaDescriptionLength: 4,
    h1Count: 1,
    h1s: ["h"],
    canonical: "https://example.com/",
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
    sitemapUrlCount: 5,
    sitemapUrl: "https://example.com/sitemap.xml",
    sitemapType: "urlset",
    ogTitle: "og",
    ogDescription: "ogd",
    ogImage: "ogi",
    twitterCard: "summary",
    internalLinks: {
      totalLinks: 20,
      internalLinks: 15,
      uniqueInternalUrls: 10,
      externalLinks: 5,
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
      performanceScore: 90,
      lcp: 1,
      cls: 0,
      inp: 1,
      fcp: 1,
      ttfb: 1,
    },
    ...overrides,
  };
}

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    url: "https://example.com/",
    statusCode: 200,
    score: 70,
    issues: [],
    seo: seo(),
    ...overrides,
  };
}

describe("compareAnalyses", () => {
  it("computes the score change", () => {
    const cmp = compareAnalyses(
      result({ score: 64 }),
      result({ score: 82 }),
    );
    expect(cmp.before.score).toBe(64);
    expect(cmp.after.score).toBe(82);
    expect(cmp.scoreChange).toBe(18);
  });

  it("matches issues by type and classifies fixed / remaining / introduced", () => {
    const before = result({
      issues: [
        issue("missing-title"),
        issue("missing-meta-description"),
        issue("missing-h1"),
      ],
    });
    const after = result({
      issues: [
        issue("missing-meta-description"), // still there
        issue("multiple-h1"), // new
      ],
    });

    const cmp = compareAnalyses(before, after);

    expect(cmp.issues.fixed.map((i) => i.type).sort()).toEqual([
      "missing-h1",
      "missing-title",
    ]);
    expect(cmp.issues.remaining.map((i) => i.type)).toEqual([
      "missing-meta-description",
    ]);
    expect(cmp.issues.introduced.map((i) => i.type)).toEqual(["multiple-h1"]);

    expect(cmp.issues.originalCount).toBe(3);
    expect(cmp.issues.currentCount).toBe(2);
    expect(cmp.issues.fixedCount).toBe(2);
    expect(cmp.issues.newCount).toBe(1);
  });

  it("does not use recommendation text for issue identity", () => {
    const before = result({
      issues: [issue("missing-title", { recommendation: "old wording" })],
    });
    const after = result({
      issues: [issue("missing-title", { recommendation: "completely new wording" })],
    });

    const cmp = compareAnalyses(before, after);
    expect(cmp.issues.remaining.map((i) => i.type)).toEqual(["missing-title"]);
    expect(cmp.issues.fixed).toHaveLength(0);
  });

  it("reports concrete field improvements from the stored seo data", () => {
    const before = result({
      seo: seo({
        imagesMissingAlt: 18,
        h1Count: 0,
        metaDescription: null,
        internalLinks: { ...seo().internalLinks, internalLinks: 21 },
      }),
    });
    const after = result({
      seo: seo({
        imagesMissingAlt: 3,
        h1Count: 1,
        metaDescription: "now present",
        internalLinks: { ...seo().internalLinks, internalLinks: 34 },
      }),
    });

    const cmp = compareAnalyses(before, after);
    const byLabel = Object.fromEntries(
      cmp.fields.map((f) => [f.label, f]),
    );

    expect(byLabel["Missing image alt text"]).toMatchObject({
      before: "18",
      after: "3",
      improved: true,
    });
    expect(byLabel["Internal links"]).toMatchObject({
      before: "21",
      after: "34",
      improved: true,
    });
    expect(byLabel["H1 heading"]).toMatchObject({
      before: "Missing",
      after: "OK",
      improved: true,
    });
    expect(byLabel["Meta description"]).toMatchObject({
      before: "Missing",
      after: "Present",
      improved: true,
    });
  });

  it("flags regressions as not improved", () => {
    const cmp = compareAnalyses(
      result({ seo: seo({ https: true }) }),
      result({ seo: seo({ https: false }) }),
    );
    const https = cmp.fields.find((f) => f.label === "HTTPS");
    expect(https).toMatchObject({ before: "Enabled", after: "Not enabled" });
    expect(https?.improved).toBe(false);
  });

  it("omits fields that did not change", () => {
    const cmp = compareAnalyses(result(), result());
    expect(cmp.fields).toEqual([]);
  });
});
