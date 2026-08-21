export async function readResponseWithLimit(
  response: Response,
  maxBytes: number,
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

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);

  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}
