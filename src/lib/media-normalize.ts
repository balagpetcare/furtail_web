import type { FeedMediaItem } from "@/components/feed/media-grid";

/**
 * The ONE canonical place that turns a raw backend media-list entry into
 * the shape every feed surface renders (`{id, url, type}`). Written after
 * a real forensic bug: three call sites each guessed the mimetype field's
 * casing independently and two of them guessed wrong, because the
 * backend is genuinely inconsistent across endpoints (confirmed against
 * live responses, not assumed):
 *
 *   - posts (`/posts/feed`, `/posts/:id`, `/posts/videos`):
 *     `{ id, media: { url, mimetype } }` — nested, lowercase `mimetype`.
 *   - adoption (`/adoption/feed`, `/adoption/:id`):
 *     `{ id, media: { url, mimeType } }` — nested, camelCase `mimeType`.
 *   - fundraising (`/fundraising/feed`, `/fundraising/campaigns/:id`):
 *     `{ id, url, mimetype }` — flat, lowercase `mimetype`.
 *
 * Rather than have each consumer hardcode its endpoint's casing (which is
 * exactly how the bug happened — a fundraising card guessing `mimeType`
 * because that's what adoption uses), this checks every real variant that
 * has been observed on the wire, in a fixed precedence order, once.
 */
export function normalizeMediaList(raw: unknown): FeedMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeMediaItem(item))
    .filter((item): item is FeedMediaItem => item !== null);
}

export function normalizeMediaItem(raw: unknown): FeedMediaItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const nested = (item.media && typeof item.media === "object" ? item.media : {}) as Record<string, unknown>;

  const url = firstString(nested.url, item.url);
  if (!url) return null;

  const type = firstString(
    nested.mimetype,
    nested.mimeType,
    item.mimetype,
    item.mimeType,
    nested.type,
    item.type
  );

  const id = (item.id as number | string | undefined) ?? (nested.id as number | string | undefined);

  return { id: id ?? url, url, type };
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
