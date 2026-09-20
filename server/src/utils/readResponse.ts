/** Default wall-clock budget for consuming a response body (ms). */
const DEFAULT_READ_TIMEOUT_MS = 20_000;

/**
 * Reads a response body into a string, enforcing both a hard byte cap and an
 * overall time budget. A server that sends headers quickly and then drip-feeds
 * the body (staying under the byte cap forever) is cut off at `timeoutMs` and
 * treated as a failure (`null`), rather than pinning the request indefinitely.
 */
export async function readResponseWithLimit(
  response: Response,
  maxBytes: number,
  timeoutMs: number = DEFAULT_READ_TIMEOUT_MS,
): Promise<string | null> {
  const contentLength = response.headers.get("content-length");

  if (contentLength) {
    const declaredSize = Number(contentLength);

    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      return null;
    }
  }

  if (!response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  let totalBytes = 0;
  let aborted = false;

  const timer = setTimeout(() => {
    aborted = true;
    void reader.cancel().catch(() => {});
  }, timeoutMs);

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        aborted = true;
        await reader.cancel().catch(() => {});
        break;
      }

      chunks.push(value);
    }
  } catch {
    aborted = true;
  } finally {
    clearTimeout(timer);
    try {
      reader.releaseLock();
    } catch {
      /* already released by cancel() */
    }
  }

  if (aborted) {
    return null;
  }

  const combined = new Uint8Array(totalBytes);

  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}
