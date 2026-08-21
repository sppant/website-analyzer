const benefits = [
  {
    number: "01",
    title: "Increase Organic Traffic",
    description:
      "Find technical and on-page SEO problems that can prevent your website from performing as well as it could in search.",
  },
  {
    number: "02",
    title: "Improve Search Visibility",
    description:
      "Identify missing metadata, heading issues, image problems, and other opportunities that can make your pages easier for search engines to understand.",
  },
  {
    number: "03",
    title: "Outrank Competitors",
    description:
      "Fix the fundamentals first, then use your SEO report to build a stronger foundation for competing in search results.",
  },
  {
    number: "04",
    title: "Know What to Fix First",
    description:
      "Instead of guessing, get prioritized opportunities so you can focus your time on the issues with the biggest potential impact.",
  },
];

function BusinessBenefits() {
  return (
    <section className="business-benefits">
      <span className="section-eyebrow">WHY IT MATTERS</span>

      <h2>Turn SEO problems into opportunities.</h2>

      <p>
        A better-optimized website can make it easier for potential customers
        to find your business when they are searching for what you offer.
      </p>

      <div className="benefits-grid">
        {benefits.map((benefit) => (
          <article className="benefit-card" key={benefit.number}>
            <span className="benefit-number">{benefit.number}</span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BusinessBenefits;
