---
title: "How Many H1 Tags Should a Page Have?"
description: "One visible H1 per page is the safe answer. What the H1 does, when multiple H1s actually cause problems, how it differs from the title tag, and how to check."
publishedAt: "2026-08-30"
author: "WebXDevelop"
category: "On-Page SEO"
---

If an SEO tool has just flagged a page for having no H1, or more than one, the underlying question is simple: how many should there be? The short answer is **one visible H1 that describes what the page is about**. More than one is not an automatic problem on a modern site, but it is a signal worth checking. Zero is always worth fixing.

## The short answer

-   **One H1 per page**, describing the page's main topic.
-   **Zero H1s** — fix it. The page is missing its clearest heading signal, and screen-reader users lose the main landmark for the document.
-   **Two or more** — usually harmless with HTML5, but check that the _first_ one is the real page heading and the others are not a logo, a tagline, a navigation label, or a slider caption.

## What the H1 is for

The H1 serves three audiences at once:

-   **People** — it is the first thing that orients a reader when the page loads.
-   **Assistive technology** — screen-reader users navigate by heading. The H1 is the top of that outline; a missing or misplaced one makes the page harder to move around.
-   **Search engines** — it is a supporting on-page topic signal. It carries less weight than the `<title>`, but a clear H1 that matches the page reinforces what the page is about.

Google has said publicly that multiple H1s will not confuse its systems. That is true — but "fine for Google" is not the same as "good for the page". The accessibility and clarity reasons for keeping one strong H1 still stand.

## H1 vs the title tag

These are different elements with different jobs, and they do not have to be identical.

|  | Title tag | H1 |
| --- | --- | --- |
| Where it shows | Search results, browser tab, share previews | On the page itself |
| Audience | Searchers deciding whether to click | People already on the page |
| Length | ~50–60 characters before truncation | No hard limit; keep it readable |
| Uniqueness | Must be unique across the whole site | Should be unique, but duplication matters less |

Keep them **close in meaning**. The title often appends the brand name and is tuned for the search result; the H1 can be a little longer and more natural. See the [title tag guide](/blog/title-tag-seo) for how to write the pair together.

## When multiple H1s cause problems

The count itself is rarely the issue. The problem is when the extra H1s mean the "main heading" no longer matches the page:

-   The theme renders the **site name or logo inside an H1** on every page — so every page's main heading is your brand, not its topic.
-   A **hero slider or carousel** outputs each slide's caption as an H1.
-   The page is assembled from **components that each ship their own H1** — a common bug in component frameworks and page builders.
-   The **visible page heading is an H2 or a styled `<div>`**, while a hidden or unrelated H1 sits up in the header.

In each case, fixing it means making the first (or only) H1 the element that actually describes the page.

## The "exactly one H1" rule and HTML5

Older guidance said one H1, full stop. HTML5 introduced sectioning elements (`<section>`, `<article>`) and a theoretical document outline in which each section could carry its own H1. That outline algorithm was **never implemented by browsers or assistive technology**, and the HTML specification now advises against relying on it. So in practice: use one H1, then H2 and H3 for structure. It is the approach that behaves predictably everywhere.

## Heading structure, not just the H1

-   One H1, then do not skip levels (H2 straight to H4) on the way down.
-   Headings should describe the section, not be chosen for their visual size — style them with CSS instead.
-   Read the headings on their own: they should form a sensible table of contents for the page.

## How to check your pages

For one page, open the browser console and run `document.querySelectorAll('h1')`, or use an accessibility inspector or a headings-outline extension.

For a quick check on any URL, our [free SEO analyzer](/) reports the exact number of H1s on the page and lists their text, so you can see at a glance whether a page has zero, one, or several — and whether the one it has is the heading you expected. It checks headings in the same pass as the [title tag](/blog/title-tag-seo), the [meta description](/blog/meta-description-guide), and the rest of the on-page signals.

## Common mistakes

-   Adding a hidden H1 "for SEO" while the visible heading stays an H2. Write one real, visible H1 instead.
-   Rewriting the H1 into an exact-match keyword phrase that reads badly to a human.
-   Assuming zero H1s is fine because "Google uses the title anyway" — it still costs a clear signal and hurts accessibility.
-   Fixing the count across a template without checking that the element now carrying the H1 is the right one.

## Next steps

The three on-page signals — H1, [title tag](/blog/title-tag-seo), and [meta description](/blog/meta-description-guide) — are usually edited together, so it is worth reading all three. For headings in the wider context of crawling and indexing, work through the [technical SEO checklist](/blog/technical-seo-checklist).
