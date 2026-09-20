"use client";

import { useState } from "react";
import type { FormEvent } from "react";

/**
 * The URL entry point for the analyzer. This app is static marketing content;
 * the analyzer tool itself is the React SPA served at `/app`. On submit we
 * validate the URL client-side, then do a full navigation to `/app` with the
 * URL prefilled so the SPA runs the analysis on load.
 *
 * Rendering the form here (rather than only linking to `/app`) means the
 * primary call to action is on the server-rendered landing page itself — the
 * page Google indexes and ranks.
 */

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

type AnalyzerLauncherProps = {
  /** Button label. */
  cta?: string;
  /** Small helper line under the field. Pass `null` to hide it. */
  note?: string | null;
};

function AnalyzerLauncher({
  cta = "Analyze Website",
  note = "100% free · No signup required",
}: AnalyzerLauncherProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Enter a valid website URL, e.g. example.com");
      return;
    }

    setError("");
    setSubmitting(true);
    window.location.href = `/app?url=${encodeURIComponent(normalized)}`;
  }

  return (
    <div className="analyzer-launcher">
      <form onSubmit={handleSubmit} noValidate>
        <div className="analyzer-launcher-row">
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            aria-label="Website URL to analyze"
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Opening analyzer…" : cta}
          </button>
        </div>

        {note && !error && <p className="analyzer-launcher-note">{note}</p>}
        {error && (
          <p className="analyzer-launcher-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export default AnalyzerLauncher;
