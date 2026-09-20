---
title: "What Is a Canonical URL? A Practical Guide"
description: "A canonical URL tells search engines which version of a page to index. How the rel=canonical tag works, when you need it, and the mistakes that deindex pages."
publishedAt: "2026-08-30"
author: "WebXDevelop"
category: "Technical SEO"
---

A canonical URL is the version of a page you want search engines to index and rank when the same or very similar content is reachable at more than one address. You declare it with a `rel="canonical"` link in the page's `<head>`:

```html
<link rel="canonical" href="https://example.com/widgets/blue" />
```

It is one of the most misunderstood tags in technical SEO — and one of the easiest to get wrong in a way that removes pages from Google.

## The problem it solves

The same content is often reachable at several URLs:

-   `http://` and `https://` versions
-   `example.com` and `www.example.com`
-   with and without a trailing slash
-   tracking parameters: `?utm_source=`, `?ref=`, `?fbclid=`
-   sort and filter parameters on listing pages
-   a product available under two category paths: `/tools/drill` and `/deals/drill`
-   print, AMP, or session-ID variants

To a search engine these are separate URLs with duplicate content. Left undeclared, it will pick one itself — a process called canonicalisation — and it may not pick the one you want. Duplicate URLs also **split signals**: links, clicks and engagement spread across the variants instead of consolidating on a single address.

## How the tag actually works

-   It is a **hint, not a directive.** Google treats it as a strong signal but can override it when other signals — internal links, the sitemap, redirects — point somewhere else.
-   The target should return **HTTP 200**, be **indexable** (no `noindex`), and serve the **same or near-identical content**.
-   Use an **absolute URL**, not `/widgets/blue`.
-   Each page should have **exactly one** canonical tag, and it should not conflict with a canonical set in the HTTP `Link` header.

## Self-referencing canonicals

Most pages should point to themselves:

```html
<!-- On https://example.com/blog/canonical-urls -->
<link rel="canonical" href="https://example.com/blog/canonical-urls" />
```

This removes ambiguity when the same page is requested with tracking parameters or a different case, and it is the expected default. A good CMS adds it automatically — the job is to confirm that it does, and that it outputs the right URL.

## Canonical vs redirect vs noindex

Different tools for different situations:

| Situation | Use |
| --- | --- |
| A URL has permanently moved | 301 redirect |
| Two URLs must both work but serve the same content | `rel=canonical` to the primary |
| A page should never appear in search (thank-you, cart, internal search) | `noindex`, and allow crawling |
| Filtered or sorted variants of a listing | canonical to the clean listing, or `noindex` |
| Your article was syndicated to another site | cross-domain canonical on their copy, pointing to your original |

Do not stack them. A `noindex` and a canonical on the same page send mixed signals. A canonical pointing at a URL that redirects wastes the hint.

## Common canonical mistakes

-   **Canonicalising every page to the homepage.** A classic template bug: it tells Google that every page is a duplicate of the homepage, and they drop out of the index.
-   **Pointing the canonical at a `noindex` or redirecting URL.**
-   **Relative URLs** that resolve to the wrong address.
-   **Conflicting signals** — the canonical says URL A, the sitemap lists URL B, internal links go to URL C. Pick one and make every signal agree.
-   **Protocol or host mismatch** — an `http://` canonical on an `https://` page, or a `www` canonical on a non-`www` page.
-   **Paginated pages canonicalising to page 1.** Page 2 and beyond should self-canonicalise; only point them elsewhere if you have a genuine "view all" page.

## "Google ignored my canonical" — why

Google picks its own canonical when your signals disagree with each other, or with what it observes. Check, in order:

1.  Does the canonical target actually match the page's content?
2.  Do internal links and the XML sitemap point to the **same** URL as the canonical?
3.  Is the declared canonical reachable — 200, indexable, not redirecting?

The URL Inspection tool in Google Search Console shows the **Google-selected canonical** alongside your **user-declared canonical**, which is the fastest way to see where they diverge.

## How to check a page's canonical

View the page source and search for `rel="canonical"`, or use URL Inspection in Search Console. Our [free SEO analyzer](/) reports whether a page has a canonical tag and the exact URL it points to, so you can confirm your important pages are self-referencing and spot ones that are missing a canonical or pointing somewhere unexpected. It runs in the same pass that checks your [XML sitemap](/blog/xml-sitemap-guide) and [robots.txt](/blog/robots-txt-guide).

## Next steps

Canonical tags are part of the indexing layer covered in the [technical SEO checklist](/blog/technical-seo-checklist). If you are working through a site from scratch, [how to do an SEO audit](/blog/how-to-do-an-seo-audit) puts the canonical check in sequence with everything else.
