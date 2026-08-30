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

/**
 * Generates a local thumbnail URL (data URI) from a video file.
 */
export async function generateLocalVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser environment required"));
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      // Seek to 0.5 seconds
      video.currentTime = Math.min(0.5, video.duration);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          resolve(dataUrl);
        } else {
          reject(new Error("Failed to get 2d context"));
        }
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video metadata"));
    };
  });
}
