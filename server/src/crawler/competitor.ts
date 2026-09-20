import {
  runAnalysis,
  type AnalysisResult,
  type RunAnalysisOptions,
} from "../analyzer/runAnalysis.js";
import type { SeoData } from "../analyzer/seoRules.js";
import type {
  CompetitorComparison,
  CompetitorMetric,
  CompetitorSide,
} from "./types.js";

function hasOpenGraph(seo: SeoData): boolean {
  return Boolean(seo.ogTitle && seo.ogDescription && seo.ogImage);
}

function altCoverage(seo: SeoData): number | null {
  if (seo.imageCount === 0) return null;
  return Math.round(
    ((seo.imageCount - seo.imagesMissingAlt) / seo.imageCount) * 100,
  );
}

function side(result: AnalysisResult): CompetitorSide {
  return {
    url: result.url,
    score: result.score,
    issueCount: result.issues.length,
    performanceScore: result.seo.pageSpeed?.performanceScore ?? null,
  };
}

function buildMetrics(
  mine: AnalysisResult,
  theirs: AnalysisResult,
): CompetitorMetric[] {
  const a = mine.seo;
  const b = theirs.seo;

  const num = (
    label: string,
    you: number | null,
    competitor: number | null,
    higherIsBetter: boolean,
  ): CompetitorMetric => ({
    label,
    kind: "number",
    you,
    competitor,
    higherIsBetter,
  });

  const bool = (
    label: string,
    you: boolean,
    competitor: boolean,
  ): CompetitorMetric => ({
    label,
    kind: "boolean",
    you,
    competitor,
    higherIsBetter: true,
  });

  return [
    num("SEO score", mine.score, theirs.score, true),
    num(
      "Performance",
      a.pageSpeed?.performanceScore ?? null,
      b.pageSpeed?.performanceScore ?? null,
      true,
    ),
    num(
      "Internal links",
      a.internalLinks.internalLinks,
      b.internalLinks.internalLinks,
      true,
    ),
    num("Image alt coverage %", altCoverage(a), altCoverage(b), true),
    num("Images missing alt", a.imagesMissingAlt, b.imagesMissingAlt, false),
    num("Total issues detected", mine.issues.length, theirs.issues.length, false),
    bool("Title tag", Boolean(a.title), Boolean(b.title)),
    bool("Meta description", Boolean(a.metaDescription), Boolean(b.metaDescription)),
    bool("H1", a.h1Count >= 1, b.h1Count >= 1),
    bool("Canonical URL", Boolean(a.canonical), Boolean(b.canonical)),
    bool("HTTPS", a.https, b.https),
    bool("robots.txt", a.robotsTxt, b.robotsTxt),
    bool("XML sitemap", a.sitemapXml, b.sitemapXml),
    bool("Open Graph", hasOpenGraph(a), hasOpenGraph(b)),
    bool("Twitter / X card", Boolean(a.twitterCard), Boolean(b.twitterCard)),
  ];
}

/** Data-backed suggestions only — never an invented competitor advantage. */
function buildOpportunities(
  mine: AnalysisResult,
  theirs: AnalysisResult,
): string[] {
  const a = mine.seo;
  const b = theirs.seo;
  const items: { text: string; weight: number }[] = [];

  if (
    a.internalLinks.internalLinks < b.internalLinks.internalLinks &&
    b.internalLinks.internalLinks - a.internalLinks.internalLinks >= 5
  ) {
    items.push({
      text: `Improve internal linking — your homepage has ${a.internalLinks.internalLinks} internal links, the competitor has ${b.internalLinks.internalLinks}.`,
      weight: 3,
    });
  }

  if (a.imagesMissingAlt > 0) {
    items.push({
      text: `Add alt text to ${a.imagesMissingAlt} image${
        a.imagesMissingAlt === 1 ? "" : "s"
      } missing it.`,
      weight: 2,
    });
  }

  const myPerf = a.pageSpeed?.performanceScore;
  const theirPerf = b.pageSpeed?.performanceScore;
  if (
    typeof myPerf === "number" &&
    typeof theirPerf === "number" &&
    theirPerf - myPerf >= 10
  ) {
    items.push({
      text: `Improve Core Web Vitals — your performance score is ${myPerf}, the competitor's is ${theirPerf}.`,
      weight: 3,
    });
  }

  if (!a.metaDescription && b.metaDescription) {
    items.push({ text: "Add a meta description to the homepage.", weight: 2 });
  }
  if (!a.canonical && b.canonical) {
    items.push({ text: "Add a canonical tag to the homepage.", weight: 1 });
  }
  if (!a.sitemapXml && b.sitemapXml) {
    items.push({ text: "Publish an XML sitemap.", weight: 1 });
  }
  if (!a.robotsTxt && b.robotsTxt) {
    items.push({ text: "Add a robots.txt file.", weight: 1 });
  }
  if (a.h1Count === 0 && b.h1Count >= 1) {
    items.push({ text: "Add an H1 heading to the homepage.", weight: 2 });
  }
  if (!hasOpenGraph(a) && hasOpenGraph(b)) {
    items.push({
      text: "Add Open Graph tags for better link previews.",
      weight: 1,
    });
  }

  return items
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 5)
    .map((item) => item.text);
}

/**
 * Compares the user's homepage against a competitor's homepage. Both sites are
 * analyzed with the existing single-page analyzer (SSRF-protected, with
 * PageSpeed). The competitor's site is NOT crawled.
 */
export async function compareWebsites(
  myUrl: string,
  competitorUrl: string,
  options: RunAnalysisOptions = {},
): Promise<CompetitorComparison> {
  const [mine, theirs] = await Promise.all([
    runAnalysis(myUrl, options),
    runAnalysis(competitorUrl, options),
  ]);

  return {
    you: side(mine),
    competitor: side(theirs),
    metrics: buildMetrics(mine, theirs),
    opportunities: buildOpportunities(mine, theirs),
    analyses: { you: mine, competitor: theirs },
  };
}
