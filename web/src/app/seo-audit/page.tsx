import type { Metadata } from "next";
import Link from "next/link";

import AnalyzerLauncher from "../../components/AnalyzerLauncher";
import Breadcrumbs from "../../components/Breadcrumbs";
import { buildMetadata } from "../../lib/seo";
import { SITE_URL } from "../../lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Free SEO Audit Tool – Audit Any Page in Seconds",
  description:
    "Run a free SEO audit of any page. Check on-page tags, technical SEO, internal links and Core Web Vitals, then get a prioritized list of what to fix. No signup.",
  path: "/seo-audit",
});

const faqs = [
  {
    question: "What is an SEO audit?",
    answer:
      "An SEO audit is a structured review of the things that affect how a site performs in search — on-page content and tags, technical health (crawling, indexing, speed, HTTPS), site structure and internal linking, and off-site signals. The goal is a prioritized list of fixes, not just a pile of data.",
  },
  {
    question: "Is this SEO audit tool free?",
    answer:
      "Yes. Auditing a page is free and needs no account. You only need to sign up if you want to save audits and track a page's score over time.",
  },
  {
    question: "What does the audit check?",
    answer:
      "Title tag and meta description (with length), every H1, HTTPS, canonical tag, viewport and language, robots.txt and XML sitemap, internal and external links and anchor text, images missing alt text, Open Graph and Twitter tags, and Core Web Vitals (LCP, INP, CLS) from Google PageSpeed.",
  },
  {
    question: "Does this audit a whole website or a single page?",
    answer:
      "This tool audits one page at a time and is the fastest way to find issues on your most important URLs. For a site-wide review, run your key templates (home, a category page, a product or article page) and read the guide on how to do a full SEO audit.",
  },
  {
    question: "How often should I run an SEO audit?",
    answer:
      "Re-audit a page after any significant change to its content, template or metadata, and do a broader pass every quarter. Search engines and your own site both change over time, so audits are not a one-off.",
  },
];

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/seo-audit#tool`,
      name: "Free SEO Audit Tool",
      url: `${SITE_URL}/seo-audit`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "A free tool that audits any page's on-page, technical and social SEO signals plus Core Web Vitals and returns a prioritized list of fixes.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/seo-audit#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "SEO Audit" },
      ],
    },
  ],
});

export default function SeoAuditPage() {
  return (
    <div className="tool-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <Breadcrumbs
        items={[{ label: "Home", to: "/" }, { label: "SEO Audit" }]}
      />

      <div className="tool-head">
        <p className="section-eyebrow">FREE TOOL</p>
        <h1>Free SEO Audit Tool</h1>
        <p>
          Audit any page against the on-page, technical and{" "}
          <Link href="/blog/core-web-vitals-explained">Core Web Vitals</Link>{" "}
          signals search engines use, and get a prioritized list of what to fix
          first. No signup, no cost.
        </p>
      </div>

      <AnalyzerLauncher cta="Audit this page" />

      <div className="article-body tool-prose">
        <h2>What an SEO audit covers</h2>
        <p>
          An SEO audit is a structured review of everything that affects how a
          page performs in search. A good audit ends with a short, ranked list
          of changes — not a spreadsheet of every metric. This tool checks:
        </p>
        <ul>
          <li>
            <strong>On-page</strong> — the{" "}
            <Link href="/blog/title-tag-seo">title tag</Link>, the{" "}
            <Link href="/blog/meta-description-guide">meta description</Link>,
            and every <Link href="/blog/how-many-h1-tags">H1</Link>, with length
            checks.
          </li>
          <li>
            <strong>Technical</strong> — HTTPS, the{" "}
            <Link href="/blog/canonical-urls-explained">canonical tag</Link>,
            viewport and language declaration,{" "}
            <Link href="/blog/robots-txt-guide">robots.txt</Link> and the{" "}
            <Link href="/blog/xml-sitemap-guide">XML sitemap</Link>.
          </li>
          <li>
            <strong>Links</strong> — internal and external link counts, unique
            destinations, and{" "}
            <Link href="/blog/internal-linking-best-practices">
              empty or generic anchor text
            </Link>
            .
          </li>
          <li>
            <strong>Performance</strong> — Largest Contentful Paint, Interaction
            to Next Paint and Cumulative Layout Shift from Google PageSpeed data.
          </li>
          <li>
            <strong>Social</strong> — Open Graph and Twitter card tags used for
            link previews.
          </li>
        </ul>

        <h2>How to read the results</h2>
        <p>
          Each issue is scored by severity and estimated impact, so the top of
          the list is where your time is best spent. Fix those, re-run the
          audit, and move down. The{" "}
          <Link href="/serp-preview">SERP preview tool</Link> helps you check a
          rewritten title or description before you publish it.
        </p>

        <h2>Auditing a whole site</h2>
        <p>
          This tool audits one URL at a time. To review an entire site, audit
          your key templates — the homepage, a category or listing page, and a
          product or article page — since issues there usually repeat across
          every page built from the same template. For the full process, read{" "}
          <Link href="/blog/how-to-do-an-seo-audit">how to do an SEO audit</Link>{" "}
          and the{" "}
          <Link href="/blog/technical-seo-checklist">
            technical SEO checklist
          </Link>
          . New to audits? Start with{" "}
          <Link href="/blog/what-is-an-seo-audit">what an SEO audit is</Link>.
        </p>
      </div>

      <aside className="tool-cta">
        <h2>Analyze a specific page in depth</h2>
        <p>
          The SEO Opportunity Analyzer runs the full audit on any URL and ranks
          every fix by impact. Free, no signup required.
        </p>
        <a href="/app" className="upgrade-button">
          Run a free SEO audit
        </a>
      </aside>

      <section className="faq-section" aria-labelledby="faq-heading">
        <div className="section-eyebrow">FAQ</div>
        <h2 id="faq-heading">SEO audit FAQ</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tool-related" aria-labelledby="tool-related-heading">
        <h2 id="tool-related-heading">Related guides</h2>
        <ul>
          <li>
            <Link href="/blog/what-is-an-seo-audit">What is an SEO audit?</Link>
          </li>
          <li>
            <Link href="/blog/how-to-do-an-seo-audit">
              How to do an SEO audit, step by step
            </Link>
          </li>
          <li>
            <Link href="/blog/technical-seo-checklist">
              Technical SEO checklist
            </Link>
          </li>
          <li>
            <Link href="/blog/how-to-improve-website-seo">
              How to improve website SEO
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
