import { env } from "./env";

/**
 * Resolves media paths from the Furtail API to full public URLs.
 */
export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path || path === "undefined" || path === "null") return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("blob:")) return path;  // Local preview URLs must pass through unchanged
  if (path.startsWith("data:")) return path;  // Data URIs must pass through unchanged

  // If the API returns a relative path like "/uploads/avatar.jpg",
  // resolve it against the base URL (stripping the /api/v1 suffix if it's stored there).
  const baseUrl = env.NEXT_PUBLIC_FURTAIL_API_URL.replace(/\/api\/v1\/?$/, "");

  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
