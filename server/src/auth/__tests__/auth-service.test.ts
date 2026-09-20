import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../password.js";
import { hashSessionToken, normalizeEmail } from "../auth-service.js";

describe("password hashing", () => {
  it("produces an Argon2id hash that verifies against the original password", async () => {
    const hash = await hashPassword("a-strong-password");

    expect(hash).not.toContain("a-strong-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "a-strong-password")).toBe(true);
    expect(await verifyPassword(hash, "the-wrong-password")).toBe(false);
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("hashSessionToken", () => {
  it("is deterministic and hides the raw token", () => {
    const token = "opaque-token-value";
    const hashed = hashSessionToken(token);

    expect(hashed).toBe(hashSessionToken(token));
    expect(hashed).not.toContain(token);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});
