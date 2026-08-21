function FeaturesPage() {
  const features = [
    {
      title: "SEO Score",
      description:
        "Get a clear score out of 100 based on the SEO issues detected on the page.",
    },
    {
      title: "On-Page SEO",
      description:
        "Analyze page titles, meta descriptions, H1 headings, and other core on-page signals.",
    },
    {
      title: "Technical SEO",
      description:
        "Check HTTPS, canonical URLs, viewport configuration, language declarations, robots.txt, and XML sitemaps.",
    },
    {
      title: "Images",
      description:
        "Find images missing alternative text so accessibility and image SEO issues are easier to identify.",
    },
    {
      title: "Social Metadata",
      description:
        "Check Open Graph and Twitter/X metadata to understand how pages may appear when shared.",
    },
    {
      title: "Prioritized Opportunities",
      description:
        "Issues are ranked by severity and score impact so you can focus on the changes that matter most.",
    },
  ];

  return (
    <>
      <header>
        <p className="section-eyebrow">FEATURES</p>
        <h1>Everything you need for a quick SEO check.</h1>
        <p>
          Analyze the most important technical and on-page SEO signals
          without needing an expensive SEO platform.
        </p>
      </header>

      <section className="feature-grid-page">
        {features.map((feature) => (
          <article key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </>
  );
}

export default FeaturesPage;
