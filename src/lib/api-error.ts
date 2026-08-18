export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The Furtail API always replies with a typed envelope —
 * `{ success: true, data, meta }` or `{ success: false, error: {code,
 * message, details}, meta }` (see `core/http/api-response.ts`'s
 * `sendSuccess`/`sendError`). Every domain API client in this codebase is
 * written assuming `fetchApi` already returns the unwrapped `data` payload
 * (e.g. `postsApi.getPost` typed as `{item}}`, `messagesApi.getMessages`
 * typed as `{items}` — both only true of the envelope's `.data`, not the
 * envelope itself), so unwrapping happens once, here, rather than in every
 * call site.
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    let errorCode;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.error?.message || errorBody?.message || errorMessage;
      errorCode = errorBody?.error?.code ?? errorBody?.code;
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new ApiError(errorMessage, response.status, errorCode);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const body = await response.json();
  if (body && typeof body === "object" && body.success === true && "data" in body) {
    return body.data as T;
  }
  return body as T;
}
