---
title: "XML Sitemaps: What They Are and How to Create One"
description: "An XML sitemap lists the URLs you want indexed. What belongs in it, how to generate and submit one, when you actually need it, and how sitemap index files work."
publishedAt: "2026-08-30"
author: "WebXDevelop"
category: "Technical SEO"
---

An XML sitemap is a machine-readable list of the URLs on your site that you want search engines to know about. It usually lives at `/sitemap.xml` and looks like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-08-14</lastmod>
  </url>
  <url>
    <loc>https://example.com/blog/xml-sitemap-guide</loc>
  </url>
</urlset>
```

What a sitemap is **not**: it does not force indexing, it does not influence rankings directly, and it is not a replacement for internal links. It is a discovery aid and a statement of "these are the canonical URLs I care about".

## Do you actually need one?

-   **Small site (under ~100 pages), well linked, no orphan pages:** Google will probably find everything through links anyway. A sitemap still helps and costs nothing to add.
-   **Larger site, frequently updated, deep pages, weak internal linking, or a new site with few backlinks:** yes — it measurably helps discovery and recrawl scheduling.
-   **Large or complex site:** essential. It also gives you a coverage report in Search Console that is one of the best tools for diagnosing indexing problems.

## What belongs in it

Only **canonical, indexable, HTTP 200 URLs**:

-   ✅ the canonical version of each page you want to rank
-   ❌ redirects (3xx)
-   ❌ `noindex` pages
-   ❌ pages [canonicalised](/blog/canonical-urls-explained) to a different URL
-   ❌ error pages (404, 410, 5xx)
-   ❌ URLs blocked by [robots.txt](/blog/robots-txt-guide)

A sitemap full of non-indexable URLs wastes crawl activity and makes the Search Console coverage report noisy and hard to act on.

## `<lastmod>` and the other optional tags

-   **`<lastmod>`** is genuinely useful _if it is accurate_. Google uses it to prioritise recrawls. A `<lastmod>` that flips to today's date on every page, every day, gets ignored — and can make Google trust the signal less. Set it to the real date the page's content meaningfully changed.
-   **`<changefreq>`** and **`<priority>`** are ignored by Google. Do not spend time on them.

## How to generate one

-   **CMS or platform:** WordPress (via Yoast, Rank Math, or core), Shopify, Squarespace, Wix and Webflow all produce one automatically. Your job is to confirm it exists and is accurate.
-   **Static sites and frameworks:** most build tools have a sitemap plugin that generates the file from your routes at build time. This is the ideal setup because the sitemap stays in sync with the site automatically.
-   **Crawlers:** Screaming Frog and similar tools can export a sitemap from a crawl. Fine as a one-off; it will not stay current.
-   **Hand-writing:** only realistic for a handful of URLs, and it drifts out of date quickly.

The principle: the sitemap should be **generated from the same source as the site**, never maintained as a separate document.

## Sitemap index files

A single sitemap file is capped at **50,000 URLs or 50 MB uncompressed**. Past that, use a **sitemap index** — a `<sitemapindex>` file that lists several sitemap files:

```xml
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-blog.xml</loc></sitemap>
</sitemapindex>
```

Splitting by section (products, blog, categories) is also useful below that limit — it makes the coverage report far easier to read, because you can see which _type_ of page has an indexing problem.

## Referencing and submitting it

1.  Add an absolute `Sitemap:` line to your [robots.txt](/blog/robots-txt-guide): `Sitemap: https://example.com/sitemap.xml`
2.  Submit it in **Google Search Console → Sitemaps**, and in Bing Webmaster Tools.
3.  Check back. Search Console reports how many submitted URLs have been discovered and indexed, and flags fetch errors or parsing problems.

## Common mistakes

-   Listing non-canonical, redirected, or `noindex` URLs.
-   Leaving removed and redirected URLs in the file after a migration.
-   Faking `<lastmod>` dates.
-   Publishing several conflicting sitemaps.
-   A sitemap that is blocked by robots.txt, returns a non-200 status, or is served without an XML content type.
-   Treating submission as a guarantee of indexing. It is an invitation, not a promise.

## How to check yours

Visit `https://yoursite.com/sitemap.xml` directly — it should load as XML and list your real pages. Our [free SEO analyzer](/) checks whether a sitemap is published at that conventional location and counts the URLs listed in it, alongside the [robots.txt](/blog/robots-txt-guide) and [canonical](/blog/canonical-urls-explained) checks. For anything it flags, the [technical SEO checklist](/blog/technical-seo-checklist) has the full sequence.
