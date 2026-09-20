import { and, eq, isNull, lt } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  passwordResetTokens,
  sessions,
  users,
  type PasswordResetTokenRow,
  type SessionRow,
  type UserRow,
} from "../db/schema.js";

/**
 * Thrown by `AuthRepository.createUser` when the email is already taken. The
 * Postgres implementation derives this from the unique-constraint violation so
 * the service layer does not need to know database error codes.
 */
export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

/**
 * The persistence operations the auth layer needs. Keeping this as an interface
 * lets the tests run against a fast in-memory implementation while production
 * uses Postgres, without a live database in `npm test`.
 */
export interface AuthRepository {
  createUser(input: {
    email: string;
    passwordHash: string;
  }): Promise<UserRow>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  updateUserPassword(input: {
    userId: string;
    passwordHash: string;
  }): Promise<void>;

  createSession(input: {
    id: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;
  findSessionWithUser(
    id: string,
  ): Promise<{ session: SessionRow; user: UserRow } | null>;
  deleteSession(id: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;

  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRow | null>;
  /** Marks the token used only if it was still unused. Returns whether it did. */
  consumePasswordResetToken(id: string, usedAt: Date): Promise<boolean>;
  deletePasswordResetTokensForUser(userId: string): Promise<void>;
  deleteExpiredPasswordResetTokens(now: Date): Promise<void>;
}

export function createDrizzleAuthRepository(db: Database): AuthRepository {
  return {
    async createUser({ email, passwordHash }) {
      try {
        const [row] = await db
          .insert(users)
          .values({ email, passwordHash })
          .returning();

        return row!;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DuplicateEmailError();
        }
        throw error;
      }
    },

    async findUserByEmail(email) {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return row ?? null;
    },

    async findUserById(id) {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return row ?? null;
    },

    async updateUserPassword({ userId, passwordHash }) {
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async createSession({ id, userId, expiresAt }) {
      await db.insert(sessions).values({ id, userId, expiresAt });
    },

    async findSessionWithUser(id) {
      const [row] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.id, id))
        .limit(1);

      return row ?? null;
    },

    async deleteSession(id) {
      await db.delete(sessions).where(eq(sessions.id, id));
    },

    async deleteSessionsForUser(userId) {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    },

    async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
      await db
        .insert(passwordResetTokens)
        .values({ userId, tokenHash, expiresAt });
    },

    async findPasswordResetTokenByHash(tokenHash) {
      const [row] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .limit(1);

      return row ?? null;
    },

    async consumePasswordResetToken(id, usedAt) {
      const updated = await db
        .update(passwordResetTokens)
        .set({ usedAt })
        .where(
          and(
            eq(passwordResetTokens.id, id),
            isNull(passwordResetTokens.usedAt),
          ),
        )
        .returning({ id: passwordResetTokens.id });

      return updated.length > 0;
    },

    async deletePasswordResetTokensForUser(userId) {
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
    },

    async deleteExpiredPasswordResetTokens(now) {
      await db
        .delete(passwordResetTokens)
        .where(lt(passwordResetTokens.expiresAt, now));
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
