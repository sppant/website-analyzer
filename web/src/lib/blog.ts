import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { marked } from "marked";

/**
 * Build-time blog content pipeline (Next.js server-side equivalent of the
 * former Vite `blog-content` plugin in `client/vite/blog.ts`).
 *
 * Parses `src/content/blog/*.md` (YAML frontmatter + Markdown) at build time
 * — `marked` / `gray-matter` never reach the client bundle since every
 * caller here runs in a Server Component or a route handler.
 *
 * Adding an article = drop a new `.md` file in `src/content/blog/` and rebuild.
 */

const CONTENT_DIR = path.join(process.cwd(), "src/content/blog");

export type Article = {
  /** URL slug — the Markdown filename without `.md`. Unique by construction. */
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-08-15". */
  publishedAt: string;
  /** ISO date; present only when the article has been revised. */
  updatedAt?: string;
  author: string;
  category?: string;
  /** Estimated reading time in minutes. */
  readingTime: number;
  /** Rendered article body HTML (headings start at <h2>). */
  html: string;
};

function requireString(value: unknown, field: string, file: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Blog article "${file}": frontmatter field "${field}" is required and must be a non-empty string.`,
    );
  }
  return value.trim();
}

function requireDate(value: string, field: string, file: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(
      `Blog article "${file}": frontmatter "${field}" ("${value}") is not a valid date. Use "YYYY-MM-DD".`,
    );
  }
  return value;
}

function parseArticle(file: string): Article & { draft: boolean } {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(file, ".md");

  const title = requireString(data.title, "title", file);
  const description = requireString(data.description, "description", file);
  const publishedAt = requireDate(
    requireString(data.publishedAt, "publishedAt", file),
    "publishedAt",
    file,
  );
  const updatedAt =
    data.updatedAt != null
      ? requireDate(String(data.updatedAt), "updatedAt", file)
      : undefined;

  const words = content.split(/\s+/).filter(Boolean).length;

  return {
    slug,
    title,
    description,
    publishedAt,
    updatedAt,
    author: data.author != null ? String(data.author).trim() : "WebXDevelop",
    category: data.category != null ? String(data.category).trim() : undefined,
    readingTime: Math.max(1, Math.round(words / 200)),
    // Content is 100% first-party and parsed at build time, so the HTML is
    // trusted; it is rendered with dangerouslySetInnerHTML on the client.
    html: marked.parse(content, { gfm: true, async: false }) as string,
    draft: data.draft === true,
  };
}

let cached: Article[] | null = null;

/** All published articles, newest first. */
export function getArticles(): Article[] {
  if (cached) return cached;
  if (!fs.existsSync(CONTENT_DIR)) return (cached = []);

  cached = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(parseArticle)
    .filter((a) => !a.draft)
    .map(({ draft: _draft, ...article }) => article)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return cached;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getArticles().find((article) => article.slug === slug);
}

/**
 * Up to `limit` articles related to `slug` — same category first, then the most
 * recent others. Never includes the article itself.
 */
export function relatedArticles(slug: string, limit = 3): Article[] {
  const articles = getArticles();
  const current = getArticleBySlug(slug);
  const others = articles.filter((article) => article.slug !== slug);
  if (!current) return others.slice(0, limit);

  const sameCategory = current.category
    ? others.filter((article) => article.category === current.category)
    : [];
  const rest = others.filter((article) => !sameCategory.includes(article));

  return [...sameCategory, ...rest].slice(0, limit);
}
