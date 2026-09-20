const API_URL = import.meta.env.VITE_API_URL ?? "";

/** Error thrown by `apiFetch` for any non-2xx response. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Small wrapper around `fetch` for our JSON API. Always sends the session
 * cookie (`credentials: "include"`) so authenticated requests work in
 * development, where the API is on a different port.
 *
 * `Content-Type: application/json` is only set when there is a request body —
 * sending it on a bodyless request (e.g. logout) makes Fastify reject it.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Something went wrong. Please try again.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}
