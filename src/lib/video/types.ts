import { getMediaUrl } from "@/lib/media";

/**
 * Canonical video processing status (mirrors the backend's
 * `toPublicMediaStatus` — see social-store.ts). `UPLOADED` is never
 * surfaced to clients (mapped to `PROCESSING`); `PENDING_DELETION`/
 * `DELETED` collapse to `FAILED`.
 */
export type VideoStatus = "PROCESSING" | "PLAYABLE" | "READY" | "FAILED";

/**
 * Frontend VideoMedia contract — a video-focused, flat representation
 * of a media attachment that any video surface (feed card, videos
 * browse, single-post/video detail, reels) can consume without
 * re-implementing status checks or URL resolution.
 *
 * All URLs are **absolute** (resolved through `getMediaUrl`) so they
 * can be handed directly to `<video>`, hls.js, or `<img>` without
 * further normalization.
 */
export interface VideoMedia {
  /** Prisma Media.id — used for retry-processing calls. */
  mediaId: number;
  /** Post.publicId or Post.id — used for routing/share links. */
  postId?: string | number;
  /** Absolute URL for the raw source file (MP4/MOV/WebM). Always
   * available for uploaded media (set at upload time). Serves as the
   * playback fallback when HLS is absent or unsupported. */
  playbackUrl: string;
  /** Absolute HLS master-playlist URL. Absent/null until the video
   * worker flips the media to PLAYABLE and writes `master.m3u8`. */
  hlsUrl?: string;
  /** Absolute poster-frame URL (extracted early by the worker). */
  posterUrl?: string;
  /** Duration in milliseconds (populated by the worker via ffprobe). */
  durationMs?: number;
  /** Native pixel width of the source video. */
  width?: number;
  /** Native pixel height. */
  height?: number;
  /** Processing status — drives placeholder vs player rendering. */
  status: VideoStatus;
  /** Free-form error message from the worker (FAILED status only). */
  processingError?: string;
  /** MIME type of the source file (e.g. `video/mp4`). */
  mimeType?: string;
  /** Absolute WebVTT caption file URL. When present the player exposes a
   * captions (CC) control; absent for media that carries no captions. */
  captionUrl?: string;
}

/**
 * Returns `true` for statuses that should render a real player
 * (not a processing/failed placeholder).
 */
export function isPlayableVideo(status?: string): status is VideoStatus {
  return status === "PLAYABLE" || status === "READY";
}

/**
 * Normalizes a feed/post media item (the shape produced by
 * `normalizePost` in `src/lib/api/posts.ts`) into a `VideoMedia`.
 *
 * Returns `null` when the media item has no resolvable playback URL
 * (the caller should render an "unavailable" placeholder).
 *
 * The input `FeedMediaItem` already carries `hlsUrl`, `posterUrl`,
 * and `status` as flat fields (extracted from the backend's nested
 * `{ id, media: { url, hlsUrl, status, posterUrl } }` shape by
 * `normalizePost`). This function only resolves the relative paths
 * to absolute URLs and coerces types.
 */
export function toVideoMedia(
  item: {
    id: number | string;
    url: string;
    type?: string;
    status?: string;
    hlsUrl?: string | null;
    posterUrl?: string | null;
    durationMs?: number | null;
    width?: number | null;
    height?: number | null;
  },
  postId?: string | number,
): VideoMedia | null {
  const playbackUrl = getMediaUrl(item.url);
  if (!playbackUrl) return null;

  const status = (item.status ?? "PROCESSING") as VideoStatus;

  return {
    mediaId: Number(item.id),
    postId,
    playbackUrl,
    hlsUrl: getMediaUrl(item.hlsUrl) ?? undefined,
    posterUrl: getMediaUrl(item.posterUrl) ?? undefined,
    durationMs: item.durationMs ?? undefined,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    status,
    mimeType: item.type,
  };
}
