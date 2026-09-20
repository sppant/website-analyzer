import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchWithTimeout } = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("../../services/fetcher.js", () => ({ fetchWithTimeout }));

import { checkLinks } from "../link-checker.js";
import type { PageLink } from "../page-analyzer.js";

/**
 * `fetchWithTimeout` resolves redirects internally, so a `301 → 200` is
 * delivered here as a 200 Response (whatwg fetch has no synthetic redirect
 * status once followed). `null` means unreachable.
 */
function stubResponses(map: Record<string, Response | null>) {
  fetchWithTimeout.mockImplementation(async (url: string) => {
    const key = url.replace(/\/$/, "");
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    if (Object.prototype.hasOwnProperty.call(map, url)) return map[url];
    return new Response("", { status: 404 });
  });
}

const link = (url: string, internal: boolean, anchor = "link"): PageLink => ({
  url,
  anchor,
  internal,
});

beforeEach(() => {
  fetchWithTimeout.mockReset();
});

describe("checkLinks", () => {
  it("classifies 200 / 404 / 500 / unreachable / bare-redirect", async () => {
    stubResponses({
      "https://site.test/ok": new Response("", { status: 200 }),
      "https://site.test/gone": new Response("", { status: 404 }),
      "https://site.test/boom": new Response("", { status: 500 }),
      "https://site.test/slow": null,
      "https://site.test/loop": new Response("", { status: 302 }), // no Location followed
    });

    const report = await checkLinks([
      {
        sourceUrl: "https://site.test/about",
        links: [
          link("https://site.test/ok", true),
          link("https://site.test/gone", true, "Old page"),
          link("https://site.test/boom", true),
          link("https://site.test/slow", false),
          link("https://site.test/loop", true),
        ],
      },
    ]);

    expect(report.total).toBe(4); // /ok is fine
    const byTarget = Object.fromEntries(
      report.links.map((b) => [b.targetUrl, b]),
    );
    expect(byTarget["https://site.test/gone"]).toMatchObject({
      status: 404,
      type: "internal",
      anchor: "Old page",
      sourceUrl: "https://site.test/about",
    });
    expect(byTarget["https://site.test/boom"].status).toBe(500);
    expect(byTarget["https://site.test/slow"]).toMatchObject({
      status: null,
      statusText: "Unreachable",
      type: "external",
    });
    expect(byTarget["https://site.test/loop"].statusText).toMatch(/Redirect/);
  });

  it("treats a followed 301 → 200 as NOT broken", async () => {
    stubResponses({
      "https://site.test/moved": new Response("", { status: 200 }),
    });
    const report = await checkLinks([
      {
        sourceUrl: "https://site.test/",
        links: [link("https://site.test/moved", true)],
      },
    ]);
    expect(report.total).toBe(0);
  });

  it("checks each distinct destination once but attributes every source", async () => {
    stubResponses({
      "https://site.test/dead": new Response("", { status: 404 }),
    });
    const report = await checkLinks([
      {
        sourceUrl: "https://site.test/a",
        links: [link("https://site.test/dead", true, "from A")],
      },
      {
        sourceUrl: "https://site.test/b",
        links: [link("https://site.test/dead", true, "from B")],
      },
    ]);

    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(report.total).toBe(2);
    expect(report.links.map((b) => b.sourceUrl).sort()).toEqual([
      "https://site.test/a",
      "https://site.test/b",
    ]);
  });

  it("splits internal vs external counts", async () => {
    stubResponses({
      "https://site.test/x": new Response("", { status: 404 }),
      "https://other.test/y": new Response("", { status: 404 }),
    });
    const report = await checkLinks([
      {
        sourceUrl: "https://site.test/",
        links: [
          link("https://site.test/x", true),
          link("https://other.test/y", false),
        ],
      },
    ]);
    expect(report).toMatchObject({ total: 2, internal: 1, external: 1 });
  });

  it("isolates a thrown fetch (one dead host does not fail the batch)", async () => {
    fetchWithTimeout.mockImplementation(async (url: string) => {
      if (url.includes("throws")) throw new Error("socket hang up");
      return new Response("", { status: 200 });
    });
    const report = await checkLinks([
      {
        sourceUrl: "https://site.test/",
        links: [
          link("https://site.test/throws", true),
          link("https://site.test/fine", true),
        ],
      },
    ]);
    expect(report.total).toBe(1);
    expect(report.links[0].targetUrl).toContain("throws");
  });
});
