---
title: "How to Do an SEO Audit Yourself"
description: "A step-by-step SEO audit using free tools: check indexing, on-page signals, technical health, links and Core Web Vitals, then turn the findings into a fix list."
publishedAt: "2026-08-30"
author: "WebXDevelop"
category: "Fundamentals"
---

If you have read [what an SEO audit is](/blog/what-is-an-seo-audit) and want to actually run one, this is the procedure. It is built around free tools — Google Search Console, your browser, and our analyzer — and it works through the site in the order that surfaces the biggest problems first. Budget an afternoon for a small site.

## Before you start

-   Get **Google Search Console** verified for the domain. It is the single most valuable free source of truth: indexing status, the queries you rank for, Core Web Vitals field data, and any manual actions.
-   Decide your **scope**. Audit _templates_, not every URL — the homepage, and one page of each important type: a product page, a category page, an article, a landing page. Template-level fixes usually apply across hundreds of pages.
-   Have a **place to record findings** — a spreadsheet with columns for page, issue, severity, and fix.

## Step 1 — Indexing and crawlability

This is the layer that can make everything else irrelevant.

-   In Search Console, open the **Pages** (index coverage) report: how many pages are indexed, how many are not, and why not.
-   Run **URL Inspection** on a few key pages. Is the [canonical](/blog/canonical-urls-explained) what you expect? Is the page actually indexed?
-   Check [robots.txt](/blog/robots-txt-guide): visit `/robots.txt` and confirm nothing important is blocked and there is no stray `Disallow: /`.
-   Check your [XML sitemap](/blog/xml-sitemap-guide): does it exist, load as XML, and list your real canonical URLs?
-   Look for accidental **`noindex`** tags on pages you want ranked.

Anything wrong here goes straight to the top of the fix list.

## Step 2 — On-page signals

For each template page:

-   **[Title tag](/blog/title-tag-seo)** — present, unique, ~50–60 characters, topic first?
-   **[Meta description](/blog/meta-description-guide)** — present, unique, ~150 characters, written for the click?
-   **[H1](/blog/how-many-h1-tags)** — exactly one, and does it describe the page?
-   **Heading order** — H2 and H3 used logically, not chosen for their size?
-   **Content vs intent** — does the page answer the query it targets, near the top, before the preamble?
-   **URL** — short, readable, lowercase, hyphen-separated?

## Step 3 — Technical health

-   **HTTPS** across the whole site, with HTTP redirecting to it (301).
-   **No mixed content** — no HTTP resources loaded on HTTPS pages.
-   **Canonical tags** — self-referencing, not all pointing at the homepage.
-   **Status codes** — key pages return 200, removed pages return 404 or 410, moved pages return 301.
-   **Mobile** — the page is usable on a phone: text readable without zooming, tap targets not cramped.
-   **`<html lang>`** set, and the **viewport** meta tag present.

Work through the [technical SEO checklist](/blog/technical-seo-checklist) for the complete list.

## Step 4 — Internal linking

-   Are your **key pages linked** from other relevant pages, using descriptive anchor text?
-   Any **orphan pages** — in the sitemap but linked from nowhere?
-   Any **broken, HTTP, or redirecting** internal links?

See [internal linking best practices](/blog/internal-linking-best-practices) for how to fix what you find.

## Step 5 — Performance and Core Web Vitals

-   In Search Console, check the **Core Web Vitals** report. This is field data from real users — the source of truth.
-   Run a few key templates through PageSpeed Insights for the lab diagnostics.
-   Note whether **LCP, INP and CLS** are in the good range on mobile. See [Core Web Vitals explained](/blog/core-web-vitals-explained) for the thresholds and the fixes that move each one.

## A faster first pass

Steps 2 to 5 can be collapsed into a single scan per template. Our [free SEO audit tool](/seo-audit) takes a URL and checks the title, meta description, headings, canonical, HTTPS, viewport, language, robots.txt, sitemap, image alt text, internal link health and Core Web Vitals in one pass, then sorts what it finds by severity and estimated score impact. Run it on each template page first to get a prioritized list, then use the steps above to go deeper on anything it flags. A [free account](/signup) keeps your past analyses so you can re-check a page after making changes.

## Step 6 — Turn findings into a fix list

Sort every finding into three buckets:

1.  **Blocking** — anything that stops indexing: `noindex`, robots.txt disallows, broken canonicals, server errors, a site-wide `Disallow: /`. Fix this week.
2.  **High impact** — missing or duplicate titles, no H1, HTTP pages, poor Core Web Vitals. Schedule next.
3.  **Polish** — Open Graph tags, minor heading order, image alt text. Batch these.

Fix top-down. Re-run the audit after each release — regressions such as a deploy that drops canonical tags, or a new template with no H1, are common.

## How often

Quarterly for a stable site; after every significant release or migration; and any time Search Console shows a drop in impressions or in the number of indexed pages.

## Next steps

For the concepts behind each step, see [what an SEO audit is](/blog/what-is-an-seo-audit). For the work that follows an audit, see [how to improve your website's SEO](/blog/how-to-improve-website-seo). Improvements help search engines understand and trust your site — they are not a guarantee of any particular ranking.
