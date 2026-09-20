# Website SEO Opportunity Analyzer

A full-stack SEO analysis tool that scans a website and identifies practical opportunities to improve its technical, on-page, internal linking, social, and performance SEO.

**Live Demo:** https://seo.webxdevelop.com/

## Overview

The analyzer is designed to turn technical SEO checks into actionable recommendations rather than simply reporting whether individual elements exist.

Instead of presenting a large list of technical findings, it prioritizes issues by severity and potential score impact, helping users understand what should be fixed first.

The analyzer also integrates Google PageSpeed Insights to provide performance and Core Web Vitals data alongside traditional SEO checks.

## Screenshots

### SEO Score

![SEO Score](screenshots/score.png)

### SEO Analysis

![SEO Analysis](screenshots/seo-analysis.png)

### Biggest Opportunities

![Biggest Opportunities](screenshots/opportunities.png)

## Features

### SEO Analysis

- SEO score out of 100
- Page title analysis
- Meta description analysis
- H1 heading analysis
- Canonical URL detection
- HTML language detection
- Viewport detection
- HTTPS detection
- Image count analysis
- Missing `alt` attribute detection

### Internal Linking

- Total internal link count
- Unique internal destinations
- External link detection
- Empty anchor text detection
- Generic anchor text detection
- HTTP internal link detection
- Self-link detection
- Most-linked internal pages
- Detailed reporting for problematic internal links

### Technical SEO

- `robots.txt` detection
- `robots.txt` sitemap detection
- Detection of broad `robots.txt` blocking
- XML sitemap detection
- Sitemap URL count

### Social Metadata

- Open Graph title detection
- Open Graph description detection
- Open Graph image detection
- Twitter/X card detection

### Page Performance

- Google PageSpeed Insights integration
- Lighthouse performance score
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Interaction to Next Paint (INP)
- First Contentful Paint (FCP)
- Time to First Byte (TTFB)
- Core Web Vitals status classification
- Performance issue detection
- Recommended performance improvements
- Visual performance metric bars
- Performance score visualization

Performance metrics are classified into:

- Good
- Needs improvement
- Poor
- Not available

### Recommendations

- Prioritized SEO opportunities
- Severity classification
- Score impact for each issue
- Actionable fix recommendations
- Top 3 highest-priority issues to address

### Search Preview

- Google-style search result preview
- Page title preview
- Search result URL preview
- Meta description preview

### Analysis Experience

- Loading state while analysis is running
- Progressive analysis messaging
- Re-analysis support
- Error handling for failed requests

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- TypeScript
- Fastify
- Cheerio
- `@fastify/cors`
- `@fastify/rate-limit`
- `ipaddr.js`

### Testing

- Vitest

### External APIs

- Google PageSpeed Insights API

## Security

Because the analyzer accepts user-provided URLs, the backend validates remote requests before fetching them.

The analyzer includes:

- HTTP/HTTPS-only URL validation
- Credential-free URL validation
- DNS resolution checks
- Private and reserved IP blocking
- IPv4 and IPv6 address validation
- Redirect destination validation
- Maximum redirect limit
- Request timeouts
- Response size limits
- API rate limiting
- Server-side PageSpeed API key handling

The backend performs URL safety validation before the initial request and again for every redirect destination. This helps protect the server from SSRF attempts involving private, loopback, or otherwise non-public network addresses.

HTML, `robots.txt`, and sitemap responses are also subject to maximum response-size limits.

## Rate Limiting

The analysis endpoint is rate limited to prevent excessive automated requests.

Current configuration:

```ts
rateLimit: {
  max: 5,
  timeWindow: "5 minute",
}
```

This limits each client to a maximum of 5 analysis requests within a 5-minute window.

PageSpeed requests are made server-side and the Google API key is never exposed to the frontend.

## Environment Variables

The backend uses environment variables for configuration and secrets.

Copy `server/.env.example` to `server/.env` when running locally and fill in the values:

```env
PAGESPEED_API_KEY=your_google_pagespeed_api_key
DATABASE_URL=postgres://postgres:postgres@localhost:5432/website_analyzer
SESSION_SECRET=a_long_random_value   # e.g. `openssl rand -base64 32`, min 16 chars
APP_URL=http://localhost:5173        # optional; base URL of the frontend

# Stripe billing — set all three together, or leave all blank to disable billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...           # a recurring $9/month USD Price
```

