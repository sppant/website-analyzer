import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runAnalysis } = vi.hoisted(() => ({ runAnalysis: vi.fn() }));

vi.mock("../../analyzer/runAnalysis.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../analyzer/runAnalysis.js")>();

  return {
    ...actual,
    runAnalysis,
  };
});

import { buildApp } from "../../app.js";
import { AnalysisError } from "../../analyzer/runAnalysis.js";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  runAnalysis.mockReset();
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

function analyze(payload: unknown) {
  return app.inject({
    method: "POST",
    url: "/api/analyze",
    payload: payload as never,
  });
}

describe("POST /api/analyze (HTTP adapter)", () => {
  it("returns 400 when the body has no url", async () => {
    const response = await analyze({});

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "URL is required" });
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it("returns 400 when the url is blank", async () => {
    const response = await analyze({ url: "   " });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "URL is required" });
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it("maps an AnalysisError to its status code and message", async () => {
    runAnalysis.mockRejectedValue(
      new AnalysisError("This URL cannot be analyzed."),
    );

    const response = await analyze({ url: "https://example.com" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "This URL cannot be analyzed." });
  });

  it("maps an unexpected error to a 500 with a safe generic message", async () => {
    runAnalysis.mockRejectedValue(new Error("boom: internal detail /etc/secret"));

    const response = await analyze({ url: "https://example.com" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "Unable to analyze the website. Please try again.",
    });
    // The raw internal message must not leak to the client.
    expect(response.body).not.toContain("boom");
    expect(response.body).not.toContain("/etc/secret");
  });

  it("returns 400 for a syntactically invalid URL instead of 500", async () => {
    const response = await analyze({ url: "h ttp://not a url" });

    expect(response.statusCode).toBe(400);
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-HTTP(S) URL", async () => {
    const response = await analyze({ url: "file:///etc/passwd" });

    expect(response.statusCode).toBe(400);
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it("returns the analysis result on success", async () => {
    const result = {
      url: "https://example.com/",
      statusCode: 200,
      seo: { title: "Example" },
      score: 92,
      issues: [],
    };
    runAnalysis.mockResolvedValue(result);

    const response = await analyze({ url: "https://example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(result);
    expect(runAnalysis).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ onPageSpeedError: expect.any(Function) }),
    );
  });
});
