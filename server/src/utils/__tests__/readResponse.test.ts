import { describe, expect, it } from "vitest";

import { readResponseWithLimit } from "../readResponse.js";

function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(part));
      }
      controller.close();
    },
  });
}

describe("readResponseWithLimit", () => {
  it("returns the decoded body when it is within the limit", async () => {
    const response = new Response("hello world");

    expect(await readResponseWithLimit(response, 1024)).toBe("hello world");
  });

  it("reads a body delivered across multiple chunks", async () => {
    const response = new Response(streamOf("foo ", "bar ", "baz"));

    expect(await readResponseWithLimit(response, 1024)).toBe("foo bar baz");
  });

  it("rejects up front when Content-Length exceeds the limit", async () => {
    const response = new Response(streamOf("hello"), {
      headers: { "content-length": "9999999" },
    });

    expect(await readResponseWithLimit(response, 1024)).toBeNull();
  });

  it("rejects when the streamed body exceeds the limit", async () => {
    const response = new Response(streamOf("x".repeat(2048)));

    expect(await readResponseWithLimit(response, 1024)).toBeNull();
  });

  it("returns null when there is no body", async () => {
    const response = new Response(null, { status: 204 });

    expect(await readResponseWithLimit(response, 1024)).toBeNull();
  });

  it("aborts a body that drips in slower than the time budget", async () => {
    // Headers arrived; the body then trickles one byte at a time, staying well
    // under the byte cap forever. The wall-clock budget must cut it off.
    const slow = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise((r) => setTimeout(r, 40));
        controller.enqueue(new TextEncoder().encode("x"));
      },
    });

    const started = Date.now();
    const result = await readResponseWithLimit(new Response(slow), 1_000_000, 150);

    expect(result).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("still returns a normal body well within the budget", async () => {
    const response = new Response(streamOf("quick ", "body"));

    expect(await readResponseWithLimit(response, 1024, 5000)).toBe("quick body");
  });
});
