---
title: "robots.txt Explained: What to Allow and What to Block"
description: "robots.txt controls crawling, not indexing. The syntax, the directives that matter, safe example files, and the one mistake that can wipe a site from Google."
publishedAt: "2026-08-30"
author: "WebXDevelop"
category: "Technical SEO"
---

`robots.txt` is a plain-text file at the root of your site that tells search engine crawlers which paths they may and may not request. It is simple, it is powerful, and one wrong line can remove a site from Google.

## What robots.txt does — and doesn't

-   It **controls crawling**. Compliant bots read it before requesting anything and skip the paths you disallow.
-   It does **not control indexing**. A URL blocked in robots.txt can still show up in search results — usually with no description and the note "No information is available for this page" — if other pages link to it. Because Google never fetched the page, it also never saw any `noindex` you put on it.
-   To keep a page **out of the index**, allow it to be crawled and add `<meta name="robots" content="noindex">` (or an `X-Robots-Tag` HTTP header). Blocking it in robots.txt actively prevents that from working.

## Where it lives

Exactly one file, at the root of each host and protocol: `https://example.com/robots.txt`. It does not cover subdomains or other protocols — `blog.example.com` needs its own file. It must return **HTTP 200** and be served as `text/plain`.

## The syntax

```text
User-agent: *
Disallow: /cart/
Disallow: /search
Allow: /search/help

Sitemap: https://example.com/sitemap.xml
```

-   **`User-agent`** — which crawler the rules below it apply to. `*` means all bots. You can add separate blocks for named bots such as `Googlebot`.
-   **`Disallow`** — a path prefix bots should not crawl. `Disallow: /` blocks everything; an empty `Disallow:` blocks nothing.
-   **`Allow`** — an exception that re-permits a path inside a disallowed section. Google applies the most specific (longest) matching rule.
-   **`Sitemap`** — an absolute URL to your sitemap. It is independent of user-agent and can go anywhere in the file.
-   Google supports `*` as a wildcard and `$` to anchor the end of a URL, e.g. `Disallow: /*.pdf$`.
-   Lines beginning with `#` are comments.

## What to block — and what not to

**Reasonable to block:**

-   internal search result pages (`/search`, `/?s=`)
-   faceted-navigation URL explosions — filter and sort parameters that generate thousands of near-duplicate URLs
-   cart, checkout and account pages
-   admin and staging paths
-   API endpoints that are not meant for users

**Do not block:**

-   CSS and JavaScript files Google needs to render the page
-   pages you want to `noindex` — the block means the `noindex` is never seen
-   your whole site (the launch-day mistake below)

## Safe example files

**Small brochure or marketing site — allow everything, point to the sitemap:**

```text
User-agent: *
Disallow:

Sitemap: https://example.com/sitemap.xml
```

**WordPress:**

```text
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://example.com/sitemap.xml
```

**E-commerce with faceted navigation:**

```text
User-agent: *
Disallow: /cart
Disallow: /checkout
Disallow: /*?*sort=
Disallow: /*?*filter=

Sitemap: https://example.com/sitemap.xml
```

## The mistake that takes a site down

```text
User-agent: *
Disallow: /
```

This blocks the entire site from being crawled. It is the default that many CMSs, hosts and staging environments ship while a site is in development — and it gets pushed to production far more often than you would think. After any launch or migration, if traffic drops, **check robots.txt first**. Search Console will also warn you, either with "Indexed, though blocked by robots.txt" or a collapse in the coverage report.

## robots.txt vs noindex vs canonical

| Goal | Tool |
| --- | --- |
| Stop wasting crawl activity on a section | robots.txt `Disallow` |
| Keep a page out of the index | `noindex` (and allow crawling) |
| Consolidate duplicate URLs | [`rel=canonical`](/blog/canonical-urls-explained) |
| Remove a page permanently | return 404 or 410 and remove internal links |

## How to check yours

Visit `https://yoursite.com/robots.txt`. Confirm it returns 200, is not blocking anything important, and references your [XML sitemap](/blog/xml-sitemap-guide). Google Search Console has a robots.txt report that shows the fetched file and any parse errors.

Our [free SEO analyzer](/) checks whether a site publishes a robots.txt file, whether it references a sitemap, and whether it contains a site-wide `Disallow: /` — a fast sanity check you can run on any URL alongside the [sitemap](/blog/xml-sitemap-guide) and [canonical](/blog/canonical-urls-explained) checks.

## Next steps

robots.txt is the first item in the crawling section of the [technical SEO checklist](/blog/technical-seo-checklist). For the full audit sequence — indexing, on-page, technical, links and performance — see [how to do an SEO audit yourself](/blog/how-to-do-an-seo-audit).
