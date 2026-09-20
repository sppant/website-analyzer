import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs from "../../components/Breadcrumbs";
import SerpPreviewTool from "../../components/SerpPreviewTool";
import { buildMetadata } from "../../lib/seo";
import { SITE_URL } from "../../lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Google SERP Snippet Preview Tool",
  description:
    "See how your title tag and meta description will appear in Google search results, with character counts and pixel-width truncation for desktop and mobile.",
  path: "/serp-preview",
});

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/serp-preview#tool`,
      name: "Google SERP Snippet Preview",
      url: `${SITE_URL}/serp-preview`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "A free tool to preview how a page's title tag and meta description will appear in Google search results, with character counts and pixel-width truncation for desktop and mobile.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "SERP Preview" },
      ],
    },
  ],
});

export default function SerpPreviewPage() {
  return (
    <div className="tool-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <Breadcrumbs
        items={[{ label: "Home", to: "/" }, { label: "SERP Preview" }]}
      />

      <div className="tool-head">
        <p className="section-eyebrow">FREE TOOL</p>
        <h1>Google SERP Snippet Preview</h1>
        <p>
          See how a page's <Link href="/blog/title-tag-seo">title tag</Link> and{" "}
          <Link href="/blog/meta-description-guide">meta description</Link> will
          appear in Google search results before you publish. Google truncates
          snippets by pixel width, not character count, so this preview measures
          both — on desktop and mobile.
        </p>
      </div>

      <SerpPreviewTool />

      <div className="article-body tool-prose">
        <h2>What this tool checks</h2>
        <p>
          A search result — the "snippet" — is built from your page's title tag
          and, usually, its meta description, shown under the site name and URL.
          This preview reproduces that layout and flags the two things that most
          often go wrong:
        </p>
        <ul>
          <li>
            <strong>Length in characters</strong> — a quick guide: roughly
            50–60 for the title, 120–160 for the description.
          </li>
          <li>
            <strong>Length in pixels</strong> — the number that actually
            decides where Google cuts the text off. A title full of capital
            letters and wide characters runs out of room sooner than one of the
            same character count in lowercase.
          </li>
        </ul>
        <p>
          When the title or description is too wide, the preview shows it
          truncated with an ellipsis — the same way it will appear in the
          results — so you can see exactly which words get lost.
        </p>

        <h2>Where the title and description come from</h2>
        <p>
          The <strong>title</strong> comes from the <code>&lt;title&gt;</code>{" "}
          element in your page's <code>&lt;head&gt;</code>. The{" "}
          <strong>description</strong> comes from the{" "}
          <code>&lt;meta name="description"&gt;</code> tag. Both are set in your
          CMS or page template.
        </p>
        <p>
          Google does not always use what you wrote. It rewrites the displayed
          title for a significant share of results — usually when the title is
          too long, keyword-stuffed, boilerplate, or missing — and it generates
          its own description more than half the time, especially for
          longer-tail queries, so that the snippet matches the specific search.
          This is normal and is not a penalty. Writing a clear, well-sized title
          and description for your primary query is still the best way to
          influence what shows.
        </p>

        <h2>Title and meta description length guidelines</h2>
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th>Characters</th>
              <th>Approx. pixel limit</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Title tag (desktop)</td>
              <td>~50–60</td>
              <td>~600px</td>
              <td>Primary topic first, brand last</td>
            </tr>
            <tr>
              <td>Title tag (mobile)</td>
              <td>~50–55</td>
              <td>~460px</td>
              <td>Wraps to two lines, then truncates</td>
            </tr>
            <tr>
              <td>Meta description (desktop)</td>
              <td>~120–160</td>
              <td>~960px</td>
              <td>Front-load the useful part</td>
            </tr>
            <tr>
              <td>Meta description (mobile)</td>
              <td>~110–130</td>
              <td>~840px</td>
              <td>Less room — the first sentence matters most</td>
            </tr>
          </tbody>
        </table>
        <p>
          Treat these as targets, not hard rules. A longer title is not broken —
          it just means Google decides which part to show instead of you.
        </p>

        <h2>Why the snippet matters</h2>
        <p>
          The snippet is your result's advert. Two pages can rank in similar
          positions and get very different traffic based on how clearly the
          title states what the page offers and how well the description answers
          the search. A truncated title that hides the key phrase, or a
          description that trails off mid-sentence, costs clicks you have
          already earned the ranking for.
        </p>

        <h2>How to fix a weak snippet</h2>
        <ul>
          <li>
            Rewrite the title so the primary topic is in the first few words and
            it fits within the pixel limit above.
          </li>
          <li>
            Write a description that answers the search in its first sentence,
            then adds a reason to choose your page — a specific number, "free",
            "step by step", "with examples".
          </li>
          <li>Make sure both are unique to the page — no duplicates across the site.</li>
          <li>
            Keep the title and the page's <Link href="/blog/how-many-h1-tags">H1</Link>{" "}
            close in meaning so the result matches what the visitor lands on.
          </li>
          <li>Re-preview here, then publish and check the live result after Google recrawls.</li>
        </ul>

        <h2>Check a page you have already published</h2>
        <p>
          This tool works from text you type in. To check a page that is already
          live — whether the title and description are present, their length,
          and how they sit alongside your headings, canonical tag, robots.txt,
          sitemap, Core Web Vitals and internal links — run the URL through the{" "}
          <Link href="/seo-audit">free SEO audit tool</Link>. It returns the same
          search preview plus a prioritized list of everything worth fixing.
        </p>
      </div>

      <aside className="tool-cta">
        <h2>Analyze the whole page</h2>
        <p>
          The SEO Opportunity Analyzer checks your title and description in
          context — with the rest of your on-page, technical and Core Web Vitals
          signals — and ranks the fixes by impact. Free, no signup required.
        </p>
        <a href="/app" className="upgrade-button">
          Run a free SEO analysis
        </a>
      </aside>

      <section className="tool-related" aria-labelledby="tool-related-heading">
        <h2 id="tool-related-heading">Related guides</h2>
        <ul>
          <li>
            <Link href="/blog/title-tag-seo">
              Title tag SEO: length, format and common mistakes
            </Link>
          </li>
          <li>
            <Link href="/blog/meta-description-guide">
              How to write a meta description
            </Link>
          </li>
          <li>
            <Link href="/blog/how-many-h1-tags">
              How many H1 tags should a page have?
            </Link>
          </li>
          <li>
            <Link href="/blog/technical-seo-checklist">Technical SEO checklist</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
