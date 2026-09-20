import { beforeEach, describe, expect, it, vi } from "vitest";

const { isSafeUrl } = vi.hoisted(() => ({ isSafeUrl: vi.fn() }));
const { fetchWithTimeout } = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
const { analyzePageSpeed } = vi.hoisted(() => ({ analyzePageSpeed: vi.fn() }));

vi.mock("../../utils/safeUrl.js", () => ({ isSafeUrl }));
vi.mock("../../services/fetcher.js", () => ({ fetchWithTimeout }));
vi.mock("../../services/pageSpeedAnalyzer.js", () => ({ analyzePageSpeed }));

import { crawlWebsite } from "../crawler.js";
import { AnalysisError } from "../../analyzer/runAnalysis.js";

function page(links: string[], extra = ""): string {
  return `<!doctype html><html lang="en"><head>
    <title>A reasonably long and descriptive page title here</title>
    <meta name="description" content="${"word ".repeat(20)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="https://example.com/" />
  </head><body><h1>Heading</h1>
    ${links.map((h) => `<a href="${h}">link to ${h}</a>`).join("\n")}
    ${extra}
  </body></html>`;
}

/** Map of URL -> html (or "BROKEN" / "500" / "TIMEOUT"). */
let site: Record<string, string>;

function respond(url: string): Response | null {
  // robots / sitemap: 404
  if (url.endsWith("/robots.txt") || url.includes("/sitemap")) {
    return new Response("", { status: 404 });
  }
  const key = url.replace(/#.*$/, "").replace(/\/$/, "") || url;
  const entry = site[key] ?? site[url] ?? site[url.replace(/\/$/, "")];
  if (entry === undefined) return new Response("", { status: 404 });
  if (entry === "TIMEOUT") return null;
  if (entry === "500") return new Response("err", { status: 500 });
  if (entry === "BROKEN") return new Response("nope", { status: 404 });
  return new Response(entry, { status: 200, headers: { "content-type": "text/html" } });
}

beforeEach(() => {
  isSafeUrl.mockReset().mockResolvedValue(true);
  analyzePageSpeed
    .mockReset()
    .mockResolvedValue({ performanceScore: 80, lcp: 1, cls: 0, inp: 1, fcp: 1, ttfb: 1 });
  fetchWithTimeout.mockReset().mockImplementation(async (url: string) => respond(url));
});

describe("crawlWebsite", () => {
  it("discovers internal pages, stays on domain, ignores external links as targets", async () => {
    site = {
      "https://example.com": page([
        "/about",
        "/services",
        "https://facebook.com/example",
        "https://google.com",
      ]),
      "https://example.com/about": page(["/", "/team"]),
      "https://example.com/services": page(["/about"]),
      "https://example.com/team": page(["/about"]),
    };

    const result = await crawlWebsite("https://example.com");

    const urls = result.pages.map((p) => p.url).sort();
    expect(urls).toEqual([
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/services",
      "https://example.com/team",
    ]);
    // External domains are checked as links (the link-check timeout) but never crawled
    // as pages (timeout 9000).
    const externalPageFetch = fetchWithTimeout.mock.calls.find(
      (c) => String(c[0]).includes("facebook.com") && c[1] === 9000,
    );
    expect(externalPageFetch).toBeUndefined();
    // ...but it WAS checked for broken-link status.
    const externalLinkCheck = fetchWithTimeout.mock.calls.find(
      (c) => String(c[0]).includes("facebook.com") && c[1] === 5000,
    );
    expect(externalLinkCheck).toBeDefined();
    expect(result.summary.pagesAnalyzed).toBe(4);
    expect(result.pagesLimit).toBe(100);
  });

  it("respects the page limit", async () => {
    const links = Array.from({ length: 30 }, (_, i) => `/p${i}`);
    site = { "https://example.com": page(links) };
    for (const link of links) {
      site[`https://example.com${link}`] = page(["/"]);
    }

    const result = await crawlWebsite("https://example.com", { maxPages: 10 });
    expect(result.pages.length).toBe(10);
    expect(result.pagesLimit).toBe(10);
  });

  it("clamps a huge requested limit to the server maximum", async () => {
    site = { "https://example.com": page([]) };
    const result = await crawlWebsite("https://example.com", { maxPages: 99999 });
    expect(result.pagesLimit).toBe(100);
  });

  it("deduplicates /page, /page/ and /page#frag", async () => {
    site = {
      "https://example.com": page([
        "/dup",
        "/dup/",
        "/dup#a",
        "/dup#b",
        "https://example.com/dup",
      ]),
      "https://example.com/dup": page(["/"]),
    };
    const result = await crawlWebsite("https://example.com");
    expect(result.pages.filter((p) => p.url.includes("/dup"))).toHaveLength(1);
  });

  it("handles circular navigation without looping", async () => {
    site = {
      "https://example.com": page(["/a"]),
      "https://example.com/a": page(["/b", "/"]),
      "https://example.com/b": page(["/a", "/"]),
    };
    const result = await crawlWebsite("https://example.com");
    expect(result.pages.map((p) => p.url).sort()).toEqual([
      "https://example.com/",
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("records a failed page without failing the whole crawl", async () => {
    site = {
      "https://example.com": page(["/ok", "/dead", "/slow"]),
      "https://example.com/ok": page(["/"]),
      "https://example.com/dead": "500",
      "https://example.com/slow": "TIMEOUT",
    };
    const result = await crawlWebsite("https://example.com");

    expect(result.summary.pagesAnalyzed).toBe(2); // "/" and "/ok"
    const dead = result.pages.find((p) => p.url.includes("/dead"));
    const slow = result.pages.find((p) => p.url.includes("/slow"));
    expect(dead?.ok).toBe(false);
    expect(dead?.statusCode).toBe(500);
    expect(slow?.ok).toBe(false);
    expect(result.summary.pagesFailed).toBe(2);
  });

  it("runs PageSpeed for the root only", async () => {
    site = {
      "https://example.com": page(["/about"]),
      "https://example.com/about": page(["/"]),
    };
    await crawlWebsite("https://example.com");
    expect(analyzePageSpeed).toHaveBeenCalledTimes(1);
    expect(analyzePageSpeed).toHaveBeenCalledWith("https://example.com/");
  });

  it("aggregates a website summary and most-common issues", async () => {
    // Pages with no meta description -> every page gets that issue.
    const noDesc = `<!doctype html><html lang="en"><head><title>${"x".repeat(40)}</title>
      <meta name="viewport" content="width=device-width" /></head>
      <body><h1>H</h1><a href="/a">a</a><a href="/b">b</a></body></html>`;
    site = {
      "https://example.com": noDesc,
      "https://example.com/a": noDesc,
      "https://example.com/b": noDesc,
    };
    const result = await crawlWebsite("https://example.com");
    expect(result.summary.pagesAnalyzed).toBe(3);
    const missingDesc = result.summary.commonIssues.find(
      (i) => i.type === "missing-meta-description",
    );
    expect(missingDesc?.pages).toBe(3);
    expect(result.summary.websiteScore).toBeLessThan(100);
    expect(result.summary.websiteScore).toBeGreaterThan(0);
  });

  // --- SSRF -----------------------------------------------------------

  it("rejects an unsafe root URL", async () => {
    isSafeUrl.mockResolvedValue(false);
    await expect(crawlWebsite("http://169.254.169.254")).rejects.toBeInstanceOf(
      AnalysisError,
    );
  });

  it("rejects a credentialed or non-http root URL", async () => {
    await expect(
      crawlWebsite("https://user:pass@example.com"),
    ).rejects.toThrow(/credentials/);
    await expect(crawlWebsite("ftp://example.com")).rejects.toThrow(/HTTP/);
  });

  it("does not fetch a discovered link that fails the SSRF check", async () => {
    site = {
      "https://example.com": page(["/ok", "https://example.com/evil"]),
      "https://example.com/ok": page(["/"]),
      "https://example.com/evil": page(["/"]),
    };
    // Everything safe except the "evil" page path.
    isSafeUrl.mockImplementation(async (url: string) => !url.includes("/evil"));

    const result = await crawlWebsite("https://example.com");
    const evil = result.pages.find((p) => p.url.includes("/evil"));
    expect(evil?.ok).toBe(false);
    expect(evil?.error).toMatch(/security/i);
  });

  it("uses bounded concurrency (never more than 3 page fetches in flight)", async () => {
    const links = Array.from({ length: 12 }, (_, i) => `/p${i}`);
    site = { "https://example.com": page(links) };
    for (const link of links) site[`https://example.com${link}`] = page([]);

    let inFlight = 0;
    let peak = 0;
    fetchWithTimeout.mockImplementation(
      async (url: string, timeout?: number) => {
        // Page fetches use a 9s timeout; robots/sitemap use 5s, link checks 6s.
        const isPageFetch = timeout === 9000;
        if (isPageFetch) {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
        }
        await new Promise((r) => setTimeout(r, 5));
        if (isPageFetch) inFlight -= 1;
        return respond(url);
      },
    );

    await crawlWebsite("https://example.com");
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("with a zero-length budget, analyzes only the homepage", async () => {
    site = {
      "https://example.com": page(["/a", "/b", "/c"]),
      "https://example.com/a": page([]),
      "https://example.com/b": page([]),
      "https://example.com/c": page([]),
    };

    const result = await crawlWebsite("https://example.com", { budgetMs: 0 });

    expect(result.pages.map((p) => p.url)).toEqual(["https://example.com/"]);
    expect(result.summary.pagesAnalyzed).toBe(1);
  });

  it("stops dequeuing pages once the wall-clock budget is spent", async () => {
    const links = Array.from({ length: 40 }, (_, i) => `/p${i}`);
    site = { "https://example.com": page(links) };
    for (const link of links) site[`https://example.com${link}`] = page([]);

    fetchWithTimeout.mockImplementation(
      async (url: string, timeout?: number) => {
        if (timeout === 9000) {
          await new Promise((r) => setTimeout(r, 25));
        }
        return respond(url);
      },
    );

    const result = await crawlWebsite("https://example.com", { budgetMs: 80 });

    // It made progress but did not get through all 40 discovered pages.
    expect(result.summary.pagesAnalyzed).toBeGreaterThanOrEqual(1);
    expect(result.summary.pagesAnalyzed).toBeLessThan(41);
  });
});
