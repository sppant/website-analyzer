import type { FastifyPluginAsync } from "fastify";

import { planFor } from "../analyses/analysis-plugin.js";
import { AnalysisLimitError } from "../analyses/analysis-service.js";
import { AnalysisError, runAnalysis } from "../analyzer/runAnalysis.js";
import { analysisLimitForPlan } from "../billing/plan.js";

export const analyzeRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/analyze",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "5 minute",
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      if (!body || typeof body !== "object" || !("url" in body)) {
        return reply.status(400).send({
          error: "URL is required",
        });
      }

      const url = body.url;

      if (typeof url !== "string" || !url.trim()) {
        return reply.status(400).send({
          error: "URL is required",
        });
      }

      // Reject a syntactically invalid URL here so the analyzer engine never
      // throws a raw TypeError that would surface as a 500.
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return reply.status(400).send({
            error: "Only HTTP and HTTPS URLs are supported.",
          });
        }
      } catch {
        return reply.status(400).send({
          error: "Enter a valid URL, including https://",
        });
      }

      const projectIdRaw =
        "projectId" in body ? (body as { projectId?: unknown }).projectId : null;
      const projectId =
        typeof projectIdRaw === "string" && projectIdRaw ? projectIdRaw : null;

      const onPageSpeedError = (error: unknown) => {
        app.log.warn(
          {
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
          },
          "PageSpeed analysis failed",
        );
      };

      // The user's plan is resolved here (the authorization layer), never by
      // the analyzer engine. `plan` stays null for anonymous requests.
      let plan: string | null = null;

      try {
        if (request.user && app.analysisService) {
          const resolvedPlan = await planFor(app, request.user.id);
          plan = resolvedPlan;

          // A projectId is only honoured when it belongs to the caller.
          if (projectId && app.projectService) {
            const owned = await app.projectService.get(
              request.user.id,
              projectId,
            );
            if (!owned) {
              return reply
                .status(404)
                .send({ error: "Project not found." });
            }
          }

          const extraUnits = app.getExtraUsageUnits
            ? await app.getExtraUsageUnits(request.user.id)
            : 0;

          return await app.analysisService.runForUser(request.user.id, url, {
            limit: analysisLimitForPlan(resolvedPlan),
            extraUnits,
            projectId: app.projectService ? projectId : null,
            onPageSpeedError,
          });
        }

        return await runAnalysis(url, { onPageSpeedError });
      } catch (error) {
        if (error instanceof AnalysisLimitError) {
          return reply.status(error.statusCode).send({
            error: error.message,
            code: error.code,
            plan: plan ?? "free",
          });
        }

        if (error instanceof AnalysisError) {
          return reply.status(error.statusCode).send({
            error: error.message,
          });
        }

        // Unexpected failure: log the detail server-side, return a safe generic
        // message so internal errors never leak to the client.
        app.log.error({ err: error }, "Unexpected error while analyzing a URL");

        return reply.status(500).send({
          error: "Unable to analyze the website. Please try again.",
        });
      }
    },
  );
};
