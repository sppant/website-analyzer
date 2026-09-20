import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Breadcrumbs from "../../../components/Breadcrumbs";
import { getArticleBySlug, getArticles, relatedArticles } from "../../../lib/blog";
import type { Article } from "../../../lib/blog";
import { buildMetadata } from "../../../lib/seo";
import { SITE_URL } from "../../../lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return buildMetadata({
    title: `${article.title} | SEO Opportunity Analyzer`,
    description: article.description,
    path: `/blog/${article.slug}`,
    ogType: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function articleJsonLd(article: Article): string {
  const url = `${SITE_URL}/blog/${article.slug}`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        author: {
          "@type": "Organization",
          name: article.author,
          url: `${SITE_URL}/`,
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: { "@id": `${SITE_URL}/blog#blog` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: article.title },
        ],
      },
    ],
  });
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = relatedArticles(article.slug);

  return (
    <article className="blog-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleJsonLd(article) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Blog", to: "/blog" },
          { label: article.title },
        ]}
      />

      <div className="blog-article-header">
        <p className="blog-article-meta">
          {formatDate(article.publishedAt)} · {article.readingTime} min read
          {article.category ? ` · ${article.category}` : ""}
          {article.updatedAt
            ? ` · Updated ${formatDate(article.updatedAt)}`
            : ""}
        </p>
        <h1>{article.title}</h1>
        <p className="blog-article-lede">{article.description}</p>
      </div>

      {/* Content is first-party Markdown rendered to HTML at build time. */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: article.html }}
      />

      <aside className="blog-article-cta">
        <h2>Check your own site</h2>
        <p>
          Run a free SEO analysis and see how your website scores on the checks
          in this article — no signup required.
        </p>
        <a href="/app" className="upgrade-button">
          Analyze your website
        </a>
      </aside>

      {related.length > 0 && (
        <section className="blog-related" aria-labelledby="related-heading">
          <h2 id="related-heading">Keep reading</h2>
          <ul>
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/blog/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="blog-back-link">
        <Link href="/blog">← All articles</Link>
      </p>
    </article>
  );
}
