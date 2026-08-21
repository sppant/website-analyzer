import { useEffect } from "react";

const GA_MEASUREMENT_ID = "G-7Y03Q4Q9T3";

function Analytics() {
  useEffect(() => {
    if (
      document.querySelector(
        `script[data-google-analytics="${GA_MEASUREMENT_ID}"]`,
      )
    ) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }

    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.googleAnalytics = GA_MEASUREMENT_ID;

    document.head.appendChild(script);
  }, []);

  return null;
}

export default Analytics;
