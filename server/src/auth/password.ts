import { hash, verify } from "@node-rs/argon2";

/**
 * Hashes a plaintext password using Argon2id (the library default). We never
 * store or log the plaintext.
 */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/**
 * Verifies a plaintext password against a stored Argon2 hash. Returns `false`
 * (rather than throwing) for malformed hashes so callers have a single code
 * path for "authentication failed".
 */
export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
