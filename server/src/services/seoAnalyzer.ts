import * as cheerio from "cheerio";

export function extractSeoData(html: string, url: URL) {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();

  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;

  const h1s = $("h1")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const canonical =
    $('link[rel="canonical"]').attr("href")?.trim() || null;

  const language = $("html").attr("lang")?.trim() || null;

  const viewport =
    $('meta[name="viewport"]').attr("content")?.trim() || null;

  const images = $("img");

  const imagesMissingAlt = images.filter((_, element) => {
    return !$(element).attr("alt");
  }).length;

  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() || null;

  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || null;

  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() || null;

  const twitterCard =
    $('meta[name="twitter:card"]').attr("content")?.trim() || null;

  return {
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

    https: url.protocol === "https:",

    robotsTxt: false,
    robotsTxtHasSitemap: false,
    robotsTxtBlocksAll: false,

    sitemapXml: false,
    sitemapUrlCount: 0,

    ogTitle,
    ogDescription,
    ogImage,

    twitterCard,
  };
}
