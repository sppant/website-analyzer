import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSafeUrl } = vi.hoisted(() => ({
  isSafeUrl: vi.fn(),
}));

// Partial mock: stub `isSafeUrl` (the fast pre-check) but keep the real
// `ssrfSafeLookup`, which the module wires into its undici dispatcher.
vi.mock("../../utils/safeUrl.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../utils/safeUrl.js")>();
  return { ...actual, isSafeUrl };
});

import { fetchWithTimeout } from "../fetcher.js";

const fetchMock = vi.fn();

beforeEach(() => {
  isSafeUrl.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function redirectResponse(location: string, status = 301): Response {
  return new Response(null, {
    status,
    headers: { location },
  });
}

describe("fetchWithTimeout", () => {
  it("returns the response for a non-redirect status", async () => {
    isSafeUrl.mockResolvedValue(true);
    const ok = new Response("body", { status: 200 });
    fetchMock.mockResolvedValue(ok);

    const result = await fetchWithTimeout("https://example.com");

    expect(result).toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("routes every request through the SSRF-safe dispatcher", async () => {
    isSafeUrl.mockResolvedValue(true);
    fetchMock.mockResolvedValue(new Response("body", { status: 200 }));

    await fetchWithTimeout("https://example.com");

    const init = fetchMock.mock.calls[0]?.[1] as { dispatcher?: unknown };
    expect(init.dispatcher).toBeDefined();
  });

  it("validates the URL before fetching and bails if it is unsafe", async () => {
    isSafeUrl.mockResolvedValue(false);

    const result = await fetchWithTimeout("https://169.254.169.254");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-validates redirect destinations and blocks unsafe ones", async () => {
    isSafeUrl
      .mockResolvedValueOnce(true) // initial URL
      .mockResolvedValueOnce(false); // redirect target
    fetchMock.mockResolvedValueOnce(
      redirectResponse("http://169.254.169.254/latest/meta-data"),
    );

    const result = await fetchWithTimeout("https://example.com");

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isSafeUrl).toHaveBeenCalledTimes(2);
  });

  it("follows a safe redirect to its final destination", async () => {
    isSafeUrl.mockResolvedValue(true);
    const finalResponse = new Response("done", { status: 200 });
    fetchMock
      .mockResolvedValueOnce(redirectResponse("https://example.com/final"))
      .mockResolvedValueOnce(finalResponse);

    const result = await fetchWithTimeout("https://example.com");

    expect(result).toBe(finalResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves relative redirect locations against the current URL", async () => {
    isSafeUrl.mockResolvedValue(true);
    const finalResponse = new Response("done", { status: 200 });
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/moved"))
      .mockResolvedValueOnce(finalResponse);

    await fetchWithTimeout("https://example.com/start");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://example.com/moved");
  });

  it("stops after the maximum number of redirects", async () => {
    isSafeUrl.mockResolvedValue(true);
    fetchMock.mockResolvedValue(redirectResponse("https://example.com/next"));

    const result = await fetchWithTimeout("https://example.com", 10000, 3);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial request + 3 redirects
  });

  it("returns the redirect response when it has no Location header", async () => {
    isSafeUrl.mockResolvedValue(true);
    const noLocation = new Response(null, { status: 302 });
    fetchMock.mockResolvedValue(noLocation);

    const result = await fetchWithTimeout("https://example.com");

    expect(result).toBe(noLocation);
  });

  it("returns null when the request throws (timeout / abort / network error)", async () => {
    isSafeUrl.mockResolvedValue(true);
    fetchMock.mockRejectedValue(new Error("aborted"));

    const result = await fetchWithTimeout("https://example.com");

    expect(result).toBeNull();
  });
});
