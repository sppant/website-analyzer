function HowItWorks() {
  return (
    <div className="how-it-works">
      <div className="how-it-works-heading">
        <span>HOW IT WORKS</span>
        <h2>From URL to actionable SEO insights.</h2>
      </div>

      <div className="how-it-works-grid">
        <article>
          <span>01</span>

          <h3>Enter your URL</h3>

          <p>
            Enter the website you want to analyze and we'll inspect its
            publicly available SEO data.
          </p>
        </article>

        <article>
          <span>02</span>

          <h3>We analyze it</h3>

          <p>
            We check important on-page, technical, and social SEO signals.
          </p>
        </article>

        <article>
          <span>03</span>

          <h3>Find opportunities</h3>

          <p>
            Get a prioritized list of issues and improvements worth fixing.
          </p>
        </article>
      </div>

      <p className="how-it-works-footnote">
        New to SEO? Read the <a href="/blog">SEO guides</a> for plain-English
        explanations of every check, or{" "}
        <a href="/serp-preview">preview your Google snippet</a> to see how
        your page looks in search results.
      </p>
    </div>
  );
}

export default HowItWorks;
