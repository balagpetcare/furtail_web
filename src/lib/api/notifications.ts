import { fetchApi } from "../api-client";

export const notificationsKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unreadCount"] as const,
};

/** Matches `toPayload()` in furtail_app_api's notification-service.ts. */
export type NotificationType =
  | "FRIEND_REQUEST_RECEIVED"
  | "FRIEND_REQUEST_ACCEPTED"
  | "USER_FOLLOWED"
  | "PROFILE_LIKED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "POST_REPLIED"
  | "COMMENT_LIKED"
  | "PET_FOLLOWED"
  | "PET_LIKED"
  | "ANNOUNCEMENT"
  | "EMERGENCY"
  | "GENERAL";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  actorId: number | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  relatedUserId: number | null;
  relatedPostId: number | null;
  relatedCommentId: number | null;
  relatedPetId: number | null;
  relatedFriendRequestId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

/**
 * Builds an internal Furtail Web route from a notification's structured
 * `related*` ids — deliberately does not trust/navigate the backend's raw
 * `actionUrl` string, so a compromised or stale notification payload can
 * never redirect a click anywhere outside this app's own route table.
 */
export function notificationTargetHref(n: NotificationItem): string | null {
  switch (n.type) {
    case "FRIEND_REQUEST_RECEIVED":
    case "FRIEND_REQUEST_ACCEPTED":
    case "USER_FOLLOWED":
    case "PROFILE_LIKED":
      return n.actorId ? `/profile/${n.actorId}` : null;
    case "POST_LIKED":
    case "POST_COMMENTED":
    case "POST_REPLIED":
    case "COMMENT_LIKED":
      return n.relatedPostId ? `/post/${n.relatedPostId}` : null;
    case "PET_FOLLOWED":
    case "PET_LIKED":
      return n.relatedPetId ? `/pet/${n.relatedPetId}` : null;
    default:
      return null;
  }
}

export const notificationsApi = {
  getNotifications: async (cursor?: string, limit: number = 20) => {
    return fetchApi<{ items: NotificationItem[]; nextCursor?: string }>("/notifications", {
      params: { cursor, limit },
    });
  },

  getUnreadCount: async () => {
    return fetchApi<{ count: number }>("/notifications/unread-count");
  },

  markAsRead: async (id: string | number) => {
    return fetchApi(`/notifications/${id}/read`, { method: "POST" });
  },

  markAllAsRead: async () => {
    return fetchApi(`/notifications/read-all`, { method: "POST" });
  },
};
