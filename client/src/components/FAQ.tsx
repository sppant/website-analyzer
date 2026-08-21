const faqs = [
  {
    question: "What is the SEO Opportunity Analyzer?",
    answer:
      "The SEO Opportunity Analyzer scans a website and identifies SEO issues and opportunities that could help improve its search visibility.",
  },
  {
    question: "Is the SEO analyzer free?",
    answer:
      "Yes. The analyzer is currently 100% free to use and does not require a credit card.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. You can analyze a website without creating an account or signing up.",
  },
  {
    question: "What does the analyzer check?",
    answer:
      "The analyzer checks areas such as page titles, meta descriptions, headings, technical SEO, canonical URLs, robots.txt, sitemaps, images, Open Graph data, and other SEO signals.",
  },
  {
    question: "Does analyzing my website make any changes?",
    answer:
      "No. The analyzer only reviews the publicly accessible website. It does not modify your website or its content.",
  },
  {
    question: "How is the SEO score calculated?",
    answer:
      "The score starts at 100 and is reduced based on the severity and impact of issues identified during the analysis. The score is intended as a practical overview rather than a search-engine ranking score.",
  },
  {
    question: "How long does an analysis take?",
    answer:
      "Most analyses complete within a few seconds, although the exact time depends on the website and its response time.",
  },
];

function FAQ() {
  return (
    <section className="faq-section" aria-labelledby="faq-heading">
      <div className="section-eyebrow">FAQ</div>

      <h2 id="faq-heading">Frequently asked questions</h2>

      <p className="faq-intro">
        Everything you need to know about the SEO Opportunity Analyzer.
      </p>

      <div className="faq-list">
        {faqs.map((faq) => (
          <details key={faq.question} className="faq-item">
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default FAQ;

export { faqs };
