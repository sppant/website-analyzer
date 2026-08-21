import { useEffect, useState } from "react";

function ConsultationCTA() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <section className="consultation-cta">
        <div className="consultation-cta-content">
          <span className="section-eyebrow">NEED A HAND?</span>

          <h2>Need help fixing these issues?</h2>

          <p>
            Let WebXDevelop handle the technical work and improvements for you.
          </p>

          <button
            type="button"
            className="consultation-cta-button"
            onClick={() => setIsOpen(true)}
          >
            Book a Free Consultation
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      {isOpen && (
        <div
          className="calendly-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Book a free consultation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="calendly-modal-content">
            <button
              type="button"
              className="calendly-modal-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close consultation booking"
            >
              ×
            </button>

            <iframe
              src="https://calendly.com/hello-webxdevelop/30min?hide_gdpr_banner=1"
              title="Book a free consultation with WebXDevelop"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ConsultationCTA;
