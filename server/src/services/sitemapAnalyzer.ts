import * as cheerio from "cheerio";

export type SitemapType = "urlset" | "index" | null;

export type SitemapDocument = {
  /** `"urlset"` for a regular sitemap, `"index"` for a sitemap index, `null` if the body is not a sitemap. */
  type: SitemapType;
  /** `<url>` entries for a urlset, `<sitemap>` entries for an index. `0` if the body could not be parsed. */
  count: number;
};

// Root-element detection is done on the raw text so namespace prefixes
// (`<sm:urlset>`) and unusual formatting still match. Both patterns are linear.
const INDEX_ROOT = /<(?:[a-z0-9]+:)?sitemapindex[\s/>]/i;
const URLSET_ROOT = /<(?:[a-z0-9]+:)?urlset[\s/>]/i;

/**
 * Decides whether a fetched document is a valid sitemap, and of which kind.
 *
 * A 200 response is not enough — the body must actually contain a `<urlset>` or
 * `<sitemapindex>` root. An HTML page, an RSS feed, or an error page served
 * with a 200 all return `type: null`.
 *
 * Child sitemaps of an index are counted but not fetched — establishing that a
 * valid sitemap exists is all this phase needs.
 */
export function parseSitemapDocument(text: string): SitemapDocument {
  const isIndex = INDEX_ROOT.test(text);
  const isUrlset = !isIndex && URLSET_ROOT.test(text);

  if (!isIndex && !isUrlset) {
    return { type: null, count: 0 };
  }

  let count = 0;
  try {
    const $ = cheerio.load(text, { xmlMode: true });
    count = isIndex ? $("sitemap").length : $("url").length;
  } catch {
    // A valid-looking root that fails to parse is still a sitemap; we just
    // cannot report a count for it.
  }

  return { type: isIndex ? "index" : "urlset", count };
}
