import { useEffect, useState } from "react";

const messages = [
  "Connecting to website…",
  "Analyzing page structure…",
  "Checking on-page SEO…",
  "Scanning technical SEO…",
  "Analyzing performance…",
  "Finding SEO opportunities…",
  "Preparing your report…",
];

function AnalysisLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => {
        return Math.min(current + 1, messages.length - 1);
      });
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="analysis-loader" role="status" aria-live="polite">
      <div className="analysis-loader-card">
        <div className="analysis-loader-icon">
          <span />
          <span />
          <span />
        </div>

        <div className="analysis-loader-content">
          <strong>{messages[messageIndex]}</strong>

          <p>
            This may take a few seconds while we analyze the website.
          </p>

          <div className="analysis-loader-progress">
            <div
              className="analysis-loader-progress-bar"
              style={{
                width: `${((messageIndex + 1) / messages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisLoader;
