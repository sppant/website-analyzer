import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(
    async (_message: Record<string, string>) => ({ messageId: "test" }),
  );
  return {
    sendMail,
    createTransport: vi.fn((_opts: { auth: { user: string; pass: string } }) => ({
      sendMail,
    })),
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
  createTransport,
}));

import { buildApp } from "../../app.js";
import type { SmtpConfig } from "../../config.js";
import { createInMemoryAuthRepository } from "../../auth/__tests__/in-memory-auth-repository.js";
import { createSmtpMailer } from "../smtp-mailer.js";

const SMTP: SmtpConfig = {
  host: "smtp.example.com",
  port: 465,
  secure: true,
  user: "seo@example.com",
  password: "super-secret-smtp-password",
  from: "seo@example.com",
};

const SESSION_SECRET = "test-session-secret-that-is-long-enough";

beforeEach(() => {
  sendMail.mockClear();
  createTransport.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createSmtpMailer", () => {
  it("sends the reset link over SMTP without logging the URL or credentials", async () => {
    const logged: string[] = [];
    const mailer = createSmtpMailer(SMTP, (m) => logged.push(m));

    await mailer.sendPasswordResetEmail({
      to: "user@example.com",
      resetUrl: "https://app.example.com/reset-password?token=SECRET_TOKEN_123",
    });

    // The email itself carries the link...
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    expect(message.to).toBe("user@example.com");
    expect(message.from).toBe("seo@example.com");
    expect(message.text).toContain("SECRET_TOKEN_123");
    expect(message.html).toContain("SECRET_TOKEN_123");

    // ...but nothing sensitive is handed to the logger.
    const allLogs = logged.join("\n");
    expect(allLogs).not.toContain("SECRET_TOKEN_123");
    expect(allLogs).not.toContain("reset-password?token");
    expect(allLogs).not.toContain("super-secret-smtp-password");

    // Credentials go to the transport, never to the log callback.
    const transportOpts = createTransport.mock.calls[0]![0] as unknown as {
      auth: { pass: string };
    };
    expect(transportOpts.auth.pass).toBe("super-secret-smtp-password");
  });
});

describe("mailer selection", () => {
  it("password reset invokes the configured SMTP mailer and logs no token", async () => {
    const logs: unknown[][] = [];
    const app = await buildApp({
      authRepository: createInMemoryAuthRepository(),
      sessionSecret: SESSION_SECRET,
      isProduction: false,
      appUrl: "https://app.example.com",
      smtp: SMTP,
    });
    app.log.info = ((...args: unknown[]) => {
      logs.push(args);
      return app.log;
    }) as typeof app.log.info;
    app.log.warn = ((...args: unknown[]) => {
      logs.push(args);
      return app.log;
    }) as typeof app.log.warn;
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "reset@example.com", password: "a-strong-password" },
    });
    await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email: "reset@example.com" },
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    const token = new URL(
      message.text.split("\n").find((l) => l.startsWith("https://"))!,
    ).searchParams.get("token")!;
    expect(token.length).toBeGreaterThan(20);

    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain("reset-password?token");
    expect(serialized).not.toContain("super-secret-smtp-password");

    await app.close();
  });

  it("refuses to start in production without a mailer (no console fallback)", async () => {
    await expect(
      buildApp({
        authRepository: createInMemoryAuthRepository(),
        sessionSecret: SESSION_SECRET,
        isProduction: true,
        appUrl: "https://app.example.com",
      }),
    ).rejects.toThrow(/mailer is configured/i);
  });

  it("uses an SMTP mailer in production when configured", async () => {
    const app = await buildApp({
      authRepository: createInMemoryAuthRepository(),
      sessionSecret: SESSION_SECRET,
      isProduction: true,
      appUrl: "https://app.example.com",
      smtp: SMTP,
    });
    await app.ready();
    expect(createTransport).toHaveBeenCalled();
    await app.close();
  });
});

describe("loadConfig — production SMTP requirement", () => {
  it("throws when NODE_ENV=production and SMTP_* is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/x");
    vi.stubEnv("SESSION_SECRET", "a-long-enough-session-secret");
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASSWORD", "");

    const { loadConfig } = await import("../../config.js");
    expect(() => loadConfig()).toThrow(/SMTP is required in production/i);
  });

  it("accepts a full SMTP config in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/x");
    vi.stubEnv("SESSION_SECRET", "a-long-enough-session-secret");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_USER", "seo@example.com");
    vi.stubEnv("SMTP_PASSWORD", "pw");

    const { loadConfig } = await import("../../config.js");
    const config = loadConfig();
    expect(config.smtp).toMatchObject({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      from: "seo@example.com",
    });
  });
});
