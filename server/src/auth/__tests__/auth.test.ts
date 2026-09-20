import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import type { AuthRepository } from "../auth-repository.js";
import type { PasswordResetEmail } from "../../services/mailer.js";
import { createInMemoryAuthRepository } from "./in-memory-auth-repository.js";

const SESSION_SECRET = "test-session-secret-that-is-long-enough";
const VALID_PASSWORD = "correct horse battery";
const APP_URL = "http://localhost:5173";

let app: Awaited<ReturnType<typeof buildApp>>;
let repository: AuthRepository;
let sentEmails: PasswordResetEmail[];

beforeEach(async () => {
  repository = createInMemoryAuthRepository();
  sentEmails = [];
  app = await buildApp({
    authRepository: repository,
    sessionSecret: SESSION_SECRET,
    isProduction: false,
    appUrl: APP_URL,
    mailer: {
      async sendPasswordResetEmail(email) {
        sentEmails.push(email);
      },
    },
  });
  await app.ready();
});

afterEach(async () => {
  vi.useRealTimers();
  await app.close();
});

function post(url: string, payload: unknown, cookie?: string) {
  return app.inject({
    method: "POST",
    url,
    payload: payload as never,
    ...(cookie ? { cookies: { session: cookie } } : {}),
  });
}

function getMe(cookie?: string, query = "") {
  return app.inject({
    method: "GET",
    url: `/api/auth/me${query}`,
    ...(cookie ? { cookies: { session: cookie } } : {}),
  });
}

// Logout takes no request body — mirror how the browser client calls it.
function logout(cookie?: string) {
  return app.inject({
    method: "POST",
    url: "/api/auth/logout",
    ...(cookie ? { cookies: { session: cookie } } : {}),
  });
}

function sessionCookieFrom(response: Awaited<ReturnType<typeof post>>) {
  return response.cookies.find((c) => c.name === "session");
}

async function signup(email: string, password = VALID_PASSWORD) {
  const response = await post("/api/auth/signup", { email, password });
  return { response, cookie: sessionCookieFrom(response)?.value };
}

function forgotPassword(email: unknown) {
  return post("/api/auth/forgot-password", { email });
}

function resetPassword(token: unknown, password: unknown) {
  return post("/api/auth/reset-password", { token, password });
}

function tokenFromLastEmail(): string {
  const last = sentEmails.at(-1);
  if (!last) throw new Error("no reset email was sent");
  const token = new URL(last.resetUrl).searchParams.get("token");
  if (!token) throw new Error("reset URL had no token");
  return token;
}

