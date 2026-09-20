import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "SEO Analyzer Features – On-Page, Technical & Social Checks",
  description:
    "Every check the SEO Opportunity Analyzer runs: SEO score, on-page tags, search preview, technical SEO, internal links, Core Web Vitals, images and prioritized fixes.",
  path: "/features",
});

type Feature = {
  title: string;
  description: ReactNode;
  learnMore?: { to: string; label: string };
};

const features: Feature[] = [
  {
    title: "SEO Score",
    description:
      "A single score out of 100 based on the on-page, technical and social issues detected on the page, with each issue weighted by severity and impact.",
    learnMore: { to: "/blog/how-to-do-an-seo-audit", label: "How to do an SEO audit" },
  },
  {
    title: "On-Page SEO",
    description:
      "Page title and length, meta description and length, and every H1 on the page — the signals that tell search engines and searchers what the page is about.",
    learnMore: { to: "/blog/title-tag-seo", label: "Title & meta description guides" },
  },
  {
    title: "Search Preview",
    description: (
      <>
        See the page rendered as a Google result, with character counts for the
        title and description. Planning a change first? Use the{" "}
        <Link href="/serp-preview">SERP preview tool</Link>.
      </>
    ),
    learnMore: { to: "/serp-preview", label: "Open the SERP preview tool" },
  },
  {
    title: "Technical SEO",
    description:
      "HTTPS, canonical tags, viewport configuration, language declaration, robots.txt (including sitemap references and site-wide blocks), and XML sitemap detection.",
    learnMore: {
      to: "/blog/technical-seo-checklist",
      label: "Technical SEO checklist",
    },
  },
  {
    title: "Internal Links",
    description:
      "Internal and external link counts, unique destinations, empty and generic anchor text, HTTP links on HTTPS pages, self-links, and your most-linked pages.",
    learnMore: {
      to: "/blog/internal-linking-best-practices",
      label: "Internal linking best practices",
    },
  },
  {
    title: "Core Web Vitals",
    description:
      "Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift, plus FCP and TTFB, pulled from Google PageSpeed data and classified good / needs work / poor.",
    learnMore: {
      to: "/blog/core-web-vitals-explained",
      label: "Core Web Vitals explained",
    },
  },
  {
    title: "Images",
    description:
      "Every image missing alt text, listed with its source, so accessibility and image-SEO gaps are easy to find and fix.",
  },
  {
    title: "Prioritized Opportunities",
    description:
      "Issues ranked by severity and estimated score impact, each with a specific recommendation, so you fix the changes that matter most first.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <header>
        <p className="section-eyebrow">FEATURES</p>
        <h1>SEO analyzer features: every check it runs</h1>
        <p>
          The SEO Opportunity Analyzer checks the most important technical and
          on-page SEO signals for any URL — no expensive SEO platform needed.
          Below is every check it runs. Ready to use it?{" "}
          <a href="/">Run a free SEO page analysis</a> or a full{" "}
          <Link href="/seo-audit">SEO audit</Link>, preview a result with the{" "}
          <Link href="/serp-preview">SERP preview tool</Link>, or read the{" "}
          <Link href="/blog">SEO guides</Link>.
        </p>
      </header>

      <section className="feature-grid-page">
        {features.map((feature) => (
          <article key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
            {feature.learnMore && (
              <p className="feature-learn-more">
                <Link href={feature.learnMore.to}>{feature.learnMore.label} →</Link>
              </p>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
