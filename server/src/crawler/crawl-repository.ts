import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { analyses, comparisons, crawls, users } from "../db/schema.js";
import type { CompetitorComparison, CrawlResult } from "./types.js";

export type NewCrawl = {
  userId: string;
  projectId: string | null;
  rootUrl: string;
  score: number;
  pagesAnalyzed: number;
  brokenLinkCount: number;
  cost: number;
  result: CrawlResult;
};

export type CrawlSummaryRow = {
  id: string;
  projectId: string | null;
  rootUrl: string;
  score: number;
  pagesAnalyzed: number;
  brokenLinkCount: number;
  createdAt: Date;
};

export type StoredCrawl = CrawlSummaryRow & { result: CrawlResult };

export type NewComparison = {
  userId: string;
  projectId: string | null;
  yourUrl: string;
  competitorUrl: string;
  yourScore: number;
  competitorScore: number;
  cost: number;
  result: CompetitorComparison;
};

export type StoredComparison = {
  id: string;
  projectId: string | null;
  yourUrl: string;
  competitorUrl: string;
  yourScore: number;
  competitorScore: number;
  createdAt: Date;
  result: CompetitorComparison;
};

/**
 * The monthly allowance window + ceiling, shared by single analyses and the
 * Pro tools. `used` is `count(analyses) + sum(crawls.cost) + sum(comparisons.cost)`
 * since `since`; the operation is allowed only while `used + cost <= limit`.
 */
export type AllowanceQuota = { since: Date; limit: number; cost: number };

export interface CrawlRepository {
  createCrawl(input: NewCrawl): Promise<CrawlSummaryRow>;
  /**
   * Atomically re-checks the combined monthly allowance under a per-user row
   * lock and inserts the crawl. Returns `null` if it would exceed the limit
   * (a lost race with a concurrent Pro-tool request or analysis).
   */
  createCrawlWithinLimit(
    input: NewCrawl,
    quota: AllowanceQuota,
  ): Promise<CrawlSummaryRow | null>;
  getCrawl(id: string, userId: string): Promise<StoredCrawl | null>;
  listCrawlsForProject(
    projectId: string,
    limit: number,
  ): Promise<CrawlSummaryRow[]>;

  createComparison(input: NewComparison): Promise<{ id: string }>;
  /** Atomic combined-allowance check + insert (see `createCrawlWithinLimit`). */
  createComparisonWithinLimit(
    input: NewComparison,
    quota: AllowanceQuota,
  ): Promise<{ id: string } | null>;
  getComparison(id: string, userId: string): Promise<StoredComparison | null>;

  /** Total Pro-tool units (crawls + comparisons) charged since `since`. */
  unitsUsedSince(userId: string, since: Date): Promise<number>;
}

const CRAWL_SUMMARY = {
  id: crawls.id,
  projectId: crawls.projectId,
  rootUrl: crawls.rootUrl,
  score: crawls.score,
  pagesAnalyzed: crawls.pagesAnalyzed,
  brokenLinkCount: crawls.brokenLinkCount,
  createdAt: crawls.createdAt,
} as const;

