import { handleApiResponse } from "./api-error";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Base fetch client that points to our Next.js /api/proxy which safely
 * attaches the HttpOnly Bearer token and forwards to the canonical Furtail API.
 */
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  // Use absolute path to the local Next.js proxy
  let url = `/api/proxy${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Payment-sensitive/create mutations (e.g. donation checkout) require an
  // Idempotency-Key so a retried request never double-charges/double-creates.
  if (options.method === "POST" && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }

  let response = await fetch(url, {
    ...options,
    headers,
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      // Retry the original request
      response = await fetch(url, {
        ...options,
        headers,
        body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
      });
    } else {
      // Permanent failure, let the app redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return handleApiResponse<T>(response);
}
