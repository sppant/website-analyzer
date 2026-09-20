import type { Metadata } from "next";
import Link from "next/link";

import AnalyzerLauncher from "../components/AnalyzerLauncher";
import { buildMetadata } from "../lib/seo";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Free SEO Page Analysis – Analyze Any Page's SEO",
  description:
    "Run a free SEO analysis of any page. Check title tags, meta descriptions, headings, technical SEO and Core Web Vitals, then get a prioritized list of fixes. No signup.",
  path: "/",
});

const faqs = [
  {
    question: "What is SEO page analysis?",
    answer:
      "SEO page analysis is the process of checking a single web page against the signals search engines use to understand and rank it — the title tag, meta description, headings, canonical tag, structured data, internal links, image alt text, and technical basics like HTTPS and Core Web Vitals. This tool runs those checks automatically and returns a prioritized list of what to fix.",
  },
  {
    question: "Is the SEO analyzer free?",
    answer:
      "Yes. Analyzing a page is 100% free and does not require an account or a credit card.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. You can analyze a page without signing up. An account is only needed if you want to save analyses and track how a page's score changes over time.",
  },
  {
    question: "What does the analyzer check?",
    answer:
      "Page title and length, meta description and length, every H1, HTTPS, canonical tag, viewport and language declaration, robots.txt and XML sitemap, internal and external links, anchor text quality, images missing alt text, Open Graph and Twitter card tags, and Core Web Vitals (LCP, INP, CLS) from Google PageSpeed data.",
  },
  {
    question: "How is the SEO score calculated?",
    answer:
      "The score starts at 100 and is reduced by each issue found, weighted by its severity and estimated impact. It is a practical health score for the page, not a prediction of Google ranking position.",
  },
  {
    question: "What's the difference between page analysis and a full SEO audit?",
    answer:
      "Page analysis looks at one URL in depth. An SEO audit usually means reviewing a whole site — templates, site structure, indexation and recurring issues across many pages. Start with the page analysis here, then read how to run a site-wide SEO audit.",
  },
  {
    question: "Does analyzing a page change anything on my site?",
    answer:
      "No. The analyzer only reads the publicly accessible page, the same way a search engine crawler would. It never modifies your site.",
  },
  {
    question: "How long does an analysis take?",
    answer:
      "Most analyses finish in a few seconds. Pages that are slow to respond or that require fetching PageSpeed data can take a little longer.",
  },
];

