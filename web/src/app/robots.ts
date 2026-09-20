import type { MetadataRoute } from "next";

import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API and SPA sub-routes with no search value. `/app` itself (the
      // analyzer) is crawlable but noindex — not disallowed, so Google can see
      // the noindex + canonical.
      disallow: [
        "/api/",
        "/app/dashboard",
        "/app/analyses/",
        "/app/projects/",
        "/app/login",
        "/app/signup",
        "/app/forgot-password",
        "/app/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
