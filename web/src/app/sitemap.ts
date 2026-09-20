import type { MetadataRoute } from "next";

import { getArticles } from "../lib/blog";
import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

// Indexable routes served by the analyzer SPA (not this app), kept here
// because this app is the sole owner of sitemap.xml site-wide. The tool
// itself (`/app`) is intentionally left out — it's noindex.
const SPA_ROUTES = ["/app/pricing"];

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const STATIC_ROUTES: Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/seo-audit", changeFrequency: "monthly", priority: 0.9 },
  { path: "/serp-preview", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/about", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.2 },
  ...SPA_ROUTES.map(
    (path): Entry => ({ path, changeFrequency: "monthly", priority: 0.4 }),
  ),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticUrls = STATIC_ROUTES.map((route) => ({
    url: route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articleUrls = getArticles().map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticUrls, ...articleUrls];
}
