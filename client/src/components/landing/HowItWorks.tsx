function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Enter your URL",
      description:
        "Tell us which website you want to analyze.",
    },
    {
      number: "02",
      title: "We analyze it",
      description:
        "We inspect the page and important technical files.",
    },
    {
      number: "03",
      title: "Get opportunities",
      description:
        "See the highest-impact improvements first.",
    },
  ];

  return (
    <section className="how-it-works">
      <div className="section-heading">
        <span className="eyebrow">How it works</span>
        <h2>Turn a URL into actionable SEO insights.</h2>
      </div>

      <div className="steps">
        {steps.map((step) => (
          <article className="step" key={step.number}>
            <span className="step-number">{step.number}</span>

            <h3>{step.title}</h3>

            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
