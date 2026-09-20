import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "./site";

type SeoInput = {
  /** Page title. Keep under ~60 characters. */
  title: string;
  /** Meta description. Keep around 150–160 characters. */
  description: string;
  /** Route path, e.g. "/features". Drives the canonical URL. */
  path: string;
  /** Set for pages that should not be indexed. */
  noindex?: boolean;
  /** Absolute or root-relative image URL for social cards. */
  image?: string;
  /** `og:type` — defaults to "website"; use "article" for blog posts. */
  ogType?: "website" | "article";
  /** ISO date for `article:published_time` (only used when ogType is "article"). */
  publishedTime?: string;
  /** ISO date for `article:modified_time`. */
  modifiedTime?: string;
};

/**
 * Next.js Metadata API equivalent of the SPA's `client/src/components/Seo.tsx`.
 * Because this app is server/build rendered, the resulting tags land in the
 * actual HTML response — unlike the SPA, link-preview scrapers (Slack,
 * LinkedIn, X) see the correct per-page card without running JS.
 */
export function buildMetadata({
  title,
  description,
  path,
  noindex,
  image,
  ogType = "website",
  publishedTime,
  modifiedTime,
}: SeoInput): Metadata {
  const canonical = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image}`
    : DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [imageUrl],
      ...(ogType === "article"
        ? { publishedTime, modifiedTime: modifiedTime ?? undefined }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
