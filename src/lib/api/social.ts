import { fetchApi } from "../api-client";
import { normalizeAuthor } from "./posts";

export const socialKeys = {
  all: ["social"] as const,
  status: (userId: string) => [...socialKeys.all, "status", userId] as const,
  counts: (userId: string) => [...socialKeys.all, "counts", userId] as const,
  friends: () => [...socialKeys.all, "friends"] as const,
  followers: () => [...socialKeys.all, "followers"] as const,
  following: () => [...socialKeys.all, "following"] as const,
  incomingRequests: () => [...socialKeys.all, "requests", "incoming"] as const,
  outgoingRequests: () => [...socialKeys.all, "requests", "outgoing"] as const,
  suggestions: () => [...socialKeys.all, "suggestions"] as const,
};

/** Matches `RelationshipState` in furtail_app_api's relationships.service.ts exactly. */
export interface SocialStatus {
  isFollowing: boolean;
  followsMe: boolean;
  isFriend: boolean;
  friendRequestState: 'NONE' | 'OUTGOING_PENDING' | 'INCOMING_PENDING';
  friendRequestId: number | string | null;
  isBlockedByMe: boolean;
  isBlockedByTarget: boolean;
  isBlocked: boolean;
  interactionAllowed: boolean;
}

export interface SocialCounts {
  friends: number;
  followers: number;
  following: number;
}

export const socialApi = {
  getStatus: async (userId: string) => {
    return fetchApi<SocialStatus>(`/social/status/${userId}`);
  },

  getCounts: async (userId: string) => {
    return fetchApi<SocialCounts>(`/social/counts/${userId}`);
  },

  followUser: async (userId: string) => {
    return fetchApi(`/social/follow/${userId}`, { method: "POST" });
  },

  unfollowUser: async (userId: string) => {
    return fetchApi(`/social/follow/${userId}`, { method: "DELETE" });
  },

  sendFriendRequest: async (userId: string) => {
    return fetchApi<{ requestId: number | string }>(`/social/friend-request/${userId}`, { method: "POST" });
  },

  acceptFriendRequest: async (requestId: string | number) => {
    return fetchApi(`/social/friend-request/${requestId}/accept`, { method: "POST" });
  },

  rejectFriendRequest: async (requestId: string | number) => {
    return fetchApi(`/social/friend-request/${requestId}/reject`, { method: "POST" });
  },

  cancelFriendRequest: async (requestId: string | number) => {
    return fetchApi(`/social/friend-request/${requestId}/cancel`, { method: "DELETE" });
  },

  unfriend: async (userId: string) => {
    return fetchApi(`/social/friends/${userId}`, { method: "DELETE" });
  },

  blockUser: async (userId: string) => {
    return fetchApi(`/social/block/${userId}`, { method: "POST" });
  },

  unblockUser: async (userId: string) => {
    return fetchApi(`/social/block/${userId}`, { method: "DELETE" });
  },

  getBlockedUsers: async () => {
    return fetchApi<{ items: Array<{ id?: number; userId?: number; displayName?: string; username?: string; avatarUrl?: string }> }>(
      "/social/blocked",
      { params: { limit: 100 } },
    );
  },

  getSuggestions: async () => {
    let raw;
    try {
      raw = await fetchApi<{
        items: Array<Record<string, unknown>>;
        nextCursor?: string | null;
        hasMore: boolean;
      }>(`/social/discovery/suggestions`);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      throw e;
    }

    const items = raw?.items ?? [];
    const seen = new Set<string>();
    const uniqueItems: SuggestedUser[] = [];

    for (const item of items) {
      const normalized = normalizeAuthor(item);
      if (normalized.userId && !seen.has(normalized.userId)) {
        seen.add(normalized.userId);
        // `normalizeAuthor` only extracts the display shape; the real
        // discovery-service response (see people-discovery.service.ts's
        // `toItem`) also carries mutualFriendsCount/isFriend/etc. that
        // `RelationshipButton` and the mutual-count line both need, so
        // those are preserved alongside the normalized identity fields
        // instead of being dropped.
        uniqueItems.push({
          ...normalized,
          mutualFriendsCount: Number(item.mutualFriendsCount) || 0,
          mutualFollowsCount: Number(item.mutualFollowsCount) || 0,
        });
      }
    }

    return {
      ...raw,
      items: uniqueItems,
    };
  },

  dismissSuggestion: async (userId: string) => {
    return fetchApi(`/social/discovery/suggestions/${userId}/dismiss`, { method: "POST" });
  },
};

export interface SuggestedUser {
  id: number;
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  mutualFriendsCount: number;
  mutualFollowsCount: number;
}