- `PAGESPEED_API_KEY`, `SESSION_SECRET`, and the `STRIPE_*` values are **server-side only** — never expose them through `VITE_*` / the client bundle.
- `DATABASE_URL` points at PostgreSQL (see [Database](#database)).
- `SESSION_SECRET` signs the session cookie. Use a long random value in production.
- The `STRIPE_*` vars are optional. With none set, billing endpoints are disabled and every account is Free. Set all three (partial config is rejected at startup). See [Billing](#billing).

For production deployments, configure these through the hosting platform's environment-variable configuration rather than committing a `.env` file.

## Database

User accounts are stored in PostgreSQL. For local development, start one with Docker:

```bash
docker compose up -d        # PostgreSQL on localhost:5432
```

(or point `DATABASE_URL` at any PostgreSQL 13+ instance you already run).

Then apply the schema migrations:

```bash
cd server
npm run db:migrate
```

Migrations live in `server/drizzle/` and are generated from `server/src/db/schema.ts`
with `npm run db:generate` after a schema change.

## Billing

The Pro plan ($9/month, 50 analyses/month) uses Stripe Checkout and the Stripe
Customer Portal — there are no custom payment forms. The **Stripe webhook is the
only authority** for subscription state; returning to the success URL never
grants Pro.

Local setup (Stripe test mode):

1. Create a Product with a recurring **$9 USD / month** Price in the Stripe
   Dashboard; put the Price id in `STRIPE_PRICE_PRO`.
2. Forward webhooks and copy the signing secret into `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

3. Set `STRIPE_SECRET_KEY` to your test-mode secret key and restart the server.

The server keeps local state (`subscriptions`, `stripe_customers`) in sync from
the webhook, so `GET /api/auth/me` and `GET /api/usage` answer "is this user
Pro?" without ever calling Stripe on the request path. Webhook deliveries are
idempotent (`processed_stripe_events`).

## Project Structure

```text
website-analyzer/

├── client/                 # React SPA — analyzer + auth/billing/dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── web/                    # Next.js static export — marketing + blog
│   ├── src/
│   │   ├── app/            # routes: features, about, legal, serp-preview, blog
│   │   ├── components/
│   │   ├── content/blog/   # Markdown articles
│   │   └── lib/            # blog.ts (content), seo.ts (Metadata API)
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── analyzer/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── fetcher.ts
│   │   │   ├── pageSpeedAnalyzer.ts
│   │   │   ├── seoAnalyzer.ts
│   │   │   ├── robotsAnalyzer.ts
│   │   │   ├── sitemapAnalyzer.ts
│   │   │   └── internalLinkAnalyzer.ts
│   │   ├── utils/
│   │   │   ├── readResponse.ts
│   │   │   └── safeUrl.ts
│   │   └── index.ts
│   └── package.json
│
└── README.md
```

## Running Locally

### Frontend

```bash
cd client

npm install

npm run dev
```

The frontend runs on the Vite development server, typically at:

`http://localhost:5173`

### Backend

In a separate terminal:

```bash
cd server

npm install

npm run db:migrate   # first run only, and after new migrations

npm run dev
```

The API runs on:

`http://localhost:3000`

Make sure `server/.env` is configured and PostgreSQL is running before starting the backend.

### Marketing & blog (Next.js)

In a separate terminal, only needed when working on `/features`, `/about`,
`/legal`, `/serp-preview`, or the blog:

```bash
cd web

npm install

npm run dev
```

Runs at `http://localhost:3001` (or whichever port Next picks — it does not
conflict with the Vite dev server on 5173). Cross-links to the analyzer/SPA
routes (`/`, `/pricing`, `/login`, etc.) are plain `<a>` tags, so in local dev
they'll point at this app's own origin unless you run both dev servers behind
a shared local proxy — that mismatch only matters for manual click-through
testing, not for the build.

## Testing

The backend uses Vitest for automated testing.

Run the test suite with:

```bash
cd server

npm test
```

This runs the Vitest test suite in a single run.

## Design system

A small set of shared, Tailwind-based UI primitives lives in
`client/src/components/ui/` — `Button` / `LinkButton`, `Card`, and
`TextField` / `Input` — documented and previewable in Storybook:

```bash
cd client

npm run storybook       # dev server at http://localhost:6006
npm run build-storybook # static build, output in storybook-static/
```

These replace what used to be several near-duplicate hand-written CSS classes
(`.upgrade-button`, `.pricing-cta`, `.cookie-accept`/`.cookie-reject`,
`.pricing-card`, the `.field` pattern repeated across the auth pages) —
adopted so far in the auth forms (login/signup/forgot/reset password),
`PricingPage`, `CookieConsent`, `ProjectCard`, and `UpgradeButton`. Everywhere
else in the app still uses the original hand-written classes in `App.css`;
migrate a page to the shared components when you're touching it anyway,
rather than as a separate sweep.

**Scope note:** this covers `client/` only. The `web/` Next.js app (see "SEO
& hosting") has just a handful of small interactive pieces (nav auth state,
cookie banner, the SERP preview tool) and isn't wired into this component
library — sharing it across both apps would mean turning the repo into an
npm-workspaces monorepo, which hasn't been justified by the amount of actual
shared UI yet.

**Cascade gotcha to know about:** Tailwind v4 wraps all of its utilities in
`@layer` blocks, and `App.css`'s hand-written rules are unlayered — in CSS,
unlayered rules always beat layered ones regardless of specificity. Most of
the time this doesn't matter, but a few base rules in `App.css` are real
resets (e.g. `form label` visually hides labels for the homepage's analyzer
form via `position: absolute` + a 1px clip box). A new `ui/` component that
needs to override one of those has to use Tailwind's `!` (important) suffix,
e.g. `static!`, not just add the "opposite" utility — see the comment in
`TextField.tsx`'s label for a worked example.

## API

### Health Check

```text
GET /api/health
```

### Authentication

```text
POST /api/auth/signup           { "email", "password" }  -> sets a session cookie
POST /api/auth/login            { "email", "password" }  -> sets a session cookie
POST /api/auth/logout                                    -> clears the session cookie
GET  /api/auth/me                                        -> { "user": { "id", "email" }, "plan": "free"|"pro" } or 401
POST /api/auth/forgot-password  { "email" }               -> always a generic message
POST /api/auth/reset-password   { "token", "password" }   -> { "ok": true } or 400
```

Sessions are server-side; the browser holds only an opaque, HTTP-only cookie.
Password reset tokens are single-use, expire after 30 minutes, and are stored
hashed. In development the reset link is written to the server log instead of
being emailed (see `server/src/services/mailer.ts`); set `APP_URL` so the link
points at the right frontend host.

The anonymous analyzer below does **not** require authentication.

### Analyze a Website

```text
POST /api/analyze
```

Example request:

```json
{
  "url": "https://example.com"
}
```

The endpoint returns structured SEO, technical, internal-linking, social, and PageSpeed data together with the calculated SEO score and detected issues.

Anonymous requests are stateless and rate limited by IP (5 per 5 minutes). When
the request carries a valid session cookie, the analysis is also saved and
counts against the user's monthly quota.

### Analysis history & usage (authenticated)

```text
GET /api/usage          -> { "plan", "used", "limit", "remaining", "resetsAt" }
GET /api/analyses       -> { "analyses": [ { "id", "url", "score", "statusCode", "createdAt" } ] }
GET /api/analyses/:id   -> the stored analysis incl. its full result, or 404
```

Monthly analysis limits are **Free = 3, Pro = 50** (`ANALYSIS_LIMITS` in
`server/src/billing/plan.ts`). A slot is consumed only by a fully successful,
persisted analysis. Once the limit is reached `POST /api/analyze` returns `429`
with `{ "code": "ANALYSIS_LIMIT_REACHED" }`. Analysis endpoints only ever return
the requesting user's own data.

### Billing (authenticated)

```text
POST /api/billing/checkout  -> { "url" } (Stripe Checkout), or 409 if already Pro
POST /api/billing/portal    -> { "url" } (Stripe Customer Portal)
POST /api/billing/webhook   -> Stripe events; signature-verified, idempotent
```

`checkout` / `portal` decide the price and customer server-side — nothing
sensitive is accepted from the client. The webhook route requires the raw body
and the `stripe-signature` header.

## How It Works

The user submits a website URL through the React frontend.

The Fastify backend then:

1. Validates the submitted URL.
2. Ensures only HTTP and HTTPS URLs are accepted.
3. Rejects URLs containing credentials.
4. Resolves the hostname and checks that it points to a publicly accessible address.
5. Fetches the website with timeout and response-size limits.
6. Follows redirects while validating every redirect destination.
7. Parses the HTML using Cheerio.
8. Extracts on-page SEO and social metadata.
9. Analyzes internal links and their anchor text.
10. Checks technical files such as `robots.txt` and `sitemap.xml`.
11. Requests PageSpeed Insights performance data.
12. Evaluates the collected data against a set of SEO rules.
13. Calculates an overall SEO score.
14. Prioritizes detected issues by severity and score impact.
15. Returns the structured analysis to the frontend.

The frontend turns the analysis into a visual report containing the SEO score, technical analysis, internal linking analysis, performance metrics, prioritized opportunities, recommendations, and a search-result preview.

## PageSpeed Analysis

Performance analysis uses the Google PageSpeed Insights API.

The backend requests the performance category and extracts:

- Performance score
- LCP
- CLS
- INP
- FCP
- TTFB

If PageSpeed is unavailable, times out, or returns an error, the SEO analysis still completes and the PageSpeed values are returned as unavailable rather than failing the entire analysis.

The PageSpeed API key is stored exclusively on the backend.

## Production Build

### Frontend

```bash
cd client

npm run build
```

The generated production assets are placed in the `dist` directory.

### Marketing & blog (Next.js)

```bash
cd web

npm run build
```

Static export output is placed in the `out` directory — plain HTML/CSS/JS,
served by nginx the same way as `client/dist` (see "SEO & hosting" below for
the nginx routing between the two).

### Backend

```bash
cd server

npm run build
```

The TypeScript backend is compiled into the `dist` directory.

The production server can then be started with:

```bash
npm start
```

## SEO & hosting

The app is split across three deployables that share one origin:

- **`server/`** — the Fastify API, proxied under `/api/`.
- **`web/`** — a standalone **Next.js** app (static export) that owns the
  server-rendered marketing and content surface: the **homepage (`/`)**,
  `/seo-audit`, `/serp-preview`, `/features`, `/about`, `/legal`, `/blog`,
  `/blog/:slug`, plus `robots.txt` and `sitemap.xml`. These pages carry no auth
  state and make no API calls, so they get real per-page server-rendered
  `<head>` tags and full HTML — this is the surface Google indexes and ranks.
  The homepage's URL field (`AnalyzerLauncher`) hands off to the SPA at
  `/app?url=…`.
- **`client/`** — the React SPA. Owns the analyzer **tool at `/app`** (noindex)
  and every logged-in / dynamic route: `/pricing`, `/login`, `/signup`,
  `/forgot-password`, `/reset-password`, `/dashboard`, `/projects/:id`,
  `/analyses/:id`. `/pricing` stays here because its CTAs (`UpgradeButton`,
  "Manage billing") depend on live auth/plan state.

Each app is a separate build output served by nginx via path routing — there
is no server-to-server call between them, and no shared React tree; cookies
work across both because they're host-only and same-origin. The homepage moved
from the SPA to `web/` because a client-rendered homepage shipped near-empty
HTML and barely got indexed, while every server-rendered `web/` page ranked.

```nginx
# API
location /api/ { proxy_pass http://127.0.0.1:3000; }

# Next.js static export — homepage + marketing + blog.
# web/ owns "/" exactly; the SPA catch-all owns everything else.
location = / { root /path/to/web/out; try_files /index.html =404; }
location ^~ /_next/ { root /path/to/web/out; }
location = /robots.txt { root /path/to/web/out; }
location = /sitemap.xml { root /path/to/web/out; }
location ~ ^/(seo-audit|serp-preview|features|about|legal|blog)(/|$) {
    root /path/to/web/out;
    try_files $uri $uri.html $uri/ =404;
}

# React SPA — analyzer tool (/app) + everything auth/billing related.
# web/ uses /_next/ for its assets, the SPA uses /assets/, so no collision.
location / {
    root /path/to/client/dist;
    try_files $uri $uri/ /index.html;
}
```

Get the location-block ordering right: the `web/out` blocks must be matched
before the SPA's catch-all `location /`, or deep links into the marketing/blog
routes fall through to the SPA and hit its client-side 404. The old homepage
URL `/` is now `web/`; the analyzer that used to live at `/` is at `/app`.

Metadata for each app:

- **`web/`**: `generateMetadata`/the `Metadata` API per route
  (`web/src/lib/seo.ts`), `Organization`/`WebSite` JSON-LD in
  `web/src/app/layout.tsx`, `SoftwareApplication` + `FAQPage` on the homepage,
  `WebApplication` + `FAQPage` + `BreadcrumbList` on `/seo-audit`,
  `WebApplication` + `BreadcrumbList` on `/serp-preview`, `Article` +
  `BreadcrumbList` on blog posts. `robots.txt` and `sitemap.xml` are generated
  at build time by Next's file conventions (`web/src/app/robots.ts`,
  `web/src/app/sitemap.ts`) from the blog content plus the static routes —
  `web/` is the single source of truth for both files site-wide, including the
  one indexable SPA route (`/pricing`).
- **`client/`**: per-route `<title>`, description, canonical and Open Graph /
  Twitter tags applied client-side (`client/src/components/Seo.tsx`).
  `client/index.html` defaults to **noindex** — the SPA now serves only the
  analyzer tool (`/app`, explicitly noindexed), `/pricing` (which `Seo.tsx`
  opts back into indexing) and auth/dashboard routes.

**SPA rendering tradeoff (client/ only):** metadata for SPA routes is applied
client-side. Googlebot renders JavaScript and picks it up, but link-preview
scrapers (Slack, LinkedIn, Facebook, X) read only the static `index.html`.
Every page where this matters for search now lives in `web/` and is properly
server rendered, so this is scoped down to `/pricing` — low priority, since
pricing pages are rarely link-shared — and `/app`, which is noindex anyway.

**Blog content** (`web/src/content/blog/*.md`) is fully static — no database,
CMS, or API. See "Blog / content" below; the pipeline is unchanged, just moved
from a Vite plugin (`client/vite/blog.ts`, now removed) to a Next.js
lib (`web/src/lib/blog.ts`) using the same `gray-matter` + `marked` parsing.

**Social share image:** `og-image.png` at 1200×630 (a branded card with the
product name and tagline) is served from `/og-image.png` and is the default
for every page's Open Graph / Twitter tags (`DEFAULT_OG_IMAGE` in
`web/src/lib/site.ts`). Keep a copy in both `web/public/` and `client/public/`
so it resolves regardless of which app serves the requesting page.

## Blog / content

The blog is fully static — no database, CMS, or API — and lives in the `web/`
Next.js app, not the SPA. Articles are Markdown files with YAML frontmatter in
`web/src/content/blog/`. At build time `web/src/lib/blog.ts` parses them
(frontmatter + `marked` → HTML, server-side only) and every route that needs
the list (`/blog`, `/blog/[slug]`, `sitemap.ts`) reads through it.

**To add an article:**

1. Create `web/src/content/blog/<slug>.md` — the filename becomes the URL
   slug (`/blog/<slug>`) and is guaranteed unique.
2. Add frontmatter (quote any value containing a colon):

   ```yaml
   ---
   title: "Your Article Title"
   description: "~150–160 char summary used for the meta description and card."
   publishedAt: "2026-09-01"      # required, YYYY-MM-DD
   updatedAt: "2026-10-15"        # optional
   author: "WebXDevelop"          # optional, defaults to WebXDevelop
   category: "Technical SEO"      # optional
   draft: true                    # optional — excludes it from the site + sitemap
   ---
   ```

3. Write the body in Markdown. **Start headings at `##`** — the page renders the
   `<h1>` from `title`. Tables, task lists, and code blocks are supported.
   Internal links (`[text](/features)`) are plain links — they resolve
   correctly whether the target is served by `web/` or by the SPA, since both
   are on the same origin behind nginx.
4. `cd web && npm run build`. The article gets its own static page + metadata +
   `Article` structured data, and is added to `sitemap.xml`.

Each article is prerendered to its own static HTML file at build time
(`generateStaticParams` in `web/src/app/blog/[slug]/page.tsx`) — there's no
separate code-splitting step to think about, and no SPA fallback needed for
blog routes since nginx serves the exact static file.

## Disclaimer

This tool provides automated SEO checks and should be used as a starting point for further analysis. It does not replace a complete technical SEO audit or search engine-specific diagnostics.
