import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureException, captureMessage } = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@sentry/node", () => ({
  captureException,
  captureMessage,
  init: vi.fn(),
}));

import { createSentryStream } from "../sentry.js";

describe("createSentryStream", () => {
  beforeEach(() => {
    captureException.mockClear();
    captureMessage.mockClear();
  });

  it("reconstructs and reports an error-level log line with a serialized err", () => {
    const stream = createSentryStream();

    stream.write(
      JSON.stringify({
        level: 50,
        msg: "Unexpected error while analyzing a URL",
        reqId: "req-1",
        err: { type: "TypeError", message: "boom", stack: "TypeError: boom\n at x" },
      }) + "\n",
    );

    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, context] = captureException.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("boom");
    expect(error.name).toBe("TypeError");
    expect(error.stack).toBe("TypeError: boom\n at x");
    expect(context).toEqual({
      extra: { msg: "Unexpected error while analyzing a URL", reqId: "req-1" },
    });
  });

  it("falls back to captureMessage when the log line has no err field", () => {
    const stream = createSentryStream();

    stream.write(JSON.stringify({ level: 50, msg: "Something went wrong" }) + "\n");

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalledWith("Something went wrong", "error");
  });

  it("ignores log lines below the error level", () => {
    const stream = createSentryStream();

    stream.write(JSON.stringify({ level: 30, msg: "incoming request" }) + "\n");

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("never throws on a malformed log line", () => {
    const stream = createSentryStream();

    expect(() => stream.write("not json")).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });
});
