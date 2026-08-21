import { isSafeUrl } from "../utils/safeUrl.js";

const USER_AGENT = "WebsiteSEOOpportunityAnalyzer/1.0";

export async function fetchWithTimeout(
  url: string,
  timeout = 10000,
  maxRedirects = 5,
): Promise<Response | null> {
  let currentUrl = url;

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount++
  ) {
    if (!(await isSafeUrl(currentUrl))) {
      return null;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
        redirect: "manual",
      });

      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = response.headers.get("location");

      if (!location) {
        return response;
      }

      currentUrl = new URL(location, currentUrl).href;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
