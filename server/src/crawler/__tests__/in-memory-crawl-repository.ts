import { randomUUID } from "node:crypto";

import type {
  AllowanceQuota,
  CrawlRepository,
  CrawlSummaryRow,
  NewComparison,
  NewCrawl,
  StoredComparison,
  StoredCrawl,
} from "../crawl-repository.js";

/**
 * In-memory `CrawlRepository` for tests. Optionally shares the analyses list so
 * the combined-allowance check in `create*WithinLimit` sees single analyses too
 * (matches the Postgres implementation, which queries all three tables).
 */
export function createInMemoryCrawlRepository(
  analysisCountSince: (userId: string, since: Date) => number = () => 0,
): CrawlRepository {
  const crawlRows: (StoredCrawl & { userId: string; cost: number })[] = [];
  const comparisonRows: (StoredComparison & {
    userId: string;
    cost: number;
  })[] = [];

  const summary = (
    row: StoredCrawl & { userId: string },
  ): CrawlSummaryRow => ({
    id: row.id,
    projectId: row.projectId,
    rootUrl: row.rootUrl,
    score: row.score,
    pagesAnalyzed: row.pagesAnalyzed,
    brokenLinkCount: row.brokenLinkCount,
    createdAt: row.createdAt,
  });

  const insertCrawl = (input: NewCrawl) => {
    const row = {
      id: randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      rootUrl: input.rootUrl,
      score: input.score,
      pagesAnalyzed: input.pagesAnalyzed,
      brokenLinkCount: input.brokenLinkCount,
      cost: input.cost,
      createdAt: new Date(Date.now() + crawlRows.length),
      result: input.result,
    };
    crawlRows.push(row);
    return summary(row);
  };

  const insertComparison = (input: NewComparison) => {
    const row = {
      id: randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      yourUrl: input.yourUrl,
      competitorUrl: input.competitorUrl,
      yourScore: input.yourScore,
      competitorScore: input.competitorScore,
      cost: input.cost,
      createdAt: new Date(Date.now() + comparisonRows.length),
      result: input.result,
    };
    comparisonRows.push(row);
    return { id: row.id };
  };

  const usedSince = (userId: string, since: Date): number => {
    const inWindow = (createdAt: Date) =>
      createdAt.getTime() >= since.getTime();
    return (
      analysisCountSince(userId, since) +
      crawlRows
        .filter((r) => r.userId === userId && inWindow(r.createdAt))
        .reduce((sum, r) => sum + r.cost, 0) +
      comparisonRows
        .filter((r) => r.userId === userId && inWindow(r.createdAt))
        .reduce((sum, r) => sum + r.cost, 0)
    );
  };

  return {
    async createCrawl(input: NewCrawl) {
      return insertCrawl(input);
    },

    async createCrawlWithinLimit(input: NewCrawl, quota: AllowanceQuota) {
      if (usedSince(input.userId, quota.since) + quota.cost > quota.limit) {
        return null;
      }
      return insertCrawl(input);
    },

    async createComparisonWithinLimit(
      input: NewComparison,
      quota: AllowanceQuota,
    ) {
      if (usedSince(input.userId, quota.since) + quota.cost > quota.limit) {
        return null;
      }
      return insertComparison(input);
    },

    async getCrawl(id, userId) {
      const row = crawlRows.find((r) => r.id === id && r.userId === userId);
      return row ? { ...summary(row), result: row.result } : null;
    },

    async listCrawlsForProject(projectId, limit) {
      return crawlRows
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
        .map(summary);
    },

    async createComparison(input: NewComparison) {
      return insertComparison(input);
    },

    async getComparison(id, userId) {
      const row = comparisonRows.find(
        (r) => r.id === id && r.userId === userId,
      );
      if (!row) return null;
      const { userId: _userId, cost: _cost, ...rest } = row;
      return rest;
    },

    async unitsUsedSince(userId, since) {
      const inWindow = (createdAt: Date) =>
        createdAt.getTime() >= since.getTime();
      return (
        crawlRows
          .filter((r) => r.userId === userId && inWindow(r.createdAt))
          .reduce((sum, r) => sum + r.cost, 0) +
        comparisonRows
          .filter((r) => r.userId === userId && inWindow(r.createdAt))
          .reduce((sum, r) => sum + r.cost, 0)
      );
    },
  };
}
