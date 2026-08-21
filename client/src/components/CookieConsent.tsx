import { useEffect, useState } from "react";
import Analytics from "./Analytics";

const CONSENT_KEY = "analytics-consent";

type Consent = "accepted" | "rejected" | null;

function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);

    if (saved === "accepted" || saved === "rejected") {
      setConsent(saved);
    } else {
      setVisible(true);
    }
  }, []);

  function handleConsent(choice: Exclude<Consent, null>) {
    localStorage.setItem(CONSENT_KEY, choice);
    setConsent(choice);
    setVisible(false);
  }

  return (
    <>
      {consent === "accepted" && <Analytics />}

      {visible && (
        <aside
          className="cookie-banner"
          aria-label="Cookie consent"
        >
          <div className="cookie-content">
            <div>
              <strong>Cookies & Analytics</strong>

              <p>
                We use Google Analytics to understand how visitors use this
                website and improve the service. Analytics is optional.{" "}
                <a href="/legal">Privacy Policy</a>
              </p>
            </div>

            <div className="cookie-actions">
              <button
                type="button"
                className="cookie-reject"
                onClick={() => handleConsent("rejected")}
              >
                Reject
              </button>

              <button
                type="button"
                className="cookie-accept"
                onClick={() => handleConsent("accepted")}
              >
                Accept Analytics
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}

export default CookieConsent;
