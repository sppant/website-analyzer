---
title: "Core Web Vitals Explained: LCP, INP and CLS"
description: "What Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift actually measure, the thresholds Google uses, and the fixes that reliably move each one."
publishedAt: "2026-08-14"
author: "WebXDevelop"
category: "Performance"
---

Core Web Vitals are three metrics Google uses to measure real-world page experience: how fast the main content loads, how quickly the page responds to input, and how much the layout jumps around while loading. They are a ranking signal, and more importantly they correlate strongly with bounce rate.

## The three metrics and their thresholds

| Metric | Measures | Good | Needs work | Poor |
| --- | --- | --- | --- | --- |
| **LCP** (Largest Contentful Paint) | Time until the largest visible element renders | ≤ 2.5s | 2.5–4s | \> 4s |
| **INP** (Interaction to Next Paint) | Responsiveness to clicks, taps, key presses | ≤ 200ms | 200–500ms | \> 500ms |
| **CLS** (Cumulative Layout Shift) | Unexpected layout movement during load | ≤ 0.1 | 0.1–0.25 | \> 0.25 |

Two supporting metrics are worth watching because they explain LCP:

-   **TTFB** (Time to First Byte) — how long the server takes to start responding. Good is under ~800ms. A slow TTFB puts a floor under LCP.
-   **FCP** (First Contentful Paint) — when the first text or image appears.

Google evaluates the **75th percentile** of real users on mobile, so lab tools give you a direction but field data (Search Console, CrUX) is the source of truth.

## Largest Contentful Paint

The LCP element is usually a hero image, a large heading, or a background image.

**Fixes, in order of impact:**

1.  Reduce TTFB — caching, a CDN, faster hosting, less server-side work.
2.  Remove render-blocking resources — inline critical CSS, defer non-critical JavaScript.
3.  Optimise the LCP image — correct dimensions, modern format (WebP/AVIF), `fetchpriority="high"`, and preload it.
4.  Don't lazy-load the LCP image. Lazy loading is for below-the-fold content.

## Interaction to Next Paint

INP replaced First Input Delay in 2024. It measures the delay between a user interaction and the next frame the browser can paint, across the whole visit.

**Fixes:**

-   Break up long JavaScript tasks (anything over ~50ms).
-   Defer or remove third-party scripts that run on the main thread.
-   Avoid large synchronous work in event handlers; yield to the browser.
-   Reduce hydration cost on large client-rendered pages.

## Cumulative Layout Shift

CLS is caused by elements moving after they have already been painted.

**Fixes:**

-   Set explicit `width` and `height` (or `aspect-ratio`) on **every** image, video, iframe and ad slot.
-   Reserve space for content that loads late — banners, cookie notices, embeds.
-   Never insert content above existing content unless it is in response to a user action.
-   Load web fonts with `font-display: swap` and preload them to limit the reflow.

## Common mistakes

-   Optimising the lab score while field data stays poor — test with real-user data.
-   Fixing LCP by lazy-loading the hero image (this makes it worse).
-   Adding `aspect-ratio` to some images but not the ones that actually shift.
-   Treating a one-off improvement as permanent — a new marketing tag or template change can undo months of work.

## Checking your site

Our [SEO analyzer](/) pulls Core Web Vitals and the supporting metrics (TTFB, FCP) from Google's PageSpeed data for any URL and classifies each as good, needs improvement, or poor, alongside the rest of the [technical checks](/blog/technical-seo-checklist).
