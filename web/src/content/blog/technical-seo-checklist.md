---
title: "Technical SEO Checklist"
description: "A working checklist for the crawl, indexing and rendering issues that quietly limit search performance — from robots.txt and canonical tags to HTTPS, sitemaps and structured data."
publishedAt: "2026-07-24"
author: "WebXDevelop"
category: "Technical SEO"
---

Technical SEO is the part of SEO that has nothing to do with writing content and everything to do with whether search engines can reach your content in the first place. This checklist covers the issues that come up most often. Work through it once per site, then re-check after major releases.

## Crawling

-   [ ]  **`robots.txt` exists** at the site root and returns HTTP 200.
-   [ ]  It **allows crawling** of your public pages and only disallows genuinely private paths (admin, cart, internal search, API endpoints).
-   [ ]  It **references your sitemap** with an absolute `Sitemap:` line.
-   [ ]  No accidental `Disallow: /` blocking the whole site.
-   [ ]  Important pages are **not blocked** by `robots.txt` — a blocked page can still be indexed without content, but Google can never see a `noindex` on it.

## Indexing

-   [ ]  Pages you want ranked have **no `noindex`** (`<meta name="robots">` or `X-Robots-Tag` header).
-   [ ]  Each page has a **self-referencing canonical** pointing to its own preferred URL.
-   [ ]  You are **not canonicalising unrelated pages** to the homepage or to one another — a common bug that removes pages from the index.
-   [ ]  Parameterised and duplicate URLs (`?ref=`, trailing slashes, uppercase paths) resolve or canonicalise to one version.

## XML sitemap

-   [ ]  The sitemap lists **only indexable, canonical URLs** — no redirects, `noindex` pages, or 404s.
-   [ ]  It is **kept in sync** with the site automatically, not hand-edited.
-   [ ]  It is submitted in Google Search Console and referenced from `robots.txt`.

## HTTPS and redirects

| Check | Why |
| --- | --- |
| Whole site on HTTPS | Ranking signal and a trust requirement |
| HTTP → HTTPS redirect (301) | Consolidates signals to one URL |
| No mixed content | Browsers block insecure sub-resources |
| Internal links use HTTPS | Avoids an unnecessary redirect hop on every click |

## Rendering and performance

-   [ ]  The main content is present in the **rendered HTML** (test with a render/inspection tool, not just "view source").
-   [ ]  **Core Web Vitals** are in the good range on mobile — see [Core Web Vitals explained](/blog/core-web-vitals-explained).
-   [ ]  Images have **explicit `width`/`height`** (or CSS `aspect-ratio`) to avoid layout shift.
-   [ ]  Render-blocking CSS/JS is minimised; below-the-fold images use `loading="lazy"`.

## Page-level signals

-   [ ]  Unique, descriptive `<title>` per page.
-   [ ]  Meta description per page (Google may rewrite it, but a good one helps).
-   [ ]  Exactly one `<h1>` that matches the page topic.
-   [ ]  `<html lang="…">` set correctly.
-   [ ]  `<meta name="viewport" content="width=device-width, initial-scale=1">`.

## Structured data

-   [ ]  Add schema **only where it reflects visible content** — `Organization` and `WebSite` site-wide, `Article` on posts, `BreadcrumbList` where you show breadcrumbs.
-   [ ]  Validate it (Rich Results Test / Schema Markup Validator).
-   [ ]  No fake ratings, reviews, or FAQ markup — these can trigger manual actions.

## Running the checklist

Most of these checks are things our [SEO analyzer](/) inspects automatically for a given URL: `robots.txt`, sitemap detection, canonical, HTTPS, viewport, language, headings, image `alt` text, internal link health, and PageSpeed / Core Web Vitals. Run a [free SEO audit](/seo-audit) first to get a scored list, then use this checklist to work through anything it flags.

For a deeper look at the indexing layer, see the guides on [robots.txt](/blog/robots-txt-guide), [XML sitemaps](/blog/xml-sitemap-guide) and [canonical URLs](/blog/canonical-urls-explained). To run the whole review in order, follow [how to do an SEO audit yourself](/blog/how-to-do-an-seo-audit).
