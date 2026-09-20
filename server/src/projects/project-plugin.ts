import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { projectLimitForPlan, type Plan } from "../billing/plan.js";
import type { AnalysisRepository } from "../analyses/analysis-repository.js";
import {
  createProjectService,
  ProjectError,
  type ProjectService,
} from "./project-service.js";
import type { ProjectRepository } from "./project-repository.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module "fastify" {
  interface FastifyInstance {
    /** Present only when the projects plugin is registered (requires a DB). */
    projectService?: ProjectService;
  }
}

export type ProjectPluginOptions = {
  projectRepository: ProjectRepository;
  analysisRepository: AnalysisRepository;
};

function planOf(app: {
  getUserPlan?: (userId: string) => Promise<Plan>;
}): (userId: string) => Promise<Plan> {
  return (userId) =>
    app.getUserPlan ? app.getUserPlan(userId) : Promise.resolve("free");
}

const projectPluginImpl: FastifyPluginAsync<ProjectPluginOptions> = async (
  app,
  { projectRepository, analysisRepository },
) => {
  const service = createProjectService({
    projects: projectRepository,
    analyses: analysisRepository,
  });
  app.decorate("projectService", service);

  const getPlan = planOf(app);

  function fail(error: unknown, reply: FastifyReply, request: FastifyRequest) {
    if (error instanceof ProjectError) {
      return reply
        .status(error.statusCode)
        .send({ error: error.message, code: error.code });
    }
    request.log.error(error, "Project request failed");
    return reply.status(500).send({ error: "Something went wrong." });
  }

  const validId = (id: string, reply: FastifyReply): boolean => {
    if (UUID_PATTERN.test(id)) return true;
    reply.status(404).send({ error: "Project not found." });
    return false;
  };

  app.get(
    "/api/projects",
    { preHandler: app.requireAuth },
    async (request) => {
      const plan = await getPlan(request.user!.id);
      return {
        projects: await service.list(request.user!.id),
        limit: projectLimitForPlan(plan),
      };
    },
  );

  app.post(
    "/api/projects",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const body = (request.body ?? {}) as { name?: unknown; url?: unknown };
      try {
        const plan = await getPlan(request.user!.id);
        const project = await service.create(request.user!.id, plan, {
          name: String(body.name ?? ""),
          url: String(body.url ?? ""),
        });
        return reply.status(201).send({ project });
      } catch (error) {
        return fail(error, reply, request);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/projects/:id",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const project = await service.get(request.user!.id, request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found." });
      }
      return { project };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/projects/:id",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const body = (request.body ?? {}) as { name?: unknown; url?: unknown };
      const patch: { name?: string; url?: string } = {};
      if (body.name !== undefined) patch.name = String(body.name);
      if (body.url !== undefined) patch.url = String(body.url);

      try {
        const project = await service.rename(
          request.user!.id,
          request.params.id,
          patch,
        );
        if (!project) {
          return reply.status(404).send({ error: "Project not found." });
        }
        return { project };
      } catch (error) {
        return fail(error, reply, request);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/projects/:id",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const removed = await service.remove(
        request.user!.id,
        request.params.id,
      );
      if (!removed) {
        return reply.status(404).send({ error: "Project not found." });
      }
      return reply.status(204).send();
    },
  );

  // --- Pro-only: history, comparison, export -----------------------------

  app.get<{ Params: { id: string } }>(
    "/api/projects/:id/analyses",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const analyses = await service.listAnalyses(
        request.user!.id,
        request.params.id,
      );
      if (analyses === null) {
        return reply.status(404).send({ error: "Project not found." });
      }
      return { analyses };
    },
  );

  app.get<{
    Params: { id: string };
    Querystring: { before?: string; after?: string };
  }>(
    "/api/projects/:id/compare",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const { before, after } = request.query;
      if (!before || !after) {
        return reply
          .status(400)
          .send({ error: "before and after analysis ids are required." });
      }
      try {
        const comparison = await service.compare(
          request.user!.id,
          request.params.id,
          before,
          after,
        );
        return { comparison };
      } catch (error) {
        return fail(error, reply, request);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/projects/:id/export.csv",
    { preHandler: app.requirePro },
    async (request, reply) => {
      if (!validId(request.params.id, reply)) return;
      const csv = await service.exportCsv(
        request.user!.id,
        request.params.id,
      );
      if (csv === null) {
        return reply.status(404).send({ error: "Project not found." });
      }
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header(
          "content-disposition",
          `attachment; filename="project-${request.params.id}.csv"`,
        )
        .send(csv);
    },
  );
};

export const projectPlugin = fp(projectPluginImpl, {
  name: "projects",
  dependencies: ["auth"],
});
