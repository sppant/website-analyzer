import { useState } from "react";
import type { AnalysisResult } from "../types/seo";

const API_URL = import.meta.env.VITE_API_URL;

type UseSeoAnalyzerOptions = {
  /** Called after a successful analysis (e.g. to refresh the usage meter). */
  onSuccess?: () => void;
  /** Called when the request is rejected because the monthly limit is reached. */
  onLimitReached?: () => void;
};

export function useSeoAnalyzer(options: UseSeoAnalyzerOptions = {}) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function analyze(url: string, projectId?: string) {
    setError("");
    setLimitReached(false);
    setResult(null);

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a website URL.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmedUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setError("Please enter a valid HTTP or HTTPS URL.");
        return;
      }
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          projectId
            ? { url: parsedUrl.href, projectId }
            : { url: parsedUrl.href },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "ANALYSIS_LIMIT_REACHED") {
          setLimitReached(true);
          options.onLimitReached?.();
          return;
        }
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data);
      options.onSuccess?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    result,
    error,
    limitReached,
    isLoading,
    analyze,
  };
}
