import { describe, expect, it } from "vitest";

import { analyzeRobotsTxt } from "../robotsAnalyzer.js";

describe("analyzeRobotsTxt", () => {
  it("extracts a single Sitemap: directive", () => {
    const result = analyzeRobotsTxt(
      "User-agent: *\nDisallow:\n\nSitemap: https://example.com/sitemap.xml",
    );

    expect(result.robotsTxt).toBe(true);
    expect(result.robotsTxtHasSitemap).toBe(true);
    expect(result.sitemapUrls).toEqual([
      "https://example.com/sitemap.xml",
    ]);
  });

  it("extracts multiple Sitemap: directives in file order", () => {
    const result = analyzeRobotsTxt(
      [
        "Sitemap: https://example.com/sitemap_index.xml",
        "User-agent: *",
        "Disallow: /wp-admin/",
        "Sitemap: https://example.com/news-sitemap.xml",
      ].join("\n"),
    );

    expect(result.sitemapUrls).toEqual([
      "https://example.com/sitemap_index.xml",
      "https://example.com/news-sitemap.xml",
    ]);
  });

  it("is case-insensitive for the directive name", () => {
    expect(
      analyzeRobotsTxt("SITEMAP: https://example.com/sitemap_index.xml")
        .sitemapUrls,
    ).toEqual(["https://example.com/sitemap_index.xml"]);
  });

  it("reports no sitemap URLs when there is no Sitemap: line", () => {
    const result = analyzeRobotsTxt("User-agent: *\nDisallow: /private/");

    expect(result.robotsTxtHasSitemap).toBe(false);
    expect(result.sitemapUrls).toEqual([]);
  });

  it("ignores comments and keeps the existing block-all detection", () => {
    const blocked = analyzeRobotsTxt(
      "# a comment\nUser-agent: *\nDisallow: /",
    );
    expect(blocked.robotsTxtBlocksAll).toBe(true);
    expect(blocked.sitemapUrls).toEqual([]);

    const open = analyzeRobotsTxt("User-agent: *\nDisallow: /admin/");
    expect(open.robotsTxtBlocksAll).toBe(false);
  });
});
