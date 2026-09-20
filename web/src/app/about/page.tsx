import type { Metadata } from "next";
import Link from "next/link";

import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About the SEO Opportunity Analyzer",
  description:
    "Why the SEO Opportunity Analyzer exists, how it works, and what it's built with — a free tool that turns a technical SEO audit into a clear, prioritized list of improvements.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <header>
        <p className="section-eyebrow">ABOUT</p>
        <h1>Built to make SEO more actionable.</h1>
        <p>
          SEO Opportunity Analyzer is a free tool designed to turn a
          technical SEO audit into a clear list of practical improvements.
          See the full <Link href="/features">list of SEO checks</Link> or{" "}
          <a href="/">analyze a website</a>.
        </p>
      </header>

      <section className="about-page">
        <article>
          <h2>Why I built it</h2>
          <p>
            Many SEO tools provide large amounts of data without making it
            obvious what should actually be fixed first. This project focuses
            on identifying the biggest opportunities and explaining how to
            address them.
          </p>
        </article>

        <article>
          <h2>How it works</h2>
          <p>
            The backend fetches the submitted website, parses its HTML,
            checks technical resources such as robots.txt and XML sitemaps,
            evaluates SEO metadata, and calculates a score from the findings.
          </p>
        </article>

        <article>
          <h2>Built with</h2>
          <p>
            React, TypeScript, Vite, Fastify, Node.js, and Cheerio. The public
            API also includes protections such as SSRF validation and rate
            limiting.
          </p>
        </article>

        <article>
          <h2>Still evolving</h2>
          <p>
            This is an actively developed project. New checks and product
            improvements will be added over time based on real-world SEO
            requirements.
          </p>
        </article>
      </section>
    </>
  );
}
