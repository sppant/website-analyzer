function ProductPreview() {
  return (
    <section className="product-preview">
      <span className="section-eyebrow">PRODUCT PREVIEW</span>

      <h2>See what your SEO report looks like</h2>

      <p>
        Get a clear breakdown of technical and on-page SEO opportunities
        without digging through complicated reports.
      </p>

      <div className="product-preview-card">
        <div className="preview-header">
          <div>
            <span className="preview-label">SEO SCORE</span>
            <strong>78</strong>
            <span className="preview-score">/ 100</span>
          </div>

          <span className="preview-status">Good</span>
        </div>

        <div className="preview-summary">
          <strong>5 opportunities found</strong>
          <span>example.com</span>
        </div>

        <div className="preview-grid">
          <div>
            <span>Page Title</span>
            <strong>✓</strong>
          </div>

          <div>
            <span>Meta Description</span>
            <strong>✓</strong>
          </div>

          <div>
            <span>H1 Headings</span>
            <strong>✓</strong>
          </div>

          <div>
            <span>Missing Alt Text</span>
            <strong>3</strong>
          </div>
        </div>

        <div className="preview-opportunity">
          <div>
            <span>IMPORTANT</span>
            <strong>Missing image alt text</strong>
          </div>

          <p>
            Add descriptive alt text to images to improve accessibility and
            image SEO.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ProductPreview;
