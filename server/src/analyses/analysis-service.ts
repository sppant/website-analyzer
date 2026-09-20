import {
  runAnalysis,
  type AnalysisResult,
  type RunAnalysisOptions,
} from "../analyzer/runAnalysis.js";
import type {
  AnalysisRepository,
  AnalysisSummary,
  StoredAnalysis,
} from "./analysis-repository.js";

const HISTORY_LIMIT = 100;

/**
 * Raised when an authenticated user has used all of their analyses for the
 * current calendar month. Mapped to HTTP 429 by the route.
 */
export class AnalysisLimitError extends Error {
  readonly statusCode = 429;
  readonly code = "ANALYSIS_LIMIT_REACHED";

  constructor() {
    super("Monthly analysis limit reached.");
    this.name = "AnalysisLimitError";
  }
}

/** Start of the current calendar month, in UTC. */
export function currentMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Start of the next calendar month, in UTC — when the quota resets. */
export function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export type UsageSummary = {
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp of the next monthly reset. */
  resetsAt: string;
};

export type RunForUserOptions = RunAnalysisOptions & {
  /** The user's plan-appropriate monthly limit, resolved by the caller. */
  limit: number;
  /**
   * Allowance already spent on heavier Pro tools (crawls / comparisons) this
   * month. Counted alongside stored analyses so all features share one budget.
   */
  extraUnits?: number;
  /** Attach the analysis to a tracked project (ownership verified by the caller). */
  projectId?: string | null;
};

export type AnalysisService = ReturnType<typeof createAnalysisService>;

/**
 * Usage enforcement + persistence for authenticated analyses. This layer is
 * told the effective monthly `limit` by the caller (which resolves the plan);
 * it stays free of any plan / billing knowledge, and `runAnalysis` itself stays
 * free of users and the database.
 */
export function createAnalysisService(repository: AnalysisRepository) {
  async function getUsage(
    userId: string,
    limit: number,
    extraUnits = 0,
  ): Promise<UsageSummary> {
    const analysisCount = await repository.countForUserSince(
      userId,
      currentMonthStart(),
    );
    const used = analysisCount + extraUnits;

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetsAt: nextMonthStart().toISOString(),
    };
  }

  return {
    getUsage,

    /**
     * Runs an analysis for an authenticated user, enforcing the monthly quota
     * and persisting the result.
     *
     * A usage slot is consumed only on a fully successful, persisted analysis:
     * if `runAnalysis` throws (bad URL, unreachable site, ...) nothing is saved
     * and nothing is counted.
     */
    async runForUser(
      userId: string,
      url: string,
      options: RunForUserOptions,
    ): Promise<AnalysisResult> {
      const { limit, extraUnits = 0, projectId, ...runOptions } = options;
      const monthStart = currentMonthStart();

      // Cheap pre-check so we don't run an analysis the user can't keep.
      const used = await repository.countForUserSince(userId, monthStart);
      if (used + extraUnits >= limit) {
        throw new AnalysisLimitError();
      }

      // The engine is DB/auth-unaware. If it throws, we never reach persistence.
      const result = await runAnalysis(url, runOptions);

      // Atomic re-check + insert closes the race with a concurrent request.
      const saved = await repository.createWithinLimit(
        {
          userId,
          projectId: projectId ?? null,
          url: result.url,
          score: result.score,
          statusCode: result.statusCode,
          result,
        },
        { since: monthStart, limit, extraUnits },
      );

      if (!saved) {
        throw new AnalysisLimitError();
      }

      return result;
    },

    listHistory(userId: string): Promise<AnalysisSummary[]> {
      return repository.listForUser(userId, HISTORY_LIMIT);
    },

    getAnalysis(id: string, userId: string): Promise<StoredAnalysis | null> {
      return repository.getForUser(id, userId);
    },
  };
}
