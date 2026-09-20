import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { analysisLimitForPlan, type Plan } from "../billing/plan.js";
import type { AnalysisRepository } from "./analysis-repository.js";
import {
  createAnalysisService,
  type AnalysisService,
} from "./analysis-service.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module "fastify" {
  interface FastifyInstance {
    /** Present only when the analysis plugin is registered (requires a DB). */
    analysisService?: AnalysisService;
  }
}

export type AnalysisPluginOptions = {
  repository: AnalysisRepository;
};

/** Effective plan for a user — defaults to Free if billing is not wired. */
export async function planFor(
  app: FastifyInstance,
  userId: string,
): Promise<Plan> {
  return app.getUserPlan ? app.getUserPlan(userId) : "free";
}

const analysisPluginImpl: FastifyPluginAsync<AnalysisPluginOptions> = async (
  app,
  { repository },
) => {
  const analysisService = createAnalysisService(repository);
  app.decorate("analysisService", analysisService);

  app.get(
    "/api/usage",
    { preHandler: app.requireAuth },
    async (request) => {
      const userId = request.user!.id;
      const plan = await planFor(app, userId);
      const extraUnits = app.getExtraUsageUnits
        ? await app.getExtraUsageUnits(userId)
        : 0;
      const usage = await analysisService.getUsage(
        userId,
        analysisLimitForPlan(plan),
        extraUnits,
      );
      return { plan, ...usage };
    },
  );

  // Browsing saved history is a Pro feature. Free users can still run analyses
  // (that path is guarded only by `requireAuth` in the analyze route) and keep
  // one project — they just can't reopen individual past analyses.
  app.get(
    "/api/analyses",
    { preHandler: app.requirePro },
    async (request) => {
      const analyses = await analysisService.listHistory(request.user!.id);
      return { analyses };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/analyses/:id",
    { preHandler: app.requirePro },
    async (request, reply) => {
      const { id } = request.params;

      if (!UUID_PATTERN.test(id)) {
        return reply.status(404).send({ error: "Analysis not found." });
      }

      const analysis = await analysisService.getAnalysis(
        id,
        request.user!.id,
      );

      if (!analysis) {
        return reply.status(404).send({ error: "Analysis not found." });
      }

      return analysis;
    },
  );
};

/**
 * Registered with `fastify-plugin` so `app.analysisService` is available to the
 * analyze route (which lives in a sibling plugin).
 */
export const analysisPlugin = fp(analysisPluginImpl, {
  name: "analyses",
  dependencies: ["auth"],
});