describe("POST /api/auth/signup", () => {
  it("creates an account, starts a session, and returns the safe user", async () => {
    const { response, cookie } = await signup("New.User@Example.com");

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      user: { id: expect.any(String), email: "new.user@example.com" },
      plan: "free",
      subscription: null,
    });

    const setCookie = sessionCookieFrom(response)!;
    expect(setCookie.httpOnly).toBe(true);
    expect(setCookie.sameSite?.toLowerCase()).toBe("lax");
    expect(setCookie.secure).toBeFalsy();
    expect(cookie).toBeTruthy();
  });

  it("never returns the password or its hash", async () => {
    const { response } = await signup("leak@example.com");
    const raw = response.body;

    expect(raw).not.toContain(VALID_PASSWORD);
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("argon2");
  });

  it("stores an Argon2id hash, not the plaintext password", async () => {
    await signup("hashme@example.com");

    const user = await repository.findUserByEmail("hashme@example.com");
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user!.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("rejects an invalid email", async () => {
    const response = await post("/api/auth/signup", {
      email: "not-an-email",
      password: VALID_PASSWORD,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/valid email/i);
  });

  it("rejects a password that is too short", async () => {
    const response = await post("/api/auth/signup", {
      email: "shortpw@example.com",
      password: "short",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/at least 8/i);
  });

  it("rejects a missing body", async () => {
    const response = await post("/api/auth/signup", {});
    expect(response.statusCode).toBe(400);
  });

  it("rejects a duplicate email (case-insensitively)", async () => {
    const first = await signup("dupe@example.com");
    expect(first.response.statusCode).toBe(201);

    const second = await post("/api/auth/signup", {
      email: "DUPE@example.com",
      password: VALID_PASSWORD,
    });

    expect(second.statusCode).toBe(409);
    expect(second.json().error).toMatch(/already exists/i);
  });
});

describe("POST /api/auth/login", () => {
  it("authenticates with valid credentials and establishes a session", async () => {
    await signup("member@example.com");

    const response = await post("/api/auth/login", {
      email: "member@example.com",
      password: VALID_PASSWORD,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: { id: expect.any(String), email: "member@example.com" },
      plan: "free",
      subscription: null,
    });

    const cookie = sessionCookieFrom(response)?.value;
    const me = await getMe(cookie);
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe("member@example.com");
  });

  it("rejects a wrong password with a generic error", async () => {
    await signup("member2@example.com");

    const response = await post("/api/auth/login", {
      email: "member2@example.com",
      password: "wrong password value",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe("Invalid email or password.");
    expect(sessionCookieFrom(response)).toBeUndefined();
  });

  it("rejects an unknown account with the same generic error", async () => {
    const response = await post("/api/auth/login", {
      email: "nobody@example.com",
      password: VALID_PASSWORD,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe("Invalid email or password.");
  });
});

describe("POST /api/auth/logout", () => {
  it("invalidates the session and clears the cookie (bodyless request)", async () => {
    const { cookie } = await signup("logout@example.com");

    expect((await getMe(cookie)).statusCode).toBe(200);

    const response = await logout(cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    const cleared = sessionCookieFrom(response)!;
    expect(cleared.value).toBe("");
    expect(new Date(cleared.expires ?? 0).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );

    // The old cookie value no longer resolves to a user server-side.
    expect((await getMe(cookie)).statusCode).toBe(401);
  });

  it("is a no-op for an unauthenticated request", async () => {
    const response = await logout();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});

describe("GET /api/auth/me", () => {
  it("returns the authenticated user", async () => {
    const { cookie } = await signup("me@example.com");

    const response = await getMe(cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: { id: expect.any(String), email: "me@example.com" },
      plan: "free",
      subscription: null,
    });
  });

  it("rejects an unauthenticated request", async () => {
    const response = await getMe();
    expect(response.statusCode).toBe(401);
  });

  it("ignores a tampered / garbage session cookie", async () => {
    const response = await getMe("not-a-real-signed-token");
    expect(response.statusCode).toBe(401);
  });
});

describe("security: the session is authoritative for identity", () => {
  it("does not let a client override the user via query or headers", async () => {
    const { cookie } = await signup("owner@example.com");
    const { response: other } = await signup("victim@example.com");
    const victimId = other.json().user.id;

    const response = await app.inject({
      method: "GET",
      url: `/api/auth/me?userId=${victimId}`,
      headers: { "x-user-id": victimId },
      cookies: { session: cookie! },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("owner@example.com");
    expect(response.json().user.id).not.toBe(victimId);
  });

  it("rejects an unauthenticated request even when a user id is supplied", async () => {
    const { response: created } = await signup("target@example.com");
    const targetId = created.json().user.id;

    const response = await getMe(undefined, `?userId=${targetId}`);
    expect(response.statusCode).toBe(401);
  });
});

describe("brute-force protection", () => {
  it("rate-limits repeated login attempts from the same client", async () => {
    await signup("brute@example.com");

    const attempt = () =>
      post("/api/auth/login", {
        email: "brute@example.com",
        password: "still the wrong password",
      });

    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await attempt()).statusCode);
    }

    expect(statuses.filter((s) => s === 401).length).toBe(10);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

describe("POST /api/auth/forgot-password", () => {
  it("returns the generic message and sends a link for a known account", async () => {
    await signup("reset-known@example.com");

    const response = await forgotPassword("Reset-Known@example.com");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: GENERIC_RESET_MESSAGE });
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.to).toBe("reset-known@example.com");
    expect(new URL(sentEmails[0]!.resetUrl).pathname).toBe("/reset-password");
  });

  it("returns the same response for an unknown account and sends nothing", async () => {
    const response = await forgotPassword("nobody-here@example.com");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: GENERIC_RESET_MESSAGE });
    expect(sentEmails).toHaveLength(0);
  });

  it("stores only a hash of the reset token, never the raw token", async () => {
    await signup("reset-hash@example.com");
    await forgotPassword("reset-hash@example.com");

    const rawToken = tokenFromLastEmail();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    expect(await repository.findPasswordResetTokenByHash(rawToken)).toBeNull();
    expect(
      await repository.findPasswordResetTokenByHash(tokenHash),
    ).not.toBeNull();
  });

  it("rate-limits repeated requests from the same client", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await forgotPassword("flood@example.com")).statusCode);
    }

    expect(statuses.filter((s) => s === 200).length).toBe(5);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/reset-password", () => {
  async function startReset(email: string) {
    await signup(email);
    await forgotPassword(email);
    return tokenFromLastEmail();
  }

  it("changes the password: the old one stops working and the new one works", async () => {
    const token = await startReset("reset-flow@example.com");

    const reset = await resetPassword(token, "a-brand-new-password");
    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ ok: true });

    const withOld = await post("/api/auth/login", {
      email: "reset-flow@example.com",
      password: VALID_PASSWORD,
    });
    expect(withOld.statusCode).toBe(401);

    const withNew = await post("/api/auth/login", {
      email: "reset-flow@example.com",
      password: "a-brand-new-password",
    });
    expect(withNew.statusCode).toBe(200);
  });

  it("invalidates existing sessions after a successful reset", async () => {
    await signup("reset-sessions@example.com");
    const login = await post("/api/auth/login", {
      email: "reset-sessions@example.com",
      password: VALID_PASSWORD,
    });
    const cookie = sessionCookieFrom(login)!.value;
    expect((await getMe(cookie)).statusCode).toBe(200);

    await forgotPassword("reset-sessions@example.com");
    await resetPassword(tokenFromLastEmail(), "yet-another-password");

    expect((await getMe(cookie)).statusCode).toBe(401);
  });

  it("cannot be reused once the token has been spent", async () => {
    const token = await startReset("reset-reuse@example.com");

    expect((await resetPassword(token, "first-new-password")).statusCode).toBe(
      200,
    );

    const second = await resetPassword(token, "second-new-password");
    expect(second.statusCode).toBe(400);
    expect(second.json().error).toMatch(/invalid or has expired/i);
  });

  it("rejects an expired token", async () => {
    const token = await startReset("reset-expired@example.com");

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60 * 1000);

    const response = await resetPassword(token, "too-late-password");

    vi.useRealTimers();
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/invalid or has expired/i);
  });

  it("rejects a garbage / unknown token", async () => {
    const response = await resetPassword(
      "this-is-not-a-real-token",
      "some-valid-password",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects a missing token", async () => {
    const response = await resetPassword(undefined, "some-valid-password");
    expect(response.statusCode).toBe(400);
  });

  it("rejects a new password that is too short", async () => {
    const token = await startReset("reset-shortpw@example.com");

    const response = await resetPassword(token, "short");
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/at least 8/i);

    // The token was not spent — a valid retry still works.
    expect(
      (await resetPassword(token, "a-proper-length-password")).statusCode,
    ).toBe(200);
  });
});
