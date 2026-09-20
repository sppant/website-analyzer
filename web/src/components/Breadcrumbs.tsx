import Link from "next/link";

import { SITE_URL } from "../lib/site";

export type Crumb = {
  label: string;
  /** Route path. Omit for the current page (last crumb). */
  to?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
  /** Also emit BreadcrumbList structured data. Omit when the page already
   * includes its own (e.g. combined into an Article/WebApplication graph). */
  jsonLd?: boolean;
};

/**
 * Visible, crawlable breadcrumb trail (e.g. Home → Blog → Article). When
 * `jsonLd` is set it also emits a matching BreadcrumbList.
 */
function Breadcrumbs({ items, jsonLd }: BreadcrumbsProps) {
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          {items.map((item, index) => (
            <li key={item.label}>
              {item.to ? (
                <Link href={item.to}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
              {index < items.length - 1 && (
                <span className="breadcrumbs-sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.label,
                ...(item.to
                  ? {
                      item:
                        item.to === "/"
                          ? `${SITE_URL}/`
                          : `${SITE_URL}${item.to}`,
                    }
                  : {}),
              })),
            }),
          }}
        />
      )}
    </>
  );
}

export default Breadcrumbs;
