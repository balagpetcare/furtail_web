import { fetchApi, fetchEnvelope } from "../api-client";

// Canonical post type/category/privacy enums
export type PostType = "TEXT" | "IMAGE" | "VIDEO" | "REEL";
export type PostCategory = "GENERAL" | "FUNDRAISING";
export type PostPrivacy = "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
export type PetPostType =
  | "GENERAL"
  | "HEALTH_UPDATE"
  | "VACCINATION"
  | "LOST_PET"
  | "ADOPTION"
  | "SERVICE_REVIEW";

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
  media: Array<{
    id: number;
    url: string;
    type?: string;
    status?: string;
    hlsUrl?: string | null;
    posterUrl?: string | null;
    durationMs?: number | null;
    width?: number | null;
    height?: number | null;
  }>;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  /** Aggregate play/view count for video posts (surfaced by the backend). */
  viewCount?: number;
  isLikedByMe: boolean;
  isBookmarkedByMe?: boolean;
  /** Whether the viewer follows the post's author (surfaced by the
   * backend; drives the follow/unfollow action in the video viewer). */
  isFollowingAuthor?: boolean;

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

  // Post metadata fields (new in Enterprise Create Post)
  privacy?: string;
  postType?: string;
  backgroundStyle?: string;
  locationTag?: string;
  feelingId?: string;
  feelingLabel?: string;
  feelingEmoji?: string;
  activityId?: string;
  activityLabel?: string;
  activityEmoji?: string;
  taggedPets?: Array<{ id: number; name: string }>;
  contentTags?: Array<{ id: number; key: string; label: string }>;
  lostPetName?: string;
  lostPetLocation?: string;
  lostPetContactVisible?: boolean;
  songTitle?: string;
  songArtist?: string;
  songStartMs?: number;
  songDurationMs?: number;
}

export interface CreatePostInput {
  caption?: string | null;
  type?: PostType;
  category?: PostCategory;
  mediaIds?: number[];
  privacy?: PostPrivacy;
  postType?: PetPostType;
  backgroundStyle?: string; // Canonical Flutter background style IDs: none, orange_red, blue_purple, etc.
  lostPetName?: string | null;
  lostPetLocation?: string | null;
  lostPetContactVisible?: boolean;
  taggedPetIds?: number[];
  /** ContentTag primary key ids (not keys) — see PostContentTag in the
   * backend schema. */
  contentTagIds?: number[];
  songTitle?: string | null;
  songArtist?: string | null;
  songStartMs?: number | null;
  songDurationMs?: number | null;
  locationText?: string | null;
  feelingId?: string | null;
  feelingLabel?: string | null;
  feelingEmoji?: string | null;
  activityId?: string | null;
  activityLabel?: string | null;
  activityEmoji?: string | null;
  idempotencyKey?: string;
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
        status: m.media.status ?? undefined,
        hlsUrl: m.media.hlsUrl ?? undefined,
        posterUrl: m.media.posterUrl ?? undefined,
        durationMs: m.media.durationMs ?? undefined,
        width: m.media.width ?? undefined,
        height: m.media.height ?? undefined,
      };
    }
    return {
      id: m.id,
      url: m.url || "",
      type: m.type || undefined,
      status: m.status ?? undefined,
      hlsUrl: m.hlsUrl ?? undefined,
      posterUrl: m.posterUrl ?? undefined,
      durationMs: m.durationMs ?? undefined,
      width: m.width ?? undefined,
      height: m.height ?? undefined,
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

  /**
   * Phase 2/3: Dedicated videos endpoint (`GET /api/v1/videos/feed`) —
   * returns ONLY posts with at least one PLAYABLE/READY video media.
   * Uses cursor-based pagination. `fetchEnvelope` keeps the response
   * `meta` so the `nextCursor`/`hasMore` come back with the items.
   */
  getEligibleVideosFeed: async ({ cursor, limit = 20, sort }: { cursor?: string; limit?: number; sort?: string }) => {
    const envelope = await fetchEnvelope<{
      success: boolean;
      data?: unknown[];
      meta?: { nextCursor?: string | null; hasMore?: boolean; limit?: number };
    }>("/videos/feed", { params: { cursor, limit, sort } });
    return {
      data: (envelope?.data ?? []).map(normalizePost),
      nextCursor: envelope?.meta?.nextCursor ?? undefined,
      hasMore: envelope?.meta?.hasMore ?? false,
    };
  },

  /**
   * Phase 2: Single video post detail (`GET /api/v1/videos/:id`) —
   * verifies the post contains video media and is visible to the
   * caller. Returns the same `Post` shape as `getPost`.
   */
  getVideoPost: async (id: string | number) => {
    const raw = await fetchApi<any>(`/videos/${id}`);
    return normalizePost(raw);
  },

  /**
   * Phase 2: Engagement event ingestion (`POST /api/v1/videos/:id/events`).
   * Events are buffered server-side and flushed to the DB in batches —
   * the response is 202 Accepted, not 200 OK. The `sessionId` + `eventType`
   * pair is idempotent: duplicate submissions are silently dropped.
   */
  ingestVideoEngagementEvents: async (
    postId: string | number,
    sessionId: string,
    events: Array<{ eventType: string; positionMs?: number }>,
  ) => {
    return fetchApi<any>(`/videos/${postId}/events`, {
      method: "POST",
      body: { sessionId, events },
    });
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

  createPost: async (data: CreatePostInput) => {
    const { idempotencyKey, ...body } = data;
    return fetchApi<any>("/posts", {
      method: "POST",
      body,
      // Ownership of this key belongs to the composer (create-post-modal),
      // not fetchApi's generic per-call fallback — the same logical
      // submission (initial attempt, retry) must reuse the same key, which
      // fetchApi's own crypto.randomUUID() default can't guarantee since it
      // mints a fresh one on every invocation.
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }).then(normalizePost);
  },

  editPost: async (id: string, data: { caption?: string }) => {
    return fetchApi<any>(`/posts/${id}`, {
      method: "PATCH",
      body: data,
    }).then(normalizePost);
  },

  /**
   * Re-enqueues an already-uploaded video for (re)processing without
   * re-uploading the original. Used when a video's processing FAILED (recover
   * it in place) or a PLAYABLE video is missing higher-quality renditions.
   * Returns the media id and its (now PROCESSING) status.
   */
  retryMediaProcessing: async (mediaId: number | string) => {
    return fetchApi<{ id: number; status: string }>(`/media/${mediaId}/process`, {
      method: "POST",
    });
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
    return fetchApi<{ totalReactionCount: number; reactionSummary: Record<string, number>; viewerReaction: string | null; isLikedByMe: boolean; likeCount: number; commentCount: number }>(`/posts/${id}/like`, { method: "POST", body: { reaction } });
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
