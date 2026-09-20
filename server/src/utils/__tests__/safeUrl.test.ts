import { afterEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({
  lookup: vi.fn(),
}));
// Callback-style resolver used by `ssrfSafeLookup`.
const { lookupCb } = vi.hoisted(() => ({
  lookupCb: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: { lookup },
  lookup,
}));

vi.mock("node:dns", () => ({
  default: { lookup: lookupCb },
  lookup: lookupCb,
}));

import { isSafeUrl, ssrfSafeLookup } from "../safeUrl.js";

afterEach(() => {
  vi.clearAllMocks();
});

/** Runs `ssrfSafeLookup` and resolves with `{ err, address, family, all }`. */
function runLookup(
  hostname: string,
  options: Record<string, unknown> = {},
): Promise<{
  err: Error | null;
  address?: string;
  family?: number;
  all?: { address: string; family: number }[];
}> {
  return new Promise((resolve) => {
    const cb = (
      err: Error | null,
      a: string | { address: string; family: number }[],
      b?: number,
    ): void => {
      if (Array.isArray(a)) {
        resolve({ err, all: a });
      } else {
        resolve({ err, address: a, family: b });
      }
    };
    ssrfSafeLookup(hostname, options, cb as never);
  });
}

describe("isSafeUrl — protocol and credentials", () => {
  it("rejects non-HTTP(S) protocols", async () => {
    expect(await isSafeUrl("ftp://example.com")).toBe(false);
    expect(await isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(await isSafeUrl("gopher://example.com/")).toBe(false);
  });

  it("rejects URLs containing credentials", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    expect(await isSafeUrl("https://user:pass@example.com")).toBe(false);
    expect(await isSafeUrl("https://user@example.com")).toBe(false);
  });

  it("rejects unparseable URLs", async () => {
    expect(await isSafeUrl("not a url")).toBe(false);
    expect(await isSafeUrl("")).toBe(false);
  });
});

describe("isSafeUrl — literal IP addresses", () => {
  it("allows public IPv4 literals without a DNS lookup", async () => {
    expect(await isSafeUrl("http://93.184.216.34")).toBe(true);
    expect(await isSafeUrl("http://8.8.8.8")).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("blocks loopback, private, and reserved IPv4 literals", async () => {
    const blocked = [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254", // cloud instance metadata endpoint
      "0.0.0.0",
      "100.64.0.1", // carrier-grade NAT
    ];

    for (const host of blocked) {
      expect(await isSafeUrl(`http://${host}/`)).toBe(false);
    }
  });

  it("allows public IPv6 literals", async () => {
    expect(await isSafeUrl("http://[2606:4700:4700::1111]")).toBe(true);
  });

  it("blocks loopback, link-local, unique-local, and mapped IPv6 literals", async () => {
    const blocked = [
      "[::1]",
      "[fe80::1]",
      "[fc00::1]",
      "[::ffff:127.0.0.1]",
      "[::ffff:10.0.0.1]",
    ];

    for (const host of blocked) {
      expect(await isSafeUrl(`http://${host}/`)).toBe(false);
    }
  });
});

describe("isSafeUrl — hostname resolution", () => {
  it("allows a hostname that resolves to a public address", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    expect(await isSafeUrl("https://example.com")).toBe(true);
  });

  it("blocks a hostname that resolves to a private address", async () => {
    lookup.mockResolvedValue([{ address: "192.168.1.10", family: 4 }]);

    expect(await isSafeUrl("https://intranet.example.com")).toBe(false);
  });

  it("blocks when any resolved address is not public", async () => {
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    expect(await isSafeUrl("https://example.com")).toBe(false);
  });

  it("blocks a hostname that resolves to a private IPv6 address", async () => {
    lookup.mockResolvedValue([{ address: "fd00::1", family: 6 }]);

    expect(await isSafeUrl("https://example.com")).toBe(false);
  });

  it("blocks when DNS resolution fails", async () => {
    lookup.mockRejectedValue(new Error("ENOTFOUND"));

    expect(await isSafeUrl("https://nonexistent.example")).toBe(false);
  });

  it("blocks when DNS returns no addresses", async () => {
    lookup.mockResolvedValue([]);

    expect(await isSafeUrl("https://example.com")).toBe(false);
  });
});

describe("ssrfSafeLookup — connection-time DNS pin (TOCTOU-safe)", () => {
  it("blocks loopback / localhost / metadata / RFC1918 literals without DNS", async () => {
    for (const host of [
      "127.0.0.1",
      "169.254.169.254",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "0.0.0.0",
      "::1",
    ]) {
      const { err } = await runLookup(host);
      expect(err, host).toBeInstanceOf(Error);
      expect((err as { code?: string }).code).toBe("ERR_SSRF_BLOCKED");
    }
    expect(lookupCb).not.toHaveBeenCalled();
  });

  it("allows a public IPv4 literal and pins it", async () => {
    const { err, address, family } = await runLookup("93.184.216.34");
    expect(err).toBeNull();
    expect(address).toBe("93.184.216.34");
    expect(family).toBe(4);
    expect(lookupCb).not.toHaveBeenCalled();
  });

  it("resolves 'localhost' and blocks it (loopback)", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(null, [{ address: "127.0.0.1", family: 4 }]),
    );

    const { err } = await runLookup("localhost");
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe("ERR_SSRF_BLOCKED");
  });

  it("pins the single resolved public address", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(null, [{ address: "93.184.216.34", family: 4 }]),
    );

    const { err, address } = await runLookup("example.com");
    expect(err).toBeNull();
    expect(address).toBe("93.184.216.34");
  });

  it("rejects the whole lookup when ANY resolved address is private", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(null, [
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    );

    const { err } = await runLookup("rebind.attacker.test");
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe("ERR_SSRF_BLOCKED");
  });

  it("blocks an IPv4-mapped IPv6 result", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(null, [{ address: "::ffff:127.0.0.1", family: 6 }]),
    );

    const { err } = await runLookup("mapped.test");
    expect(err).toBeInstanceOf(Error);
  });

  it("returns an array when called with { all: true }", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(null, [{ address: "93.184.216.34", family: 4 }]),
    );

    const { err, all } = await runLookup("example.com", { all: true });
    expect(err).toBeNull();
    expect(all).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("propagates a DNS resolution failure", async () => {
    lookupCb.mockImplementation((_h, _o, cb) =>
      cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" })),
    );

    const { err } = await runLookup("nope.invalid");
    expect(err).toBeInstanceOf(Error);
  });
});
