import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import type { AnalysisRepository } from "../analyses/analysis-repository.js";
import { AnalysisLimitError } from "../analyses/analysis-service.js";
import { AnalysisError } from "../analyzer/runAnalysis.js";
import { type Plan } from "../billing/plan.js";
import { createCrawlService, type CrawlService } from "./crawl-service.js";
import type { CrawlRepository } from "./crawl-repository.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module "fastify" {
  interface FastifyInstance {
    crawlService?: CrawlService;
    /**
     * Pro-tool units (crawls + comparisons) the user has spent this month.
     * Read by `/api/usage` and the single-analysis guard so all three feature
     * types share one monthly allowance.
     */
    getExtraUsageUnits?: (userId: string) => Promise<number>;
  }
}

export type CrawlPluginOptions = {
  crawlRepository: CrawlRepository;
  analysisRepository: AnalysisRepository;
};

const crawlPluginImpl: FastifyPluginAsync<CrawlPluginOptions> = async (
  app,
  { crawlRepository, analysisRepository },
) => {
  const service = createCrawlService({
    crawls: crawlRepository,
    analyses: analysisRepository,
    onPageSpeedError: (error) =>
      app.log.warn({ error: String(error) }, "PageSpeed failed during crawl"),
  });

  app.decorate("crawlService", service);
  app.decorate("getExtraUsageUnits", (userId: string) =>
    service.unitsUsedSince(userId),
  );

  const planOf = (userId: string): Promise<Plan> =>
    app.getUserPlan ? app.getUserPlan(userId) : Promise.resolve("free");

  function fail(
    error: unknown,
    reply: FastifyReply,
    request: FastifyRequest,
  ): FastifyReply {
    if (error instanceof AnalysisLimitError) {
      return reply.status(429).send({
        error:
          "This would exceed your monthly allowance. A crawl costs 5 units and a comparison costs 2.",
        code: error.code,
      });
    }
    if (error instanceof AnalysisError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error(error, "Pro website tool failed");
    return reply
      .status(502)
      .send({ error: "The website could not be processed. Please try again." });
  }

  /** Resolves an owned project id from the body, or null. 404s a foreign one. */
  async function resolveProjectId(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string | null | undefined> {
    const body = (request.body ?? {}) as { projectId?: unknown };
    const raw = typeof body.projectId === "string" ? body.projectId : null;
    if (!raw) return null;
    if (app.projectService) {
      const owned = await app.projectService.get(request.user!.id, raw);
      if (!owned) {
        reply.status(404).send({ error: "Project not found." });
        return undefined;
      }
    }
    return raw;
  }

  app.post(
    "/api/crawl",
    {
      preHandler: app.requirePro,
      config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { url?: unknown };
      if (typeof body.url !== "string" || !body.url.trim()) {
        return reply.status(400).send({ error: "A website URL is required." });
      }
      const projectId = await resolveProjectId(request, reply);
      if (projectId === undefined) return;

      try {
        const { crawl, result } = await service.runCrawl(
          request.user!.id,
          await planOf(request.user!.id),
          { url: body.url.trim(), projectId },
        );
        return { crawl, result };
      } catch (error) {
        return fail(error, reply, request);
      }
    },
  );

  app.post(
    "/api/compare",
    {
      preHandler: app.requirePro,
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        url?: unknown;
        competitorUrl?: unknown;
      };
      if (typeof body.url !== "string" || !body.url.trim()) {
        return reply.status(400).send({ error: "Your website URL is required." });
      }
      if (
        typeof body.competitorUrl !== "string" ||
        !body.competitorUrl.trim()
      ) {
        return reply
          .status(400)
          .send({ error: "A competitor URL is required." });
      }
      const projectId = await resolveProjectId(request, reply);
      if (projectId === undefined) return;

      try {
        const { id, comparison } = await service.runComparison(
          request.user!.id,
          await planOf(request.user!.id),
          {
            url: body.url.trim(),
            competitorUrl: body.competitorUrl.trim(),
            projectId,
          },
        );
        return { id, comparison };
      } catch (error) {
        return fail(error, reply, request);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/crawls/:id",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!UUID_PATTERN.test(request.params.id)) {
        return reply.status(404).send({ error: "Crawl not found." });
      }
      const crawl = await service.getCrawl(
        request.params.id,
        request.user!.id,
      );
      if (!crawl) return reply.status(404).send({ error: "Crawl not found." });
      return crawl;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/comparisons/:id",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!UUID_PATTERN.test(request.params.id)) {
        return reply.status(404).send({ error: "Comparison not found." });
      }
      const comparison = await service.getComparison(
        request.params.id,
        request.user!.id,
      );
      if (!comparison) {
        return reply.status(404).send({ error: "Comparison not found." });
      }
      return comparison;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/projects/:id/crawls",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!UUID_PATTERN.test(request.params.id)) {
        return reply.status(404).send({ error: "Project not found." });
      }
      const owned = app.projectService
        ? await app.projectService.get(request.user!.id, request.params.id)
        : null;
      if (!owned) {
        return reply.status(404).send({ error: "Project not found." });
      }
      return { crawls: await service.listProjectCrawls(request.params.id) };
    },
  );
};

export const crawlPlugin = fp(crawlPluginImpl, {
  name: "crawler",
  dependencies: ["auth"],
});
