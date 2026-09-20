import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs from "../../components/Breadcrumbs";
import { getArticles } from "../../lib/blog";
import { buildMetadata } from "../../lib/seo";
import { SITE_URL } from "../../lib/site";

export const metadata: Metadata = buildMetadata({
  title: "SEO Blog – Guides, Checklists & Explainers",
  description:
    "Practical guides on technical SEO, on-page optimization, Core Web Vitals and internal linking — the same areas the free SEO Opportunity Analyzer checks.",
  path: "/blog",
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const blogJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE_URL}/blog#blog`,
  name: "SEO Opportunity Analyzer Blog",
  description:
    "Guides and checklists on technical SEO, on-page optimization, Core Web Vitals and internal linking.",
  url: `${SITE_URL}/blog`,
  publisher: { "@id": `${SITE_URL}/#organization` },
});

export default function BlogIndexPage() {
  const articles = getArticles();

  return (
    <div className="blog-index">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: blogJsonLd }}
      />

      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Blog" }]} />

      <div className="dashboard-head">
        <h1>SEO Blog</h1>
        <p>
          Practical, no-fluff guides on the SEO fundamentals — technical checks,
          on-page tags, Core Web Vitals and internal linking. These are the same
          areas the <a href="/">free SEO analyzer</a> reports on, explained
          so you know what to fix and why.
        </p>
      </div>

      <ul className="blog-card-list">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/blog/${article.slug}`} className="blog-card">
              <p className="blog-card-meta">
                {formatDate(article.publishedAt)} · {article.readingTime} min
                read
                {article.category ? ` · ${article.category}` : ""}
              </p>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <span className="blog-card-cue">Read article →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
