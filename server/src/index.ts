import Fastify from "fastify";
import cors from "@fastify/cors";
import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

import { analyzeSeo, calculateSeoScore } from "./analyzer/seoRules.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: ["http://localhost:5173", "https://seo.webxdevelop.com"],
});

const USER_AGENT = "WebsiteSEOOpportunityAnalyzer/1.0";

/**
 * Returns true only if `url` is http(s), has no embedded credentials,
 * and every resolved IP address is a public unicast address (i.e. not
 * private, loopback, link-local, carrier-grade NAT, reserved, etc).
 *
 * Defined at module scope (not inside the route handler) so it's
 * reachable from fetchWithTimeout below, which revalidates it on
 * every redirect hop.
 */
async function isSafeUrl(url: string): Promise<boolean> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return false;
  }

  if (parsedUrl.username || parsedUrl.password) {
    return false;
  }

  const hostname = parsedUrl.hostname;

  if (!hostname) {
    return false;
  }

  // Remove brackets around IPv6 addresses
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");

  // If the hostname itself is an IP address, validate it directly
  if (ipaddr.isValid(normalizedHostname)) {
    const address = ipaddr.parse(normalizedHostname);

    return address.range() === "unicast";
  }

  // Resolve hostname and make sure ALL resolved addresses are public
  try {
    const addresses = await dns.lookup(normalizedHostname, {
      all: true,
    });

    if (!addresses.length) {
      return false;
    }

    for (const { address } of addresses) {
      if (!ipaddr.isValid(address)) {
        return false;
      }

      const parsedAddress = ipaddr.parse(address);

      if (parsedAddress.range() !== "unicast") {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  timeout = 10000,
  maxRedirects = 5,
): Promise<Response | null> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const safe = await isSafeUrl(currentUrl);

    if (!safe) {
      return null;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
        redirect: "manual",
      });

      // Not a redirect
      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = response.headers.get("location");

      if (!location) {
        return response;
      }

      // Resolve relative redirects
      currentUrl = new URL(location, currentUrl).href;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
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
