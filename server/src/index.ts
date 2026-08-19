import Fastify from "fastify";
import cors from "@fastify/cors";
import * as cheerio from "cheerio";

import { analyzeSeo, calculateSeoScore } from "./analyzer/seoRules.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: "https://seo.webxdevelop.com",
});

const USER_AGENT = "WebsiteSEOOpportunityAnalyzer/1.0";

async function fetchWithTimeout(
  url: string,
  timeout = 10000,
): Promise<Response | null> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/health", async () => {
  return {
    status: "ok",
  };
});

app.post("/api/analyze", async (request, reply) => {
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

  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return reply.status(400).send({
        error: "Only HTTP and HTTPS URLs are supported.",
      });
    }

    /*
     * Fetch homepage
     */
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

    const html = await response.text();

    const $ = cheerio.load(html);

    /*
     * Basic SEO
     */
    const title = $("title").first().text().trim();

    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || null;

    const h1Elements = $("h1");

    const h1s = h1Elements
      .map((_, element) => $(element).text().trim())
      .get()
      .filter(Boolean);

    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;

    const language = $("html").attr("lang")?.trim() || null;

    const viewport = $('meta[name="viewport"]').attr("content")?.trim() || null;

    /*
     * Images
     */
    const images = $("img");

    const imagesMissingAlt = images.filter((_, element) => {
      return !$(element).attr("alt");
    }).length;

    /*
     * Open Graph
     */
    const ogTitle =
      $('meta[property="og:title"]').attr("content")?.trim() || null;

    const ogDescription =
      $('meta[property="og:description"]').attr("content")?.trim() || null;

    const ogImage =
      $('meta[property="og:image"]').attr("content")?.trim() || null;

    /*
     * Twitter
     */
    const twitterCard =
      $('meta[name="twitter:card"]').attr("content")?.trim() || null;

    /*
     * Technical files
     */
    const origin = parsedUrl.origin;

    const robotsUrl = new URL("/robots.txt", origin).href;

    const sitemapUrl = new URL("/sitemap.xml", origin).href;

    const [robotsResponse, sitemapResponse] = await Promise.all([
      fetchWithTimeout(robotsUrl, 5000),
      fetchWithTimeout(sitemapUrl, 5000),
    ]);

    /*
     * robots.txt analysis
     */
    let robotsTxt = false;
    let robotsTxtHasSitemap = false;
    let robotsTxtBlocksAll = false;

    if (robotsResponse && robotsResponse.ok) {
      robotsTxt = true;

      const robotsText = await robotsResponse.text();

      const normalizedRobots = robotsText.toLowerCase();

      robotsTxtHasSitemap = normalizedRobots.includes("sitemap:");

      const lines = robotsText.split(/\r?\n/);

      let currentUserAgent = "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
          continue;
        }

        const separator = line.indexOf(":");

        if (separator === -1) {
          continue;
        }

        const directive = line.slice(0, separator).trim().toLowerCase();

        const value = line.slice(separator + 1).trim();

        if (directive === "user-agent") {
          currentUserAgent = value.toLowerCase();

          continue;
        }

        if (
          directive === "disallow" &&
          currentUserAgent === "*" &&
          value === "/"
        ) {
          robotsTxtBlocksAll = true;
        }
      }
    }

    /*
     * Sitemap analysis
     */
    let sitemapXml = false;
    let sitemapUrlCount = 0;

    if (sitemapResponse && sitemapResponse.ok) {
      const sitemapText = await sitemapResponse.text();

      const contentType = sitemapResponse.headers.get("content-type") || "";

      const looksLikeXml =
        contentType.includes("xml") || sitemapText.trim().startsWith("<");

      if (looksLikeXml) {
        sitemapXml = true;

        const sitemap$ = cheerio.load(sitemapText, {
          xmlMode: true,
        });

        sitemapUrlCount = sitemap$("url").length;
      }
    }

    /*
     * SEO data
     */
    const seo = {
      title,
      titleLength: title.length,

      metaDescription,
      metaDescriptionLength: metaDescription?.length ?? 0,

      h1Count: h1s.length,
      h1s,

      canonical,
      language,
      viewport,

      imageCount: images.length,

      imagesMissingAlt,

      https: parsedUrl.protocol === "https:",

      robotsTxt,
      robotsTxtHasSitemap,
      robotsTxtBlocksAll,

      sitemapXml,
      sitemapUrlCount,

      ogTitle,
      ogDescription,
      ogImage,

      twitterCard,
    };

    /*
     * Score
     */
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
    console.error("ANALYSIS ERROR:", error);

    return reply.status(500).send({
      error:
        error instanceof Error
          ? error.message
          : "Unable to analyze the website.",
    });
  }
});

try {
  await app.listen({
    port: Number(process.env.PORT) || 3000,

    host: "127.0.0.1",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
