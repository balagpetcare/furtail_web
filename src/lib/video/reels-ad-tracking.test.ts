import { test, describe } from "node:test";
import * as assert from "node:assert";
import {
  isImpressionQualified,
  generateEventId,
  type ReelsAdEvent,
} from "./reels-ad-tracking";

describe("Reels Ad Tracking", () => {
  describe("isImpressionQualified", () => {
    test("returns false if view duration < threshold", () => {
      assert.strictEqual(isImpressionQualified(500, 1000), false);
      assert.strictEqual(isImpressionQualified(999, 1000), false);
    });

    test("returns true if view duration >= threshold", () => {
      assert.strictEqual(isImpressionQualified(1000, 1000), true);
      assert.strictEqual(isImpressionQualified(1001, 1000), true);
      assert.strictEqual(isImpressionQualified(5000, 1000), true);
    });

    test("handles custom thresholds", () => {
      const threshold500ms = 500;
      assert.strictEqual(isImpressionQualified(499, threshold500ms), false);
      assert.strictEqual(isImpressionQualified(500, threshold500ms), true);
    });

    test("fast swipe (300ms) doesn't qualify with 1s threshold", () => {
      assert.strictEqual(isImpressionQualified(300, 1000), false);
    });

    test("normal view (2s) qualifies with 1s threshold", () => {
      assert.strictEqual(isImpressionQualified(2000, 1000), true);
    });
  });

  describe("generateEventId", () => {
    test("generates stable event IDs", () => {
      const id1 = generateEventId("delivery-123", "impression");
      const id2 = generateEventId("delivery-123", "impression");

      assert.strictEqual(id1, id2);
    });

    test("different event types generate different IDs", () => {
      const impression = generateEventId("delivery-123", "impression");
      const complete = generateEventId("delivery-123", "video_complete");

      assert.notStrictEqual(impression, complete);
    });

    test("different deliveryRequestIds generate different IDs", () => {
      const id1 = generateEventId("delivery-123", "impression");
      const id2 = generateEventId("delivery-456", "impression");

      assert.notStrictEqual(id1, id2);
    });

    test("event ID format includes both components", () => {
      const id = generateEventId("delivery-abc", "video_start");

      assert.ok(id.includes("delivery-abc"));
      assert.ok(id.includes("video_start"));
      assert.ok(id.includes("_"));
    });
  });

  describe("event tracking interface", () => {
    test("ReelsAdEvent has required fields", () => {
      const event: ReelsAdEvent = {
        eventId: "evt-123",
        deliveryRequestId: "delivery-456",
        adId: "ad-789",
        eventType: "impression",
        position: 2,
        reelId: "reel-999",
        userId: "user-111",
        sessionId: "session-222",
        occurredAt: new Date().toISOString(),
        metadata: {
          viewDurationMs: 1500,
        },
      };

      assert.ok(event.eventId);
      assert.ok(event.deliveryRequestId);
      assert.ok(event.adId);
      assert.ok(event.eventType);
      assert.strictEqual(event.position, 2);
    });

    test("ReelsAdEvent supports all event types", () => {
      const eventTypes = [
        "ad_request",
        "ad_served",
        "impression",
        "video_start",
        "video_25",
        "video_50",
        "video_75",
        "video_complete",
        "click",
        "skip",
        "viewable_impression",
        "playback_error",
      ] as const;

      for (const type of eventTypes) {
        const event: ReelsAdEvent = {
          eventId: `evt-${type}`,
          deliveryRequestId: "delivery-test",
          adId: "ad-test",
          eventType: type,
          position: 0,
        };
        assert.strictEqual(event.eventType, type);
      }
    });

    test("ReelsAdEvent supports metadata for different event types", () => {
      // impression event
      const impression: ReelsAdEvent = {
        eventId: "evt-1",
        deliveryRequestId: "del-1",
        adId: "ad-1",
        eventType: "impression",
        position: 0,
        metadata: { viewDurationMs: 1500 },
      };
      assert.strictEqual(impression.metadata?.viewDurationMs, 1500);

      // video_start event
      const start: ReelsAdEvent = {
        eventId: "evt-2",
        deliveryRequestId: "del-2",
        adId: "ad-2",
        eventType: "video_start",
        position: 0,
        metadata: { positionMs: 0 },
      };
      assert.strictEqual(start.metadata?.positionMs, 0);

      // skip event
      const skip: ReelsAdEvent = {
        eventId: "evt-3",
        deliveryRequestId: "del-3",
        adId: "ad-3",
        eventType: "skip",
        position: 0,
        metadata: { skipReason: "user clicked skip" },
      };
      assert.ok(skip.metadata?.skipReason);

      // playback_error event
      const error: ReelsAdEvent = {
        eventId: "evt-4",
        deliveryRequestId: "del-4",
        adId: "ad-4",
        eventType: "playback_error",
        position: 0,
        metadata: { error: "MEDIA_ERR_ABORTED" },
      };
      assert.ok(error.metadata?.error);
    });
  });

  describe("impression deduplication", () => {
    test("same deliveryRequestId + impression type generates same eventId", () => {
      const id1 = generateEventId("delivery-123", "impression");
      const id2 = generateEventId("delivery-123", "impression");

      assert.strictEqual(id1, id2);
      // These events would be deduplicated by server/client
    });

    test("completion and impression have different IDs", () => {
      const impressionId = generateEventId("delivery-123", "impression");
      const completeId = generateEventId("delivery-123", "video_complete");

      assert.notStrictEqual(impressionId, completeId);
      // Both can be tracked separately
    });
  });
});