const checks: { title: string; body: string; href: string; label: string }[] = [
  {
    title: "On-page tags",
    body: "Title and meta description with character counts, and every H1 on the page — the text that tells search engines and searchers what the page is about.",
    href: "/blog/title-tag-seo",
    label: "Title tag SEO guide",
  },
  {
    title: "Search preview",
    body: "See the page rendered as a Google result with pixel-width truncation, so you know how the title and description actually appear before you publish.",
    href: "/serp-preview",
    label: "Open the SERP preview tool",
  },
  {
    title: "Technical SEO",
    body: "HTTPS, canonical tag, viewport, language declaration, robots.txt (including sitemap references and site-wide blocks) and XML sitemap detection.",
    href: "/blog/technical-seo-checklist",
    label: "Technical SEO checklist",
  },
  {
    title: "Internal links",
    body: "Internal and external link counts, unique destinations, empty or generic anchor text, HTTP links on HTTPS pages, and your most-linked pages.",
    href: "/blog/internal-linking-best-practices",
    label: "Internal linking best practices",
  },
  {
    title: "Core Web Vitals",
    body: "Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift from Google PageSpeed data, classified good / needs work / poor.",
    href: "/blog/core-web-vitals-explained",
    label: "Core Web Vitals explained",
  },
  {
    title: "Prioritized fixes",
    body: "Every issue ranked by severity and estimated score impact, each with a specific recommendation — so you fix what matters most first.",
    href: "/features",
    label: "See all SEO checks",
  },
];

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "SEO Opportunity Analyzer",
      url: `${SITE_URL}/`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "A free SEO page analyzer that checks on-page, technical and social SEO signals for any URL and returns a prioritized list of opportunities to fix.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
});

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <header>
        <p className="section-eyebrow">FREE SEO ANALYZER</p>
        <h1>Free SEO page analysis for any URL</h1>
        <p>
          Analyze any page&apos;s SEO in seconds. The SEO Opportunity Analyzer
          checks on-page, technical and social signals — title tags, meta
          descriptions, headings, canonical tags, robots.txt, sitemaps, internal
          links and Core Web Vitals — then ranks the opportunities worth fixing
          first. Free, no account needed.
        </p>

        <AnalyzerLauncher />
      </header>

      <div className="feature-highlights">
        <span>
          <strong>✓</strong>
          Technical SEO
        </span>
        <span>
          <strong>✓</strong>
          On-page SEO
        </span>
        <span>
          <strong>✓</strong>
          Social metadata
        </span>
        <span>
          <strong>✓</strong>
          Core Web Vitals
        </span>
        <Link href="/features" className="feature-highlights-link">
          See all SEO checks
        </Link>
      </div>

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading">What the analyzer checks</h2>
        <div className="feature-grid-page">
          {checks.map((check) => (
            <article key={check.title}>
              <h3>{check.title}</h3>
              <p>{check.body}</p>
              <p className="feature-learn-more">
                <Link href={check.href}>{check.label} →</Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="how-it-works">
        <div className="how-it-works-heading">
          <span>HOW IT WORKS</span>
          <h2>From URL to a prioritized SEO fix list</h2>
        </div>

        <div className="how-it-works-grid">
          <article>
            <span>01</span>
            <h3>Enter a URL</h3>
            <p>
              Paste the page you want to analyze. The analyzer fetches its
              publicly available HTML and technical resources.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>It runs the checks</h3>
            <p>
              On-page tags, technical SEO, internal links, social metadata and
              Core Web Vitals — the same signals a search engine reads.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Fix the opportunities</h3>
            <p>
              Get a list of issues ranked by impact, each with a specific
              recommendation you can act on.
            </p>
          </article>
        </div>

        <p className="how-it-works-footnote">
          New to SEO? Read the <Link href="/blog">SEO guides</Link> for
          plain-English explanations of every check, or{" "}
          <Link href="/serp-preview">preview your Google snippet</Link> before
          you publish a change.
        </p>
      </div>

      <section aria-labelledby="audit-heading" className="home-prose">
        <h2 id="audit-heading">
          SEO page analysis vs. a full SEO audit
        </h2>
        <p>
          A <strong>page analysis</strong> looks at one URL in depth and is the
          fastest way to find and fix what is holding a specific page back. A{" "}
          <strong>full SEO audit</strong> is broader: it reviews site structure,
          templates, indexation and the issues that repeat across many pages.
        </p>
        <p>
          Most improvements start at the page level. Run the analysis above,
          work through the prioritized fixes, then use the{" "}
          <Link href="/seo-audit">free SEO audit tool</Link> and the guide on{" "}
          <Link href="/blog/how-to-do-an-seo-audit">
            how to do an SEO audit
          </Link>{" "}
          when you are ready to review the whole site. If you are still learning
          the fundamentals, start with{" "}
          <Link href="/blog/what-is-an-seo-audit">what an SEO audit is</Link> and{" "}
          <Link href="/blog/how-to-improve-website-seo">
            how to improve website SEO
          </Link>
          .
        </p>
      </section>

      <section className="faq-section" aria-labelledby="faq-heading">
        <div className="section-eyebrow">FAQ</div>
        <h2 id="faq-heading">Frequently asked questions</h2>
        <p className="faq-intro">
          Everything you need to know about SEO page analysis with the SEO
          Opportunity Analyzer.
        </p>

        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bottom-cta" aria-labelledby="bottom-cta-heading">
        <div className="bottom-cta-content">
          <span className="section-eyebrow">READY TO IMPROVE?</span>
          <h2 id="bottom-cta-heading">Find your biggest SEO opportunities</h2>
          <p>Analyze any page for free and see exactly what to fix first.</p>
          <AnalyzerLauncher cta="Analyze a page" note={null} />
          <small>No account. No credit card. 100% free.</small>
        </div>
      </section>
    </>
  );
}
