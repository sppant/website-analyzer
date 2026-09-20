/**
 * Canonical production origin. Used for canonical URLs and social metadata, so
 * it is always the production domain regardless of where the build runs.
 */
export const SITE_URL = "https://seo.webxdevelop.com";

export const SITE_NAME = "SEO Opportunity Analyzer";

/**
 * The analyzer tool itself (the React SPA) lives under `/app`. The homepage and
 * every other route in this Next.js app is static marketing/content; the tool
 * is the one place a visitor leaves this app for the SPA. `<AnalyzerLauncher>`
 * hands off here with the URL prefilled.
 */
export const APP_URL = `${SITE_URL}/app`;

/** Branded 1200×630 social share card (see `web/public/og-image.png`). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
