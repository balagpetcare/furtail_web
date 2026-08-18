import { fetchApi } from "../api-client";

export const postsKeys = {
  all: ["posts"] as const,
  feed: (type: string) => [...postsKeys.all, "feed", type] as const,
  detail: (id: string) => [...postsKeys.all, id] as const,
  comments: (id: string) => [...postsKeys.detail(id), "comments"] as const,
  videos: (params?: Record<string, unknown>) => [...postsKeys.all, "videos", params ?? {}] as const,
};

export interface Post {
  id: number;
  /** Opaque, globally-unique public id (UUIDv7-shaped) — prefer this over
   * `id` for any URL/share link. Absent only for posts served by a build
   * that predates this field (backward-compat: callers fall back to `id`). */
  publicId?: string;
  type: string;
  category?: string;
  caption: string | null;
  createdAt: string;
  author: {
    id: number;
    userId: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
  };
  media: Array<{ id: number; url: string; type?: string }>;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  isLikedByMe: boolean;
  isBookmarkedByMe?: boolean;
  
  // New Reaction System fields
  viewerReaction?: string | null;
  reactionSummary?: Record<string, number>;
  totalReactionCount?: number;
  topReactors?: Array<{
    id: string;
    userId: string;
    displayName: string;
    reaction: string;
  }>;
  
  /** Server-ranked (viewer > friend > author > engagement > recency), up
   * to 2 real comments for the Home Feed preview — see CommentPreview.
   * Optional only for backward-compat with a build that predates this
   * field; the current API always includes it (possibly empty). */
  commentPreviews?: Array<{
    id: number | string;
    text: string;
    createdAt: string;
    user?: unknown;
    likeCount?: number;
    replyCount?: number;
  }>;
}
/**
 * Every function below normalizes to `{ data: Post[]; nextCursor?: string
 * }` (list) or a bare `Post` (detail) regardless of what shape the specific
 * backend route actually returns raw (`/posts/feed` and
 * `/posts/user/:userId` return a bare array; `/posts/bookmarked` returns
 * `{items, nextCursor, hasMore}`) — components consume one stable shape
 * instead of special-casing each endpoint.
 */
export function normalizeAuthor(rawAuthor: any) {
  if (!rawAuthor) {
    return { id: 0, userId: "0", displayName: "Furtail User" };
  }
  
  const profile = rawAuthor.profile || {};
  const rawDisplayName = profile.displayName || rawAuthor.displayName || profile.name || rawAuthor.name || profile.username || rawAuthor.username;
  const safeDisplayName = (typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0) 
    ? rawDisplayName.trim() 
    : "Furtail User";
    
  const avatarUrl = profile.avatarMedia?.thumbnailUrl || profile.avatarMedia?.url || profile.avatarUrl || rawAuthor.avatarUrl || undefined;
  const rawId = rawAuthor.id || rawAuthor.userId || 0;

  return {
    id: Number(rawId),
    userId: String(rawId),
    displayName: safeDisplayName,
    username: profile.username || rawAuthor.username || undefined,
    avatarUrl: avatarUrl || undefined,
  };
}

export function normalizePost(raw: any): Post {
  if (!raw) return raw;

  const normalizedMedia = (raw.media || []).map((m: any) => {
    if (m && m.media) {
      return {
        id: m.id,
        url: m.media.url || "",
        type: m.media.mimetype || m.media.type || undefined,
      };
    }
    return {
      id: m.id,
      url: m.url || "",
      type: m.type || undefined,
    };
  });

  return {
    ...raw,
    author: normalizeAuthor(raw.author),
    media: normalizedMedia,
  };
}

function normalizeList(raw: unknown): { data: Post[]; nextCursor?: string } {
  if (Array.isArray(raw)) return { data: raw.map(normalizePost) };
  const obj = (raw ?? {}) as { items?: any[]; data?: any[]; nextCursor?: string | null };
  return {
    data: (obj.items ?? obj.data ?? []).map(normalizePost),
    nextCursor: obj.nextCursor ?? undefined,
  };
}

