function BottomCTA() {
  function handleClick() {
    document.getElementById("analyzer-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setTimeout(() => {
      document.getElementById("website-url")?.focus();
    }, 500);
  }

  return (
    <section className="bottom-cta" aria-labelledby="bottom-cta-heading">
      <div className="bottom-cta-content">
        <span className="section-eyebrow">READY TO IMPROVE?</span>

        <h2 id="bottom-cta-heading">
          Find your biggest SEO opportunities.
        </h2>

        <p>
          Analyze your website for free and see what you can improve.
        </p>

        <button type="button" onClick={handleClick}>
          Analyze Your Website
          <span aria-hidden="true">→</span>
        </button>

        <small>No account. No credit card. 100% free.</small>
      </div>
    </section>
  );
}

export default BottomCTA;
