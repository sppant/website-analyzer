function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="/" className="footer-logo">
            <img src="/favicon.png" alt="WebXDevelop" />
            <span>WebXDevelop</span>
          </a>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <div>
            <h3>Explore</h3>
            <a href="/#features">Features</a>
            <a href="/#how-it-works">How It Works</a>
            <a href="/legal">Privacy & Terms</a>
          </div>

          <div>
            <h3>Connect</h3>
            <a href="mailto:hello@webxdevelop.com">hello@webxdevelop.com</a>
            <a
              href="https://www.linkedin.com/in/spyros-p-a12698138/"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link"
              aria-label="LinkedIn"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2 2 0 1 0 5.25 7a2 2 0 0 0 0-4ZM20.44 13.42c0-3.46-1.84-5.07-4.29-5.07-1.97 0-2.85 1.08-3.34 1.84V8.5H9.44V20h3.37v-5.69c0-1.5.28-2.95 2.14-2.95 1.83 0 1.86 1.71 1.86 3.05V20h3.63v-6.58Z"
                />
              </svg>
            </a>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} WebXDevelop</span>
        <span>SEO Opportunity Analyzer</span>
      </div>
    </footer>
  );
}

export default Footer;
