import * as cheerio from "cheerio";

export function analyzeSitemap(
  text: string,
  contentType: string,
) {
  const looksLikeXml =
    contentType.includes("xml") ||
    text.trim().startsWith("<");

  if (!looksLikeXml) {
    return {
      sitemapXml: false,
      sitemapUrlCount: 0,
    };
  }

  const $ = cheerio.load(text, {
    xmlMode: true,
  });

  return {
    sitemapXml: true,
    sitemapUrlCount: $("url").length,
  };
}
