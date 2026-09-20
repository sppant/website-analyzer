export function analyzeRobotsTxt(text: string) {
  const normalizedRobots = text.toLowerCase();

  const hasSitemap = normalizedRobots.includes("sitemap:");

  let blocksAll = false;
  let currentUserAgent = "";
  const sitemapUrls: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const directive = line
      .slice(0, separator)
      .trim()
      .toLowerCase();

    const value = line
      .slice(separator + 1)
      .trim();

    if (directive === "user-agent") {
      currentUserAgent = value.toLowerCase();
      continue;
    }

    if (
      directive === "disallow" &&
      currentUserAgent === "*" &&
      value === "/"
    ) {
      blocksAll = true;
    }

    // `Sitemap:` is a global directive (not scoped to a user-agent group).
    if (directive === "sitemap" && value) {
      sitemapUrls.push(value);
    }
  }

  return {
    robotsTxt: true,
    robotsTxtHasSitemap: hasSitemap,
    robotsTxtBlocksAll: blocksAll,
    /** Absolute URLs from `Sitemap:` directives, in file order. */
    sitemapUrls,
  };
}
