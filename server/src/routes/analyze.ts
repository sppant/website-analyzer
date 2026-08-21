import type { FastifyPluginAsync } from "fastify";

import {
  analyzeSeo,
  calculateSeoScore,
} from "../analyzer/seoRules.js";

import { fetchWithTimeout } from "../services/fetcher.js";
import { extractSeoData } from "../services/seoAnalyzer.js";
import { analyzeRobotsTxt } from "../services/robotsAnalyzer.js";
import { analyzeSitemap } from "../services/sitemapAnalyzer.js";

import { readResponseWithLimit } from "../utils/readResponse.js";
import { isSafeUrl } from "../utils/safeUrl.js";

const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_ROBOTS_BYTES = 1 * 1024 * 1024;
const MAX_SITEMAP_BYTES = 5 * 1024 * 1024;

export const analyzeRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/analyze",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      if (
        !body ||
        typeof body !== "object" ||
        !("url" in body)
      ) {
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

      try {
        const parsedUrl = new URL(url);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return reply.status(400).send({
            error: "Only HTTP and HTTPS URLs are supported.",
          });
        }

        if (parsedUrl.username || parsedUrl.password) {
          return reply.status(400).send({
            error: "URLs containing credentials are not supported.",
          });
        }

        if (!(await isSafeUrl(parsedUrl.href))) {
          return reply.status(400).send({
            error: "This URL cannot be analyzed.",
          });
        }

        const response = await fetchWithTimeout(parsedUrl.href);

        if (!response) {
          return reply.status(400).send({
            error: "The website did not respond within the allowed time.",
          });
        }

        if (!response.ok) {
          return reply.status(400).send({
            error: `Website returned HTTP ${response.status}`,
          });
        }

        const html = await readResponseWithLimit(
          response,
          MAX_HTML_BYTES,
        );

        if (html === null) {
          return reply.status(400).send({
            error: "The website response is too large to analyze.",
          });
        }

        const seo = extractSeoData(html, parsedUrl);

        const origin = parsedUrl.origin;

        const robotsUrl = new URL(
          "/robots.txt",
          origin,
        ).href;

        const sitemapUrl = new URL(
          "/sitemap.xml",
          origin,
        ).href;

        const [robotsResponse, sitemapResponse] =
          await Promise.all([
            fetchWithTimeout(robotsUrl, 5000),
            fetchWithTimeout(sitemapUrl, 5000),
          ]);

        if (robotsResponse?.ok) {
          const robotsText = await readResponseWithLimit(
            robotsResponse,
            MAX_ROBOTS_BYTES,
          );

          if (robotsText !== null) {
            Object.assign(
              seo,
              analyzeRobotsTxt(robotsText),
            );
          }
        }

        if (sitemapResponse?.ok) {
          const sitemapText = await readResponseWithLimit(
            sitemapResponse,
            MAX_SITEMAP_BYTES,
          );

          if (sitemapText !== null) {
            Object.assign(
              seo,
              analyzeSitemap(
                sitemapText,
                sitemapResponse.headers.get("content-type") || "",
              ),
            );
          }
        }

        const issues = analyzeSeo(seo);
        const score = calculateSeoScore(issues);

        return {
          url: parsedUrl.href,
          statusCode: response.status,
          seo,
          score,
          issues,
        };
      } catch (error) {
        app.log.error(error);

        return reply.status(500).send({
          error:
            error instanceof Error
              ? error.message
              : "Unable to analyze the website.",
        });
      }
    },
  );
};