export const postsApi = {
  getFeed: async ({ cursor, limit = 20 }: { cursor?: string; limit?: number }) => {
    const raw = await fetchApi<unknown>("/posts/feed", { params: { cursor, limit } });
    return normalizeList(raw);
  },

  /** Real recency-decayed engagement ranking — see `listTrendingPosts` in social-store.ts. */
  getTrending: async (limit = 20) => {
    const raw = await fetchApi<unknown>("/posts/trending", { params: { limit } });
    return normalizeList(raw);
  },

  /**
   * Real, dedicated backend endpoint (`GET /api/v1/posts/videos`, see
   * `listVideosFeed` in social-store.ts) for VIDEO/REEL-typed posts — the
   * data source for a Reels rail. It's paginated by page number, not
   * cursor, and returns a bare array with `meta.page`/`meta.hasMore`
   * rather than the `{data, nextCursor}` shape other list endpoints use,
   * so it's normalized separately instead of through `normalizeList`.
   */
  getVideosFeed: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: string;
    duration?: string;
    followingOnly?: boolean;
  }) => {
    const raw = await fetchApi<unknown[]>("/posts/videos", { params });
    return (raw ?? []).map(normalizePost);
  },

  getUserPosts: async (userId: string | number, cursor?: string, limit = 50) => {
    const raw = await fetchApi<unknown>(`/posts/user/${userId}`, {
      params: { cursor, limit },
    });
    return normalizeList(raw);
  },

  getBookmarked: async (cursor?: string, limit = 20) => {
    const raw = await fetchApi<unknown>("/posts/bookmarked", { params: { cursor, limit } });
    return normalizeList(raw);
  },

  getPost: async (id: string) => {
    return fetchApi<any>(`/posts/${id}`).then(normalizePost);
  },

  createPost: async (data: { caption: string; mediaIds?: number[] }) => {
    return fetchApi<any>("/posts", {
      method: "POST",
      body: data,
    }).then(normalizePost);
  },

  editPost: async (id: string, data: { caption?: string }) => {
    return fetchApi<any>(`/posts/${id}`, {
      method: "PATCH",
      body: data,
    }).then(normalizePost);
  },

  deletePost: async (id: string) => {
    return fetchApi(`/posts/${id}`, { method: "DELETE" });
  },

  likePost: async (id: string) => {
    return fetchApi<{ likeCount: number; commentCount: number; isLikedByMe: boolean }>(`/posts/${id}/like`, { method: "POST" });
  },
  unlikePost: async (id: string) => {
    return fetchApi<{ likeCount: number; commentCount: number; isLikedByMe: boolean }>(`/posts/${id}/like`, { method: "DELETE" });
  },
  reactPost: async (id: string, reaction: string) => {
    // In the future this will hit /posts/:id/reaction, but for now we fallback to the backward-compatible like endpoint if reaction is LIKE
    // Once the backend supports the new endpoint, this should be updated to hit /posts/${id}/reaction with { method: "POST", body: { reaction } }
    return fetchApi<{ totalReactionCount: number; reactionSummary: Record<string, number>; viewerReaction: string | null; isLikedByMe: boolean; likeCount: number; commentCount: number }>(`/posts/${id}/like`, { method: "POST" });
  },
  getPostReactors: async (id: string, reactionType?: string, limit = 50, cursor?: string) => {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7400/api"}/posts/${id}/reactors`);
    if (reactionType && reactionType !== 'ALL') url.searchParams.set('reaction', reactionType);
    url.searchParams.set('limit', limit.toString());
    if (cursor) url.searchParams.set('cursor', cursor);
    
    // We expect { items: Reactor[], nextCursor?: string }
    return fetchApi<{ items: any[]; nextCursor?: string }>(url.pathname + url.search, { method: "GET" });
  },

  bookmarkPost: async (id: string) => {
    return fetchApi(`/posts/${id}/bookmark`, { method: "POST" });
  },

  unbookmarkPost: async (id: string) => {
    return fetchApi(`/posts/${id}/bookmark`, { method: "DELETE" });
  },

  sharePost: async (id: string) => {
    return fetchApi(`/posts/${id}/share`, { method: "POST" });
  },

  getComments: async (postId: string, cursor?: string, limit: number = 20, signal?: AbortSignal) => {
    return fetchApi<{ data: any; items?: any[]; nextCursor?: string }>(`/posts/${postId}/comments`, {
      params: { cursor, limit },
      signal,
    });
  },

  getReplies: async (postId: string, commentId: string, cursor?: string, limit: number = 20, signal?: AbortSignal) => {
    return fetchApi<{ items: any[]; nextCursor?: string | null; hasMore?: boolean }>(
      `/posts/${postId}/comments/${commentId}/replies`,
      { params: { cursor, limit }, signal },
    );
  },

  addComment: async (postId: string, text: string) => {
    return fetchApi<{ item: any }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: { text },
    });
  },

  editComment: async (postId: string, commentId: string, text: string) => {
    return fetchApi<{ item: any }>(`/posts/${postId}/comments/${commentId}`, {
      method: "PATCH",
      body: { text },
    });
  },

  deleteComment: async (postId: string, commentId: string) => {
    return fetchApi(`/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  likeComment: async (postId: string, commentId: string) => {
    return fetchApi(`/posts/${postId}/comments/${commentId}/like`, {
      method: "POST",
    });
  },

  unlikeComment: async (postId: string, commentId: string) => {
    return fetchApi(`/posts/${postId}/comments/${commentId}/like`, {
      method: "DELETE",
    });
  },

  replyComment: async (postId: string, commentId: string, text: string) => {
    return fetchApi<{ item: any }>(`/posts/${postId}/comments/${commentId}/replies`, {
      method: "POST",
      body: { text },
    });
  },
};
