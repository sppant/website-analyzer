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

  emptyAnchorDetails: {
    url: string;
    anchor: string;
  }[];

  genericAnchorDetails: {
    url: string;
    anchor: string;
  }[];

  httpInternalDetails: {
    url: string;
    anchor: string;
  }[];

  mostLinkedPages: {
    url: string;
    count: number;
  }[];
};

export type SeoData = {
  title: string;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1s: string[];
  canonical: string | null;
  language: string | null;
  viewport: string | null;
  imageCount: number;
  imagesMissingAlt: number;
  https: boolean;
  robotsTxt: boolean;
  robotsTxtHasSitemap: boolean;
  robotsTxtBlocksAll: boolean;
  sitemapXml: boolean;
  sitemapUrlCount: number;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;

  internalLinks: InternalLinkData;
};

export type SeoIssue = {
  type: string;
  severity: "critical" | "important" | "opportunity";
  title: string;
  description: string;
  recommendation: string;
  points: number;
};

export type AnalysisResult = {
  url: string;
  statusCode: number;
  seo: SeoData;
  score: number;
  issues: SeoIssue[];
};
