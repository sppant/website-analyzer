import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSafeUrl } = vi.hoisted(() => ({ isSafeUrl: vi.fn() }));
const { fetchWithTimeout } = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
const { analyzePageSpeed } = vi.hoisted(() => ({ analyzePageSpeed: vi.fn() }));

vi.mock("../../utils/safeUrl.js", () => ({ isSafeUrl }));
vi.mock("../../services/fetcher.js", () => ({ fetchWithTimeout }));
vi.mock("../../services/pageSpeedAnalyzer.js", () => ({ analyzePageSpeed }));

import { AnalysisError, runAnalysis } from "../runAnalysis.js";

const PAGE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Example Domain — a reasonably descriptive page title</title>
      <meta name="description" content="${"word ".repeat(30)}" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href="https://example.com/" />
      <meta property="og:title" content="Example" />
      <meta property="og:description" content="Example description" />
      <meta property="og:image" content="https://example.com/og.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </head>
    <body>
      <h1>Example Domain</h1>
      <a href="/about">About this website and what it does</a>
      <a href="https://external.example/">External reference</a>
      <img src="/logo.png" alt="Company logo" />
    </body>
  </html>
`;

const OK_PAGE_SPEED = {
  performanceScore: 88,
  lcp: 2000,
  cls: 0.05,
  inp: 150,
  fcp: 1200,
  ttfb: 400,
};

beforeEach(() => {
  isSafeUrl.mockReset().mockResolvedValue(true);
  fetchWithTimeout.mockReset();
  analyzePageSpeed.mockReset().mockResolvedValue(OK_PAGE_SPEED);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("runAnalysis — target validation", () => {
  it("rejects non-HTTP(S) URLs with a 400 AnalysisError", async () => {
    await expect(runAnalysis("ftp://example.com")).rejects.toMatchObject({
      name: "AnalysisError",
      message: "Only HTTP and HTTPS URLs are supported.",
      statusCode: 400,
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("rejects URLs containing credentials", async () => {
    await expect(
      runAnalysis("https://user:pass@example.com"),
    ).rejects.toThrow("URLs containing credentials are not supported.");
  });

  it("rejects URLs that fail the SSRF safety check", async () => {
    isSafeUrl.mockResolvedValue(false);

    await expect(runAnalysis("https://169.254.169.254")).rejects.toThrow(
      "This URL cannot be analyzed.",
    );
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("throws AnalysisError instances for expected failures", async () => {
    await expect(runAnalysis("ftp://example.com")).rejects.toBeInstanceOf(
      AnalysisError,
    );
  });

  it("rejects a syntactically invalid URL with a 400 AnalysisError", async () => {
    await expect(runAnalysis("not-a-url")).rejects.toMatchObject({
      name: "AnalysisError",
      statusCode: 400,
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });
});

describe("runAnalysis — fetch failures", () => {
  it("throws when the site does not respond", async () => {
    fetchWithTimeout.mockResolvedValue(null);

    await expect(runAnalysis("https://example.com")).rejects.toThrow(
      "The website did not respond within the allowed time.",
    );
  });

  it("throws when the site returns a non-OK status", async () => {
    fetchWithTimeout.mockResolvedValue(new Response("nope", { status: 503 }));

    await expect(runAnalysis("https://example.com")).rejects.toThrow(
      "Website returned HTTP 503",
    );
  });
});

describe("runAnalysis — successful analysis", () => {
  beforeEach(() => {
    fetchWithTimeout.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt")) {
        return new Response(
          "User-agent: *\nSitemap: https://example.com/sitemap.xml",
          { status: 200 },
        );
      }

      if (url.endsWith("/sitemap.xml")) {
        return new Response(
          "<urlset><url><loc>https://example.com/</loc></url></urlset>",
          { status: 200, headers: { "content-type": "application/xml" } },
        );
      }

      return new Response(PAGE_HTML, { status: 200 });
    });
  });

  it("returns a complete result with a bounded score and issues", async () => {
    const result = await runAnalysis("https://example.com");

    expect(result.url).toBe("https://example.com/");
    expect(result.statusCode).toBe(200);
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.issues)).toBe(true);

    expect(result.seo.title).toContain("Example Domain");
    expect(result.seo.h1Count).toBe(1);
    expect(result.seo.internalLinks.internalLinks).toBeGreaterThan(0);
    expect(result.seo.pageSpeed?.performanceScore).toBe(88);
    expect(result.seo.robotsTxt).toBe(true);
    expect(result.seo.robotsTxtHasSitemap).toBe(true);
    expect(result.seo.sitemapXml).toBe(true);
    expect(result.seo.sitemapUrlCount).toBe(1);
    expect(result.seo.sitemapType).toBe("urlset");
    expect(result.seo.sitemapUrl).toBe("https://example.com/sitemap.xml");
  });

  it("falls back to empty PageSpeed data and reports the error when PageSpeed fails", async () => {
    analyzePageSpeed.mockRejectedValue(new Error("quota exceeded"));
    const onPageSpeedError = vi.fn();

    const result = await runAnalysis("https://example.com", {
      onPageSpeedError,
    });

    expect(result.seo.pageSpeed).toEqual({
      performanceScore: null,
      lcp: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    });
    expect(onPageSpeedError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("still completes when robots.txt and sitemap.xml are unavailable", async () => {
    fetchWithTimeout.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt") || url.includes("/sitemap")) {
        return null;
      }

      return new Response(PAGE_HTML, { status: 200 });
    });

    const result = await runAnalysis("https://example.com");

    expect(result.seo.robotsTxt).toBe(false);
    expect(result.seo.sitemapXml).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("runAnalysis — sitemap discovery", () => {
  const xmlHeaders = { "content-type": "application/xml" };

  function mockSite(
    routes: Record<string, Response | null>,
    { calls }: { calls?: string[] } = {},
  ) {
    fetchWithTimeout.mockImplementation(async (url: string) => {
      calls?.push(url);
      for (const [suffix, response] of Object.entries(routes)) {
        if (url.endsWith(suffix)) return response;
      }
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      if (url.includes("/sitemap")) return new Response("", { status: 404 });
      return new Response(PAGE_HTML, { status: 200 });
    });
  }

  function issueTypes(issues: { type: string }[]): string[] {
    return issues.map((issue) => issue.type);
  }

  it("detects a sitemap index at /sitemap_index.xml when /sitemap.xml is absent", async () => {
    mockSite({
      "/robots.txt": new Response("User-agent: *\nDisallow:", { status: 200 }),
      "/sitemap.xml": new Response("Not Found", { status: 404 }),
      "/sitemap_index.xml": new Response(
        "<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap>" +
          "<sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>",
        { status: 200, headers: xmlHeaders },
      ),
    });

    const result = await runAnalysis("https://example.com");

    expect(result.seo.sitemapXml).toBe(true);
    expect(result.seo.sitemapType).toBe("index");
    expect(result.seo.sitemapUrl).toBe("https://example.com/sitemap_index.xml");
    expect(result.seo.sitemapUrlCount).toBe(2);
    expect(issueTypes(result.issues)).not.toContain("missing-sitemap");
  });

  it("uses the sitemap URL declared in robots.txt", async () => {
    mockSite({
      "/robots.txt": new Response(
        "User-agent: *\nSitemap: https://example.com/sitemap_index.xml",
        { status: 200 },
      ),
      "/sitemap.xml": new Response("Not Found", { status: 404 }),
      "/sitemap_index.xml": new Response(
        "<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>",
        { status: 200, headers: xmlHeaders },
      ),
    });

    const result = await runAnalysis("https://example.com");

    expect(result.seo.robotsTxtHasSitemap).toBe(true);
    expect(result.seo.sitemapXml).toBe(true);
    expect(result.seo.sitemapType).toBe("index");
    expect(result.seo.sitemapUrl).toBe("https://example.com/sitemap_index.xml");
  });

  it("does not count a robots.txt Sitemap: URL that is not a real sitemap", async () => {
    mockSite({
      "/robots.txt": new Response(
        "Sitemap: https://example.com/not-a-sitemap.html",
        { status: 200 },
      ),
      "/not-a-sitemap.html": new Response(
        "<!doctype html><html><body><h1>Hello</h1></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      ),
      "/sitemap.xml": new Response("Not Found", { status: 404 }),
      "/sitemap_index.xml": new Response("Not Found", { status: 404 }),
    });

    const result = await runAnalysis("https://example.com");

    expect(result.seo.sitemapXml).toBe(false);
    expect(result.seo.sitemapType).toBeNull();
    expect(result.seo.sitemapUrl).toBeNull();
    expect(issueTypes(result.issues)).toContain("missing-sitemap");
  });

  it("keeps the missing-sitemap issue when no sitemap exists anywhere", async () => {
    mockSite({
      "/robots.txt": new Response("User-agent: *\nDisallow:", { status: 200 }),
      "/sitemap.xml": new Response("Not Found", { status: 404 }),
      "/sitemap_index.xml": new Response("Not Found", { status: 404 }),
    });

    const result = await runAnalysis("https://example.com");

    expect(result.seo.sitemapXml).toBe(false);
    expect(issueTypes(result.issues)).toContain("missing-sitemap");
  });

  it("routes a private/unsafe robots.txt Sitemap: URL through the SSRF-safe fetch and does not count it", async () => {
    const calls: string[] = [];
    const unsafeUrl = "http://169.254.169.254/sitemap.xml";

    // The real fetchWithTimeout returns null for an unsafe URL (isSafeUrl fails);
    // simulate that here and confirm discovery never bypasses it.
    fetchWithTimeout.mockImplementation(async (url: string) => {
      calls.push(url);
      if (url === unsafeUrl) return null;
      if (url.endsWith("/robots.txt")) {
        return new Response(`Sitemap: ${unsafeUrl}`, { status: 200 });
      }
      if (url.includes("/sitemap")) return new Response("", { status: 404 });
      return new Response(PAGE_HTML, { status: 200 });
    });

    const result = await runAnalysis("https://example.com");

    expect(calls).toContain(unsafeUrl); // went through fetchWithTimeout, not a raw fetch
    expect(result.seo.sitemapXml).toBe(false);
    expect(issueTypes(result.issues)).toContain("missing-sitemap");
  });

  it("probes at most a bounded number of sitemap URLs, even with many Sitemap: lines", async () => {
    const calls: string[] = [];
    const manyLines = Array.from(
      { length: 12 },
      (_, i) => `Sitemap: https://example.com/s${i}.xml`,
    ).join("\n");

    mockSite(
      { "/robots.txt": new Response(manyLines, { status: 200 }) },
      { calls },
    );

    await runAnalysis("https://example.com");

    const sitemapProbes = calls.filter(
      (url) => /\/s\d+\.xml$/.test(url) || url.includes("/sitemap"),
    );
    // At most the 5-candidate cap plus the one parallel /sitemap.xml prefetch.
    expect(sitemapProbes.length).toBeLessThanOrEqual(6);
  });
});
