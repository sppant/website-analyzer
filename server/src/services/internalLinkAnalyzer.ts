import * as cheerio from "cheerio";

export type InternalLinkDetail = {
  url: string;
  anchor: string;
};

export type InternalLinkData = {
  totalLinks: number;
  internalLinks: number;
  uniqueInternalUrls: number;
  externalLinks: number;

  emptyAnchorLinks: number;
  genericAnchorLinks: number;
  httpInternalLinks: number;
  selfLinks: number;

  internalUrls: string[];

  emptyAnchorDetails: InternalLinkDetail[];
  genericAnchorDetails: InternalLinkDetail[];
  httpInternalDetails: InternalLinkDetail[];

  mostLinkedPages: {
    url: string;
    count: number;
  }[];
};

const GENERIC_ANCHORS = new Set([
  "click here",
  "here",
  "read more",
  "learn more",
  "more",
  "find out more",
  "see more",
  "view more",
  "details",
  "this",
  "link",
]);

function normalizeUrl(url: URL): string {
  url.hash = "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.href;
}

function isInternalUrl(url: URL, pageUrl: URL): boolean {
  return url.hostname === pageUrl.hostname;
}

export function analyzeInternalLinks(
  html: string,
  pageUrl: URL,
): InternalLinkData {
  const $ = cheerio.load(html);

  const links = $("a[href]");

  const internalUrls: string[] = [];
  const internalUrlCounts = new Map<string, number>();

  const emptyAnchorDetails: InternalLinkDetail[] = [];
  const genericAnchorDetails: InternalLinkDetail[] = [];
  const httpInternalDetails: InternalLinkDetail[] = [];

  let internalLinks = 0;
  let externalLinks = 0;
  let emptyAnchorLinks = 0;
  let genericAnchorLinks = 0;
  let httpInternalLinks = 0;
  let selfLinks = 0;

  links.each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const trimmedHref = href.trim();

    if (
      !trimmedHref ||
      trimmedHref.startsWith("#") ||
      trimmedHref.startsWith("mailto:") ||
      trimmedHref.startsWith("tel:") ||
      trimmedHref.startsWith("javascript:")
    ) {
      return;
    }

    let resolvedUrl: URL;

    try {
      resolvedUrl = new URL(trimmedHref, pageUrl.href);
    } catch {
      return;
    }

    if (!["http:", "https:"].includes(resolvedUrl.protocol)) {
      return;
    }

    const anchor = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const normalizedUrl = normalizeUrl(resolvedUrl);
    const internal = isInternalUrl(resolvedUrl, pageUrl);

    if (internal) {
      internalLinks++;

      internalUrls.push(normalizedUrl);

      internalUrlCounts.set(
        normalizedUrl,
        (internalUrlCounts.get(normalizedUrl) ?? 0) + 1,
      );

      if (normalizedUrl === normalizeUrl(new URL(pageUrl.href))) {
        selfLinks++;
      }

      if (anchor === "") {
        emptyAnchorLinks++;

        emptyAnchorDetails.push({
          url: normalizedUrl,
          anchor: "",
        });
      }

      if (GENERIC_ANCHORS.has(anchor.toLowerCase())) {
        genericAnchorLinks++;

        genericAnchorDetails.push({
          url: normalizedUrl,
          anchor,
        });
      }

      if (resolvedUrl.protocol === "http:") {
        httpInternalLinks++;

        httpInternalDetails.push({
          url: normalizedUrl,
          anchor,
        });
      }
    } else {
      externalLinks++;
    }
  });

  const mostLinkedPages = Array.from(
    internalUrlCounts.entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({
      url,
      count,
    }));

  return {
    totalLinks: internalLinks + externalLinks,
    internalLinks,
    uniqueInternalUrls: internalUrlCounts.size,
    externalLinks,

    emptyAnchorLinks,
    genericAnchorLinks,
    httpInternalLinks,
    selfLinks,

    internalUrls: Array.from(
      internalUrlCounts.keys(),
    ),

    emptyAnchorDetails,
    genericAnchorDetails,
    httpInternalDetails,

    mostLinkedPages,
  };
}
