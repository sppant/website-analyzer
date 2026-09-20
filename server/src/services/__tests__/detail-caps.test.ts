import { describe, expect, it } from "vitest";

import { extractSeoData } from "../seoAnalyzer.js";
import { analyzeInternalLinks } from "../internalLinkAnalyzer.js";

const PAGE_URL = new URL("https://example.com/");

describe("analyzer detail arrays are capped, counts stay exact", () => {
  it("caps imagesMissingAltDetails at 200 but keeps the true count", () => {
    const imgs = Array.from(
      { length: 5000 },
      (_, i) => `<img src="/i${i}.png">`,
    ).join("");
    const html = `<html lang="en"><body><h1>x</h1>${imgs}</body></html>`;

    const seo = extractSeoData(html, PAGE_URL);

    expect(seo.imagesMissingAlt).toBe(5000);
    expect(seo.imagesMissingAltDetails).toHaveLength(200);
  });

  it("caps internal-link detail arrays at 200 but keeps the true counts", () => {
    const links = Array.from(
      { length: 3000 },
      (_, i) => `<a href="/p${i}"></a>` + `<a href="/q${i}">click here</a>`,
    ).join("");
    const html = `<html lang="en"><body><h1>x</h1>${links}</body></html>`;

    const data = analyzeInternalLinks(html, PAGE_URL);

    expect(data.emptyAnchorLinks).toBe(3000);
    expect(data.emptyAnchorDetails).toHaveLength(200);

    expect(data.genericAnchorLinks).toBe(3000);
    expect(data.genericAnchorDetails).toHaveLength(200);

    expect(data.uniqueInternalUrls).toBe(6000);
    expect(data.internalUrls).toHaveLength(200);
  });

  it("caps httpInternalDetails at 200 but keeps the true count", () => {
    const links = Array.from(
      { length: 500 },
      (_, i) => `<a href="http://example.com/h${i}">link ${i}</a>`,
    ).join("");
    const html = `<html lang="en"><body><h1>x</h1>${links}</body></html>`;

    const data = analyzeInternalLinks(html, PAGE_URL);

    expect(data.httpInternalLinks).toBe(500);
    expect(data.httpInternalDetails).toHaveLength(200);
  });
});
