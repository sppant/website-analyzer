import { and, count, desc, eq, gte } from "drizzle-orm";

import type { AnalysisResult } from "../analyzer/runAnalysis.js";
import type { Database } from "../db/client.js";
import { analyses, users } from "../db/schema.js";

export type NewAnalysis = {
  userId: string;
  url: string;
  score: number;
  statusCode: number;
  result: AnalysisResult;
  /** Set when the analysis was run for a tracked project. */
  projectId?: string | null;
};

/** Row shape for the history list — no `result` payload. */
export type AnalysisSummary = {
  id: string;
  url: string;
  score: number;
  statusCode: number;
  projectId: string | null;
  createdAt: Date;
};

/** A single stored analysis including its full result. */
export type StoredAnalysis = AnalysisSummary & {
  result: AnalysisResult;
};

export interface AnalysisRepository {
  /** How many analyses the user has stored on/after `since`. */
  countForUserSince(userId: string, since: Date): Promise<number>;

  /**
   * Atomically re-checks the monthly count under a per-user lock and inserts
   * the analysis. Returns the stored summary, or `null` if the limit was
   * already reached (a lost race with a concurrent request).
   */
  createWithinLimit(
    analysis: NewAnalysis,
    quota: { since: Date; limit: number; extraUnits?: number },
  ): Promise<AnalysisSummary | null>;

  listForUser(userId: string, limit: number): Promise<AnalysisSummary[]>;

  /** Returns the analysis only if it belongs to `userId`. */
  getForUser(id: string, userId: string): Promise<StoredAnalysis | null>;

  /** All analyses for a project, newest first. */
  listForProject(projectId: string, limit: number): Promise<AnalysisSummary[]>;

  /** The most recent analysis for a project, full payload. */
  latestForProject(projectId: string): Promise<StoredAnalysis | null>;

  countForProject(projectId: string): Promise<number>;
}

const SUMMARY_COLUMNS = {
  id: analyses.id,
  url: analyses.url,
  score: analyses.score,
  statusCode: analyses.statusCode,
  projectId: analyses.projectId,
  createdAt: analyses.createdAt,
} as const;

function toStored(row: typeof analyses.$inferSelect): StoredAnalysis {
  return {
    id: row.id,
    url: row.url,
    score: row.score,
    statusCode: row.statusCode,
    projectId: row.projectId,
    createdAt: row.createdAt,
    result: row.result as AnalysisResult,
  };
}

export function createDrizzleAnalysisRepository(
  db: Database,
): AnalysisRepository {
  return {
    async countForUserSince(userId, since) {
      const [row] = await db
        .select({ value: count() })
        .from(analyses)
        .where(
          and(eq(analyses.userId, userId), gte(analyses.createdAt, since)),
        );

      return row?.value ?? 0;
    },

    async createWithinLimit(analysis, quota) {
      return db.transaction(async (tx) => {
        // Serialize concurrent analyses for this user by locking their row.
        await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, analysis.userId))
          .for("update");

        const [countRow] = await tx
          .select({ value: count() })
          .from(analyses)
          .where(
            and(
              eq(analyses.userId, analysis.userId),
              gte(analyses.createdAt, quota.since),
            ),
          );

        if (
          (countRow?.value ?? 0) + (quota.extraUnits ?? 0) >=
          quota.limit
        ) {
          return null;
        }

        const [row] = await tx
          .insert(analyses)
          .values({
            userId: analysis.userId,
            projectId: analysis.projectId ?? null,
            url: analysis.url,
            score: analysis.score,
            statusCode: analysis.statusCode,
            result: analysis.result,
          })
          .returning(SUMMARY_COLUMNS);

        return row ?? null;
      });
    },

    async listForUser(userId, limit) {
      return db
        .select(SUMMARY_COLUMNS)
        .from(analyses)
        .where(eq(analyses.userId, userId))
        .orderBy(desc(analyses.createdAt))
        .limit(limit);
    },

    async getForUser(id, userId) {
      const [row] = await db
        .select()
        .from(analyses)
        .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
        .limit(1);

      return row ? toStored(row) : null;
    },

    async listForProject(projectId, limit) {
      return db
        .select(SUMMARY_COLUMNS)
        .from(analyses)
        .where(eq(analyses.projectId, projectId))
        .orderBy(desc(analyses.createdAt))
        .limit(limit);
    },

    async latestForProject(projectId) {
      const [row] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.projectId, projectId))
        .orderBy(desc(analyses.createdAt))
        .limit(1);

      return row ? toStored(row) : null;
    },

    async countForProject(projectId) {
      const [row] = await db
        .select({ value: count() })
        .from(analyses)
        .where(eq(analyses.projectId, projectId));

      return row?.value ?? 0;
    },
  };
}
