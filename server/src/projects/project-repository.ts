import { and, count, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { projects, users } from "../db/schema.js";

export type Project = {
  id: string;
  userId: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewProject = {
  userId: string;
  name: string;
  url: string;
};

export interface ProjectRepository {
  listForUser(userId: string): Promise<Project[]>;
  countForUser(userId: string): Promise<number>;
  create(project: NewProject): Promise<Project>;
  /**
   * Atomically re-checks the user's project count under a per-user row lock and
   * inserts. Returns the new project, or `null` if the user is already at
   * `limit` (a lost race with a concurrent create).
   */
  createWithinLimit(
    project: NewProject,
    limit: number,
  ): Promise<Project | null>;
  getForUser(id: string, userId: string): Promise<Project | null>;
  update(
    id: string,
    userId: string,
    patch: { name?: string; url?: string },
  ): Promise<Project | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

export function createDrizzleProjectRepository(
  db: Database,
): ProjectRepository {
  return {
    async listForUser(userId) {
      return db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));
    },

    async countForUser(userId) {
      const [row] = await db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.userId, userId));
      return row?.value ?? 0;
    },

    async create(project) {
      const [row] = await db.insert(projects).values(project).returning();
      return row!;
    },

    async createWithinLimit(project, limit) {
      return db.transaction(async (tx) => {
        // Serialize concurrent creates for this user by locking their row.
        await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, project.userId))
          .for("update");

        const [countRow] = await tx
          .select({ value: count() })
          .from(projects)
          .where(eq(projects.userId, project.userId));

        if ((countRow?.value ?? 0) >= limit) {
          return null;
        }

        const [row] = await tx.insert(projects).values(project).returning();
        return row ?? null;
      });
    },

    async getForUser(id, userId) {
      const [row] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);
      return row ?? null;
    },

    async update(id, userId, patch) {
      const [row] = await db
        .update(projects)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning();
      return row ?? null;
    },

    async delete(id, userId) {
      const deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning({ id: projects.id });
      return deleted.length > 0;
    },
  };
}
