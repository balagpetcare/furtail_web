import type { InfiniteData } from "@tanstack/react-query";

export interface RawComment {
  id: number | string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
  user?: unknown;
  likeCount?: number;
  isLikedByMe?: boolean;
  parentId?: number | string | null;
  isEdited?: boolean;
  /** Real field from the backend (see `serializeComment`) — but there is no
   * GET endpoint to list a comment's existing replies, only `POST .../replies`
   * to create one. So this count can be genuinely nonzero while the app has
   * no way to fetch what those replies actually say. */
  replyCount?: number;
}

export type CommentsPage = { data?: RawComment[]; items?: RawComment[] } | RawComment[];
export type CommentsCache = InfiniteData<CommentsPage, string | undefined>;

export function getPageItems(page: CommentsPage): RawComment[] {
  if (Array.isArray(page)) return page;
  return page.data ?? page.items ?? [];
}

export function setPageItems(page: CommentsPage, items: RawComment[]): CommentsPage {
  if (Array.isArray(page)) return items;
  if (page.data) return { ...page, data: items };
  return { ...page, items };
}

/**
 * De-dupes by id, keeping the first occurrence — the one safety net every
 * comments-cache write goes through, so an optimistic entry and its real
 * server counterpart (or, if this ever grows an SSE feed, a push event and
 * a refetch) can never both end up rendered.
 */
export function dedupeById(items: RawComment[]): RawComment[] {
  const seen = new Set<string>();
  const result: RawComment[] = [];
  for (const item of items) {
    const id = String(item.id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

export function updateFirstPage(old: CommentsCache | undefined, updater: (items: RawComment[]) => RawComment[]): CommentsCache | undefined {
  if (!old?.pages?.length) return old;
  const pages = [...old.pages];
  pages[0] = setPageItems(pages[0], dedupeById(updater(getPageItems(pages[0]))));
  return { ...old, pages };
}

export function updateAllPages(old: CommentsCache | undefined, updater: (items: RawComment[]) => RawComment[]): CommentsCache | undefined {
  if (!old?.pages) return old;
  return { ...old, pages: old.pages.map((page) => setPageItems(page, dedupeById(updater(getPageItems(page))))) };
}

export function extractComment(result: unknown): RawComment {
  if (result && typeof result === "object" && "item" in result) {
    return (result as { item: RawComment }).item;
  }
  return result as RawComment;
}
