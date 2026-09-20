import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Agent } from "undici";

// No mocks here — this exercises the real SSRF perimeter (isSafeUrl +
// ssrfSafeLookup + undici) against a real loopback server.
import { fetchWithTimeout } from "../fetcher.js";
import { ssrfSafeLookup } from "../../utils/safeUrl.js";

let server: http.Server;
let port: number;

beforeAll(async () => {
  server = http.createServer((_req, res) => res.end("reached-the-server"));
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", resolve),
  );
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("SSRF perimeter — connection pinning", () => {
  it("undici connects to exactly the address the lookup returns", async () => {
    const agent = new Agent({
      // Pin every connection to loopback regardless of the hostname.
      connect: {
        lookup: (_h, _o, cb) =>
          (cb as (e: null, a: { address: string; family: number }[]) => void)(
            null,
            [{ address: "127.0.0.1", family: 4 }],
          ),
      },
    });

    try {
      // `pinned.invalid` has no DNS record — this only succeeds because the
      // custom lookup decides the address the socket dials.
      const response = await fetch(`http://pinned.invalid:${port}/`, {
        dispatcher: agent,
      } as RequestInit & { dispatcher: Agent });

      expect(await response.text()).toBe("reached-the-server");
    } finally {
      await agent.close();
    }
  });

  it("ssrfSafeLookup refuses to connect when a hostname resolves to loopback", async () => {
    // `localhost` resolves to 127.0.0.1 / ::1 — the pin must reject it, which
    // is the DNS-rebinding case (a hostname that resolves to a private IP).
    const agent = new Agent({ connect: { lookup: ssrfSafeLookup } });

    try {
      await expect(
        fetch(`http://localhost:${port}/`, {
          dispatcher: agent,
        } as RequestInit & { dispatcher: Agent }),
      ).rejects.toBeInstanceOf(Error);
    } finally {
      await agent.close();
    }
  });

  it("fetchWithTimeout refuses loopback / localhost / metadata targets", async () => {
    for (const url of [
      `http://127.0.0.1:${port}/`,
      `http://localhost:${port}/`,
      `http://[::1]:${port}/`,
      "http://169.254.169.254/latest/meta-data/",
      `http://2130706433:${port}/`, // decimal-encoded 127.0.0.1
    ]) {
      expect(await fetchWithTimeout(url, 2000), url).toBeNull();
    }
  });
});
