import {
  analysisLimitForPlan,
  COMPARISON_COST_UNITS,
  CRAWL_COST_UNITS,
  MAX_CRAWL_PAGES,
  type Plan,
} from "../billing/plan.js";
import type { AnalysisRepository } from "../analyses/analysis-repository.js";
import {
  AnalysisLimitError,
  currentMonthStart,
} from "../analyses/analysis-service.js";
import { compareWebsites } from "./competitor.js";
import { crawlWebsite } from "./crawler.js";
import type {
  CrawlRepository,
  CrawlSummaryRow,
  StoredComparison,
  StoredCrawl,
} from "./crawl-repository.js";
import type { CompetitorComparison, CrawlResult } from "./types.js";

export type CrawlService = ReturnType<typeof createCrawlService>;

export function createCrawlService(deps: {
  crawls: CrawlRepository;
  analyses: AnalysisRepository;
  onPageSpeedError?: (error: unknown) => void;
}) {
  const { crawls, analyses, onPageSpeedError } = deps;

  /** All monthly allowance already consumed: single analyses + crawls + comparisons. */
  async function unitsUsed(userId: string, since: Date): Promise<number> {
    const [analysisCount, toolUnits] = await Promise.all([
      analyses.countForUserSince(userId, since),
      crawls.unitsUsedSince(userId, since),
    ]);
    return analysisCount + toolUnits;
  }

  /**
   * Cheap pre-check so we don't run an expensive crawl/comparison the user
   * clearly can't afford. The authoritative check is the atomic
   * `create*WithinLimit` after the work is done — that closes the race with
   * concurrent Pro-tool requests or analyses.
   */
  async function assertAllowance(
    userId: string,
    plan: Plan,
    cost: number,
  ): Promise<{ monthStart: Date; limit: number }> {
    const monthStart = currentMonthStart();
    const limit = analysisLimitForPlan(plan);
    const used = await unitsUsed(userId, monthStart);
    if (used + cost > limit) {
      throw new AnalysisLimitError();
    }
    return { monthStart, limit };
  }

  return {
    unitsUsedSince: (userId: string) =>
      crawls.unitsUsedSince(userId, currentMonthStart()),

    async runCrawl(
      userId: string,
      plan: Plan,
      input: { url: string; projectId: string | null },
    ): Promise<{ crawl: CrawlSummaryRow; result: CrawlResult }> {
      const { monthStart, limit } = await assertAllowance(
        userId,
        plan,
        CRAWL_COST_UNITS,
      );

      const result = await crawlWebsite(input.url, {
        maxPages: MAX_CRAWL_PAGES,
        onPageSpeedError,
      });

      const crawl = await crawls.createCrawlWithinLimit(
        {
          userId,
          projectId: input.projectId,
          rootUrl: result.rootUrl,
          score: result.summary.websiteScore,
          pagesAnalyzed: result.summary.pagesAnalyzed,
          brokenLinkCount: result.brokenLinks.total,
          cost: CRAWL_COST_UNITS,
          result,
        },
        { since: monthStart, limit, cost: CRAWL_COST_UNITS },
      );

      if (!crawl) {
        throw new AnalysisLimitError();
      }

      return { crawl, result };
    },

    async runComparison(
      userId: string,
      plan: Plan,
      input: {
        url: string;
        competitorUrl: string;
        projectId: string | null;
      },
    ): Promise<{ id: string; comparison: CompetitorComparison }> {
      const { monthStart, limit } = await assertAllowance(
        userId,
        plan,
        COMPARISON_COST_UNITS,
      );

      const comparison = await compareWebsites(
        input.url,
        input.competitorUrl,
        { onPageSpeedError },
      );

      const created = await crawls.createComparisonWithinLimit(
        {
          userId,
          projectId: input.projectId,
          yourUrl: comparison.you.url,
          competitorUrl: comparison.competitor.url,
          yourScore: comparison.you.score,
          competitorScore: comparison.competitor.score,
          cost: COMPARISON_COST_UNITS,
          result: comparison,
        },
        { since: monthStart, limit, cost: COMPARISON_COST_UNITS },
      );

      if (!created) {
        throw new AnalysisLimitError();
      }

      return { id: created.id, comparison };
    },

    getCrawl: (id: string, userId: string): Promise<StoredCrawl | null> =>
      crawls.getCrawl(id, userId),

    getComparison: (
      id: string,
      userId: string,
    ): Promise<StoredComparison | null> => crawls.getComparison(id, userId),

    listProjectCrawls: (
      projectId: string,
      limit = 20,
    ): Promise<CrawlSummaryRow[]> =>
      crawls.listCrawlsForProject(projectId, limit),
  };
}
