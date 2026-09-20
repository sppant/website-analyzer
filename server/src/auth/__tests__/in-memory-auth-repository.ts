import { randomUUID } from "node:crypto";

import { DuplicateEmailError, type AuthRepository } from "../auth-repository.js";
import type {
  PasswordResetTokenRow,
  SessionRow,
  UserRow,
} from "../../db/schema.js";

/**
 * In-memory `AuthRepository` for tests. Mirrors the behaviour the Postgres
 * implementation relies on: unique emails, cascade-free session lookups, etc.
 */
export function createInMemoryAuthRepository(): AuthRepository {
  const usersById = new Map<string, UserRow>();
  const sessionsById = new Map<string, SessionRow>();
  const resetTokensById = new Map<string, PasswordResetTokenRow>();

  return {
    async createUser({ email, passwordHash }) {
      for (const existing of usersById.values()) {
        if (existing.email === email) {
          throw new DuplicateEmailError();
        }
      }

      const now = new Date();
      const user: UserRow = {
        id: randomUUID(),
        email,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      usersById.set(user.id, user);
      return user;
    },

    async findUserByEmail(email) {
      for (const user of usersById.values()) {
        if (user.email === email) return user;
      }
      return null;
    },

    async findUserById(id) {
      return usersById.get(id) ?? null;
    },

    async updateUserPassword({ userId, passwordHash }) {
      const user = usersById.get(userId);
      if (!user) return;
      usersById.set(userId, {
        ...user,
        passwordHash,
        updatedAt: new Date(),
      });
    },

    async createSession({ id, userId, expiresAt }) {
      sessionsById.set(id, {
        id,
        userId,
        createdAt: new Date(),
        expiresAt,
      });
    },

    async findSessionWithUser(id) {
      const session = sessionsById.get(id);
      if (!session) return null;

      const user = usersById.get(session.userId);
      if (!user) return null;

      return { session, user };
    },

    async deleteSession(id) {
      sessionsById.delete(id);
    },

    async deleteSessionsForUser(userId) {
      for (const [id, session] of sessionsById) {
        if (session.userId === userId) sessionsById.delete(id);
      }
    },

    async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
      const id = randomUUID();
      resetTokensById.set(id, {
        id,
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
      });
    },

    async findPasswordResetTokenByHash(tokenHash) {
      for (const token of resetTokensById.values()) {
        if (token.tokenHash === tokenHash) return token;
      }
      return null;
    },

    async consumePasswordResetToken(id, usedAt) {
      const token = resetTokensById.get(id);
      if (!token || token.usedAt !== null) return false;
      resetTokensById.set(id, { ...token, usedAt });
      return true;
    },

    async deletePasswordResetTokensForUser(userId) {
      for (const [id, token] of resetTokensById) {
        if (token.userId === userId) resetTokensById.delete(id);
      }
    },

    async deleteExpiredPasswordResetTokens(now) {
      for (const [id, token] of resetTokensById) {
        if (token.expiresAt.getTime() < now.getTime()) {
          resetTokensById.delete(id);
        }
      }
    },
  };
}