export function createDrizzleCrawlRepository(db: Database): CrawlRepository {
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

  /** Combined monthly allowance already spent by the user, inside a tx. */
  async function usedInWindow(
    tx: Tx,
    userId: string,
    since: Date,
  ): Promise<number> {
    const [analysisRow] = await tx
      .select({ value: count() })
      .from(analyses)
      .where(and(eq(analyses.userId, userId), gte(analyses.createdAt, since)));
    const [crawlRow] = await tx
      .select({ total: sql<number>`coalesce(sum(${crawls.cost}), 0)` })
      .from(crawls)
      .where(and(eq(crawls.userId, userId), gte(crawls.createdAt, since)));
    const [comparisonRow] = await tx
      .select({ total: sql<number>`coalesce(sum(${comparisons.cost}), 0)` })
      .from(comparisons)
      .where(
        and(
          eq(comparisons.userId, userId),
          gte(comparisons.createdAt, since),
        ),
      );
    return (
      (analysisRow?.value ?? 0) +
      Number(crawlRow?.total ?? 0) +
      Number(comparisonRow?.total ?? 0)
    );
  }

  return {
    async createCrawl(input) {
      const [row] = await db
        .insert(crawls)
        .values({
          userId: input.userId,
          projectId: input.projectId,
          rootUrl: input.rootUrl,
          score: input.score,
          pagesAnalyzed: input.pagesAnalyzed,
          brokenLinkCount: input.brokenLinkCount,
          cost: input.cost,
          result: input.result,
        })
        .returning(CRAWL_SUMMARY);
      return row!;
    },

    async createCrawlWithinLimit(input, quota) {
      return db.transaction(async (tx) => {
        await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.userId))
          .for("update");

        const used = await usedInWindow(tx, input.userId, quota.since);
        if (used + quota.cost > quota.limit) {
          return null;
        }

        const [row] = await tx
          .insert(crawls)
          .values({
            userId: input.userId,
            projectId: input.projectId,
            rootUrl: input.rootUrl,
            score: input.score,
            pagesAnalyzed: input.pagesAnalyzed,
            brokenLinkCount: input.brokenLinkCount,
            cost: input.cost,
            result: input.result,
          })
          .returning(CRAWL_SUMMARY);
        return row ?? null;
      });
    },

    async createComparisonWithinLimit(input, quota) {
      return db.transaction(async (tx) => {
        await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.userId))
          .for("update");

        const used = await usedInWindow(tx, input.userId, quota.since);
        if (used + quota.cost > quota.limit) {
          return null;
        }

        const [row] = await tx
          .insert(comparisons)
          .values({
            userId: input.userId,
            projectId: input.projectId,
            yourUrl: input.yourUrl,
            competitorUrl: input.competitorUrl,
            yourScore: input.yourScore,
            competitorScore: input.competitorScore,
            cost: input.cost,
            result: input.result,
          })
          .returning({ id: comparisons.id });
        return row ?? null;
      });
    },

    async getCrawl(id, userId) {
      const [row] = await db
        .select()
        .from(crawls)
        .where(and(eq(crawls.id, id), eq(crawls.userId, userId)))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        projectId: row.projectId,
        rootUrl: row.rootUrl,
        score: row.score,
        pagesAnalyzed: row.pagesAnalyzed,
        brokenLinkCount: row.brokenLinkCount,
        createdAt: row.createdAt,
        result: row.result as CrawlResult,
      };
    },

    async listCrawlsForProject(projectId, limit) {
      return db
        .select(CRAWL_SUMMARY)
        .from(crawls)
        .where(eq(crawls.projectId, projectId))
        .orderBy(desc(crawls.createdAt))
        .limit(limit);
    },

    async createComparison(input) {
      const [row] = await db
        .insert(comparisons)
        .values({
          userId: input.userId,
          projectId: input.projectId,
          yourUrl: input.yourUrl,
          competitorUrl: input.competitorUrl,
          yourScore: input.yourScore,
          competitorScore: input.competitorScore,
          cost: input.cost,
          result: input.result,
        })
        .returning({ id: comparisons.id });
      return row!;
    },

    async getComparison(id, userId) {
      const [row] = await db
        .select()
        .from(comparisons)
        .where(and(eq(comparisons.id, id), eq(comparisons.userId, userId)))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        projectId: row.projectId,
        yourUrl: row.yourUrl,
        competitorUrl: row.competitorUrl,
        yourScore: row.yourScore,
        competitorScore: row.competitorScore,
        createdAt: row.createdAt,
        result: row.result as CompetitorComparison,
      };
    },

    async unitsUsedSince(userId, since) {
      const [crawlSum] = await db
        .select({ total: sql<number>`coalesce(sum(${crawls.cost}), 0)` })
        .from(crawls)
        .where(
          and(eq(crawls.userId, userId), gte(crawls.createdAt, since)),
        );
      const [comparisonSum] = await db
        .select({
          total: sql<number>`coalesce(sum(${comparisons.cost}), 0)`,
        })
        .from(comparisons)
        .where(
          and(
            eq(comparisons.userId, userId),
            gte(comparisons.createdAt, since),
          ),
        );
      return Number(crawlSum?.total ?? 0) + Number(comparisonSum?.total ?? 0);
    },
  };
}
