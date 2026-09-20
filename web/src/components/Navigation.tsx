import Link from "next/link";

import AuthStatus from "./AuthStatus";

function Navigation() {
  return (
    <nav className="top-nav" aria-label="Main navigation">
      <Link href="/" className="brand">
        <img src="/logo.png" alt="" width={30} height={30} />
        <span>SEO Opportunity Analyzer</span>
      </Link>

      <div className="nav-links">
        <Link href="/seo-audit">SEO Audit</Link>
        <Link href="/features">Features</Link>
        <a href="/app/pricing">Pricing</a>
        <Link href="/blog">Blog</Link>
        <Link href="/about">About</Link>

        <AuthStatus />
      </div>
    </nav>
  );
}

export default Navigation;
