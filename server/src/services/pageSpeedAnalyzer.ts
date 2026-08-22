export type PageSpeedData = {
  performanceScore: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
};

type PageSpeedResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: {
        score?: number;
      };
    };
    audits?: {
      "largest-contentful-paint"?: {
        numericValue?: number;
      };
      "cumulative-layout-shift"?: {
        numericValue?: number;
      };
      "interaction-to-next-paint"?: {
        numericValue?: number;
      };
      "first-contentful-paint"?: {
        numericValue?: number;
      };
      "server-response-time"?: {
        numericValue?: number;
      };
    };
  };
};

const PAGESPEED_TIMEOUT = 30_000;

export async function analyzePageSpeed(
  url: string,
): Promise<PageSpeedData> {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    throw new Error("PAGESPEED_API_KEY is not configured.");
  }

  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );

  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("category", "performance");

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, PAGESPEED_TIMEOUT);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `PageSpeed API request failed (${response.status})`;

      try {
        const body = await response.text();

        if (body) {
          errorMessage += `: ${body.slice(0, 1000)}`;
        }
      } catch {
        // Ignore errors while reading the error response.
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as PageSpeedResponse;

    const lighthouse = data.lighthouseResult;
    const performanceScore =
      lighthouse?.categories?.performance?.score;

    const audits = lighthouse?.audits;

    return {
      performanceScore:
        typeof performanceScore === "number"
          ? Math.round(performanceScore * 100)
          : null,

      lcp:
        typeof audits?.["largest-contentful-paint"]?.numericValue ===
        "number"
          ? audits["largest-contentful-paint"].numericValue
          : null,

      cls:
        typeof audits?.["cumulative-layout-shift"]?.numericValue ===
        "number"
          ? audits["cumulative-layout-shift"].numericValue
          : null,

      inp:
        typeof audits?.["interaction-to-next-paint"]?.numericValue ===
        "number"
          ? audits["interaction-to-next-paint"].numericValue
          : null,

      fcp:
        typeof audits?.["first-contentful-paint"]?.numericValue ===
        "number"
          ? audits["first-contentful-paint"].numericValue
          : null,

      ttfb:
        typeof audits?.["server-response-time"]?.numericValue ===
        "number"
          ? audits["server-response-time"].numericValue
          : null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `PageSpeed API request timed out after ${
          PAGESPEED_TIMEOUT / 1000
        } seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
