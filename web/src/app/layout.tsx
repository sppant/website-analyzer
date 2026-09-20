import type { Metadata, Viewport } from "next";

import "./globals.css";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import CookieConsent from "../components/CookieConsent";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description:
    "A free website SEO analyzer that checks on-page, technical and social SEO signals and returns a prioritized list of opportunities to fix.",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Site-wide Organization/WebSite graph. This app owns the homepage and every
// indexable content route, so it is the primary home for this schema; the SPA
// keeps a matching copy (same @id) in its static index.html for /pricing.
const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "WebXDevelop",
      url: `${SITE_URL}/`,
      logo: DEFAULT_OG_IMAGE,
      email: "hello@webxdevelop.com",
      sameAs: ["https://www.linkedin.com/in/spyros-p-a12698138/"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
      </head>
      <body>
        <Navigation />
        <CookieConsent />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
