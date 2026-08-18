import { fetchApi } from "../api-client";

export const storiesKeys = {
  all: ["stories"] as const,
  feed: () => [...storiesKeys.all, "feed"] as const,
};

/** Matches the payload shape `POST /api/v1/stories` and `GET /api/v1/stories/feed` both return per-item (social.routes.ts). */
export interface Story {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  mediaType: "image" | "video" | string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  isViewedByMe: boolean;
  isOwnStory: boolean;
}

export interface StoryTray {
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  isOwnStory: boolean;
  /** True only if every story in this tray has been viewed — drives the FB/IG "seen" ring style. */
  allViewed: boolean;
  stories: Story[];
}

/**
 * `/api/v1/stories/feed` returns a flat, most-recent-first list of
 * unexpired stories (self included, blocked users excluded) — grouping by
 * author into trays is a client-side concern the backend doesn't do.
 * Preserves the backend's per-story recency order within and across trays
 * (first story seen for a user decides that tray's position).
 */
export function groupStoriesByAuthor(stories: Story[]): StoryTray[] {
  const order: string[] = [];
  const byUser = new Map<string, StoryTray>();

  for (const story of stories) {
    let tray = byUser.get(story.userId);
    if (!tray) {
      tray = {
        userId: story.userId,
        userName: story.userName,
        userAvatarUrl: story.userAvatarUrl,
        isOwnStory: story.isOwnStory,
        allViewed: true,
        stories: [],
      };
      byUser.set(story.userId, tray);
      order.push(story.userId);
    }
    tray.stories.push(story);
    if (!story.isViewedByMe) tray.allViewed = false;
  }

  return order.map((userId) => byUser.get(userId)!);
}

export const storiesApi = {
  getFeed: async () => {
    const raw = await fetchApi<{ stories?: Story[]; data?: Story[] }>("/stories/feed");
    return raw.stories ?? raw.data ?? [];
  },

  createStory: async (file: File, caption?: string) => {
    const formData = new FormData();
    formData.append("media", file);
    if (caption) formData.append("caption", caption);
    const raw = await fetchApi<{ story?: Story; data?: Story }>("/stories", {
      method: "POST",
      body: formData,
    });
    return (raw.story ?? raw.data)!;
  },

  viewStory: async (id: number | string) => {
    return fetchApi<{ success: boolean }>(`/stories/${id}/view`, { method: "POST" });
  },

  deleteStory: async (id: number | string) => {
    return fetchApi<{ success: boolean }>(`/stories/${id}`, { method: "DELETE" });
  },
};
