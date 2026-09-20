import { describe, expect, it } from "vitest";

import { parseSitemapDocument } from "../sitemapAnalyzer.js";

describe("parseSitemapDocument", () => {
  it("recognizes a regular <urlset> sitemap and counts its URLs", () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      "<url><loc>https://example.com/</loc></url>" +
      "<url><loc>https://example.com/about</loc></url>" +
      "<url><loc>https://example.com/contact</loc></url>" +
      "</urlset>";

    expect(parseSitemapDocument(xml)).toEqual({ type: "urlset", count: 3 });
  });

  it("recognizes a <sitemapindex> and counts its child sitemaps", () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      "<sitemap><loc>https://example.com/post-sitemap.xml</loc></sitemap>" +
      "<sitemap><loc>https://example.com/page-sitemap.xml</loc></sitemap>" +
      "</sitemapindex>";

    expect(parseSitemapDocument(xml)).toEqual({ type: "index", count: 2 });
  });

  it("handles namespace-prefixed roots", () => {
    expect(
      parseSitemapDocument(
        '<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"></sm:urlset>',
      ).type,
    ).toBe("urlset");
    expect(
      parseSitemapDocument("<ns:sitemapindex></ns:sitemapindex>").type,
    ).toBe("index");
  });

  it("does not treat an HTML page as a sitemap", () => {
    const html =
      "<!doctype html><html><head><title>Not a sitemap</title></head>" +
      "<body><h1>Page not found</h1></body></html>";

    expect(parseSitemapDocument(html)).toEqual({ type: null, count: 0 });
  });

  it("does not treat an RSS feed as a sitemap", () => {
    const rss =
      '<?xml version="1.0"?><rss version="2.0"><channel>' +
      "<item><link>https://example.com/a</link></item></channel></rss>";

    expect(parseSitemapDocument(rss)).toEqual({ type: null, count: 0 });
  });

  it("returns null for empty or non-XML bodies", () => {
    expect(parseSitemapDocument("")).toEqual({ type: null, count: 0 });
    expect(parseSitemapDocument("Not Found")).toEqual({ type: null, count: 0 });
    expect(parseSitemapDocument("{ \"error\": 404 }")).toEqual({
      type: null,
      count: 0,
    });
  });

  it("still reports the type when the body has a valid root but cannot be fully parsed", () => {
    // Truncated / malformed but the root element is unambiguous.
    const result = parseSitemapDocument("<urlset><url><loc>https://example.com/");
    expect(result.type).toBe("urlset");
  });
});
