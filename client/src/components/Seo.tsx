import { useEffect } from "react";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "../lib/site";

type SeoProps = {
  /** Page <title>. Keep under ~60 characters. */
  title: string;
  /** Meta description. Keep around 150–160 characters. */
  description: string;
  /** Route path, e.g. "/features". Drives the canonical URL. */
  path: string;
  /** Set for pages that should not be indexed (auth, dashboard, 404). */
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
 * Keeps the document <head> in sync with the active route in this SPA.
 *
 * The base metadata for the homepage is also in the static `index.html`, so
 * social scrapers (which do not run JS) always get a sensible card. Googlebot
 * renders the app and picks up these per-route values. See the SEO notes in
 * the README for the SPA rendering tradeoff.
 */
export function Seo({
  title,
  description,
  path,
  noindex,
  image,
  ogType = "website",
  publishedTime,
  modifiedTime,
}: SeoProps) {
  useEffect(() => {
    // The SPA is served under /app (see vite.config.ts `base` + the router
    // basename). Callers pass their in-app route path ("/", "/pricing", …);
    // canonical / OG URLs need the /app prefix to match the real URL.
    const appPath =
      path === "/"
        ? "/app"
        : path.startsWith("/app")
          ? path
          : `/app${path}`;
    const canonical = `${SITE_URL}${appPath}`;
    const imageUrl = image
      ? image.startsWith("http")
        ? image
        : `${SITE_URL}${image}`
      : DEFAULT_OG_IMAGE;

    document.title = title;

    setMeta("name", "description", description);
    setLink("canonical", canonical);
    setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");

    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", imageUrl);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);

    // Article-only tags — removed on non-article routes so they don't linger.
    toggleMeta("property", "article:published_time", ogType === "article" ? publishedTime : undefined);
    toggleMeta("property", "article:modified_time", ogType === "article" ? modifiedTime : undefined);
  }, [title, description, path, noindex, image, ogType, publishedTime, modifiedTime]);

  return null;
}

function setMeta(
  attr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function toggleMeta(
  attr: "name" | "property",
  key: string,
  content: string | undefined,
): void {
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content) {
    setMeta(attr, key, content);
  } else {
    existing?.remove();
  }
}

function setLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default Seo;
