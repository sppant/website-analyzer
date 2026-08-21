export function analyzeRobotsTxt(text: string) {
  const normalizedRobots = text.toLowerCase();

  const hasSitemap = normalizedRobots.includes("sitemap:");

  let blocksAll = false;
  let currentUserAgent = "";

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
  }

  return {
    robotsTxt: true,
    robotsTxtHasSitemap: hasSitemap,
    robotsTxtBlocksAll: blocksAll,
  };
}
