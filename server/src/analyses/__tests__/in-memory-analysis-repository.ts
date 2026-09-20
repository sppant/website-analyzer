import { randomUUID } from "node:crypto";

import type { AnalysisResult } from "../../analyzer/runAnalysis.js";
import type {
  AnalysisRepository,
  AnalysisSummary,
  StoredAnalysis,
} from "../analysis-repository.js";
import type { AnalysisRow } from "../../db/schema.js";

/**
 * In-memory `AnalysisRepository` for tests. Node is single-threaded so
 * `createWithinLimit` is naturally atomic here; the Postgres implementation
 * uses a per-user row lock to get the same guarantee under real concurrency.
 */
export function createInMemoryAnalysisRepository(): AnalysisRepository {
  const rows: AnalysisRow[] = [];

  const toSummary = (row: AnalysisRow): AnalysisSummary => ({
    id: row.id,
    url: row.url,
    score: row.score,
    statusCode: row.statusCode,
    projectId: row.projectId,
    createdAt: row.createdAt,
  });

  const toStored = (row: AnalysisRow): StoredAnalysis => ({
    ...toSummary(row),
    result: row.result as AnalysisResult,
  });

  const countSince = (userId: string, since: Date) =>
    rows.filter(
      (row) =>
        row.userId === userId && row.createdAt.getTime() >= since.getTime(),
    ).length;

  const newestFirst = (a: AnalysisRow, b: AnalysisRow) =>
    b.createdAt.getTime() - a.createdAt.getTime();

  return {
    async countForUserSince(userId, since) {
      return countSince(userId, since);
    },

    async createWithinLimit(analysis, quota) {
      if (
        countSince(analysis.userId, quota.since) + (quota.extraUnits ?? 0) >=
        quota.limit
      ) {
        return null;
      }

      const row: AnalysisRow = {
        id: randomUUID(),
        userId: analysis.userId,
        projectId: analysis.projectId ?? null,
        url: analysis.url,
        score: analysis.score,
        statusCode: analysis.statusCode,
        result: analysis.result,
        // Nudge timestamps forward so ordering is stable within a test.
        createdAt: new Date(Date.now() + rows.length),
      };
      rows.push(row);
      return toSummary(row);
    },

    async listForUser(userId, limit) {
      return rows
        .filter((row) => row.userId === userId)
        .sort(newestFirst)
        .slice(0, limit)
        .map(toSummary);
    },

    async getForUser(id, userId) {
      const row = rows.find(
        (candidate) => candidate.id === id && candidate.userId === userId,
      );
      return row ? toStored(row) : null;
    },

    async listForProject(projectId, limit) {
      return rows
        .filter((row) => row.projectId === projectId)
        .sort(newestFirst)
        .slice(0, limit)
        .map(toSummary);
    },

    async latestForProject(projectId) {
      const [row] = rows
        .filter((r) => r.projectId === projectId)
        .sort(newestFirst);
      return row ? toStored(row) : null;
    },

    async countForProject(projectId) {
      return rows.filter((row) => row.projectId === projectId).length;
    },
  };
}
