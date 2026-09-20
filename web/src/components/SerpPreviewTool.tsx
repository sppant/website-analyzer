"use client";

import { useId, useMemo, useState } from "react";

/**
 * Standalone Google search-snippet preview. Fully client-side: the user types a
 * title, description and URL and sees an approximate desktop / mobile snippet
 * with character counts and pixel-width truncation. No network calls — for
 * checking a page that is already published, the page links to the full
 * analyzer.
 */

// Google renders result titles at roughly 20px and descriptions at 14px in an
// Arial-like family. Truncation is by pixel width, not character count.
const TITLE_FONT = '400 20px Arial, "Helvetica Neue", sans-serif';
const DESC_FONT = '400 14px Arial, "Helvetica Neue", sans-serif';

const LIMITS = {
  desktop: { title: 600, description: 960 },
  mobile: { title: 460, description: 840 },
} as const;

type Device = keyof typeof LIMITS;

let sharedCanvas: HTMLCanvasElement | null = null;

function measure(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 8;
  sharedCanvas ??= document.createElement("canvas");
  const ctx = sharedCanvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function truncateToWidth(
  text: string,
  font: string,
  maxWidth: number,
): { text: string; truncated: boolean; width: number } {
  const fullWidth = measure(text, font);
  if (fullWidth <= maxWidth) {
    return { text, truncated: false, width: Math.round(fullWidth) };
  }

  const ellipsis = "…";
  const ellipsisWidth = measure(ellipsis, font);
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(text.slice(0, mid), font) + ellipsisWidth <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return {
    text: text.slice(0, low).trimEnd() + ellipsis,
    truncated: true,
    width: Math.round(fullWidth),
  };
}

function formatDisplayUrl(raw: string): { host: string; crumbs: string[] } {
  try {
    const parsed = new URL(raw.trim());
    const segments = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment).replace(/-/g, " "));
    return { host: parsed.hostname.replace(/^www\./, ""), crumbs: segments };
  } catch {
    const cleaned = raw.trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
    const [host, ...rest] = cleaned.split("/");
    return {
      host: host || "example.com",
      crumbs: rest.filter(Boolean).map((s) => s.replace(/-/g, " ")),
    };
  }
}

function countClass(
  length: number,
  min: number,
  max: number,
): "good" | "warning" {
  return length >= min && length <= max ? "good" : "warning";
}

const SAMPLE = {
  title: "How to Descale a Kettle: 3 Methods That Actually Work",
  description:
    "A step-by-step guide to descaling a kettle with white vinegar, citric acid or a commercial descaler — how long each method takes and which is safest for your kettle.",
  url: "https://example.com/kitchen/how-to-descale-a-kettle",
};

function SerpPreviewTool() {
  const [title, setTitle] = useState(SAMPLE.title);
  const [description, setDescription] = useState(SAMPLE.description);
  const [url, setUrl] = useState(SAMPLE.url);
  const [device, setDevice] = useState<Device>("desktop");

  const fieldId = useId();

  const { host, crumbs } = useMemo(() => formatDisplayUrl(url), [url]);

  const titleResult = useMemo(
    () =>
      truncateToWidth(
        title.trim() || "Your page title",
        TITLE_FONT,
        LIMITS[device].title,
      ),
    [title, device],
  );

  const descriptionResult = useMemo(
    () =>
      truncateToWidth(
        description.trim() ||
          "Add a meta description to control the text that appears here in search results.",
        DESC_FONT,
        LIMITS[device].description,
      ),
    [description, device],
  );

  return (
    <div className="serp-tool">
      <div className="serp-fields">
        <div className="serp-field">
          <label htmlFor={`${fieldId}-title`}>
            Page title
            <span
              className={`serp-count ${countClass(title.length, 30, 60)}`}
            >
              {title.length} chars · {titleResult.width}px
            </span>
          </label>
          <input
            id={`${fieldId}-title`}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="The title tag for this page"
          />
        </div>

        <div className="serp-field">
          <label htmlFor={`${fieldId}-description`}>
            Meta description
            <span
              className={`serp-count ${countClass(
                description.length,
                70,
                160,
              )}`}
            >
              {description.length} chars · {descriptionResult.width}px
            </span>
          </label>
          <textarea
            id={`${fieldId}-description`}
            value={description}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="The meta description for this page"
          />
        </div>

        <div className="serp-field">
          <label htmlFor={`${fieldId}-url`}>Page URL</label>
          <input
            id={`${fieldId}-url`}
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/page"
          />
        </div>
      </div>

      <div className="serp-preview-panel">
        <div className="serp-device-toggle" role="group" aria-label="Preview device">
          <button
            type="button"
            className={device === "desktop" ? "active" : ""}
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={device === "mobile" ? "active" : ""}
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>

        <div className={`serp-result serp-result-${device}`}>
          <div className="serp-result-site">
            <span className="serp-favicon" aria-hidden="true">
              {host.charAt(0).toUpperCase()}
            </span>
            <span className="serp-result-url">
              <span className="serp-result-host">{host}</span>
              {crumbs.length > 0 && (
                <span className="serp-result-path">
                  {" › "}
                  {crumbs.join(" › ")}
                </span>
              )}
            </span>
          </div>

          <div className="serp-result-title">{titleResult.text}</div>

          <p className="serp-result-description">{descriptionResult.text}</p>
        </div>

        <ul className="serp-signals">
          <li className={titleResult.truncated ? "warning" : "good"}>
            {titleResult.truncated
              ? `Title is cut off on ${device} (about ${titleResult.width}px, limit ~${LIMITS[device].title}px)`
              : `Title fits on ${device}`}
          </li>
          <li className={descriptionResult.truncated ? "warning" : "good"}>
            {descriptionResult.truncated
              ? `Description is cut off on ${device} (about ${descriptionResult.width}px, limit ~${LIMITS[device].description}px)`
              : `Description fits on ${device}`}
          </li>
        </ul>

        <p className="serp-disclaimer">
          Approximate. Google renders results in its own font and frequently
          rewrites the title or description to match the specific search.
        </p>
      </div>
    </div>
  );
}

export default SerpPreviewTool;
