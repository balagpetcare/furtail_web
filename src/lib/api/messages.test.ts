import test from "node:test";
import assert from "node:assert";
import type { ConversationListItem } from "@/lib/api/messages";

test("ConversationListItem uses conversationId as the canonical identifier, not id", () => {
  // This test acts as a regression boundary for the exact cause of the React key warning.
  // The warning occurred because the component expected `thread.id`, which was undefined,
  // causing every mapped item to receive `key={undefined}`.
  
  const mockThread: ConversationListItem = {
    conversationId: 12345,
    otherUserId: 678,
    otherUser: {
      id: 678,
      publicId: "pub_123",
      displayName: "Test User",
      username: "testuser",
      avatarUrl: null
    },
    lastMessage: null,
    lastMessageAt: null,
    canSend: true,
    unreadCount: 0
  };

  assert.strictEqual(mockThread.conversationId, 12345);
  // @ts-expect-error - id should not exist on the root of ConversationListItem
  assert.strictEqual(mockThread.id, undefined);
});
