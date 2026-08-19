import { fetchApi } from "../api-client";

export const messagesKeys = {
  all: ["messages"] as const,
  conversations: () => [...messagesKeys.all, "conversations"] as const,
  conversation: (id: string | number) => [...messagesKeys.conversations(), id] as const,
  messages: (id: string | number) => [...messagesKeys.conversation(id), "history"] as const,
  unread: () => [...messagesKeys.all, "unread"] as const,
};

export interface ConversationListItem {
  conversationId: number;
  otherUserId: number;
  otherUser: {
    id: number;
    publicId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: number;
    senderId: number;
    body: string;
    createdAt: string;
    editedAt: string | null;
    deletedAt: string | null;
  } | null;
  lastMessageAt: string | null;
  canSend: boolean;
  unreadCount: number;
  otherUserOnline?: boolean;
}

export const messagesApi = {
  startConversation: async (userId: string | number) => {
    return fetchApi<{ conversationId: number, otherUserId: number }>("/messages/conversations", {
      method: "POST",
      body: { userId },
    });
  },

  getConversations: async (cursor?: string, limit: number = 20) => {
    return fetchApi<{ items: ConversationListItem[]; nextCursor?: string }>("/messages/conversations", {
      params: { cursor, limit },
    });
  },

  getMessages: async (conversationId: string | number, cursor?: string, limit: number = 50) => {
    return fetchApi<{ items: any[]; nextCursor?: string }>(`/messages/conversations/${conversationId}/messages`, {
      params: { cursor, limit },
    });
  },

  sendMessage: async (conversationId: string | number, text: string, clientMessageId?: string) => {
    return fetchApi<any>(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { body: text, clientMessageId },
    });
  },

  editMessage: async (conversationId: string | number, messageId: string | number, text: string) => {
    return fetchApi<any>(`/messages/conversations/${conversationId}/messages/${messageId}`, {
      method: "PATCH",
      body: { body: text },
    });
  },

  deleteMessage: async (conversationId: string | number, messageId: string | number) => {
    return fetchApi<any>(`/messages/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  markAsRead: async (conversationId: string | number, upToMessageId?: number) => {
    return fetchApi<any>(`/messages/conversations/${conversationId}/read`, {
      method: "POST",
      body: upToMessageId ? { upToMessageId } : {},
    });
  },

  getUnreadSummary: async () => {
    try {
      return await fetchApi<{ totalUnreadConversations: number, totalUnreadMessages: number }>("/messages/unread");
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) {
        return { totalUnreadConversations: 0, totalUnreadMessages: 0 };
      }
      throw e;
    }
  }
};
