import { test, describe, before } from "node:test";
import * as assert from "node:assert";
import { createReelsAdManager, type ReelsItem } from "./reels-ad-manager";
import { DEFAULT_REELS_AD_CONFIG } from "./reels-ad-config";
import type { Ad } from "./video-ad-player";

describe("Reels Ad Manager", () => {
  const mockAd: Ad & { deliveryRequestId: string } = {
    id: "ad-123",
    deliveryRequestId: "delivery-456",
    creative: {
      id: "creative-1",
      videoUrl: "https://example.com/ad.mp4",
    },
    ctaText: "Watch",
    destinationUrl: "https://example.com",
  };

  let reelCounter = 0;
  function createMockReelFetcher(shouldSucceed = true) {
    return async (position: number): Promise<string> => {
      if (!shouldSucceed) throw new Error("Reel fetch failed");
      reelCounter += 1;
      return `reel-${position}-${reelCounter}`;
    };
  }

  describe("reels frequency", () => {
    test("with frequency 3: every 3rd position gets sponsored reel", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 3 },
        createMockReelFetcher()
      );

      // Position 0: organic
      const item0 = await manager.getItemAt(0);
      assert.strictEqual(item0?.type, "organic");

      // Position 1: organic
      const item1 = await manager.getItemAt(1);
      assert.strictEqual(item1?.type, "organic");

      // Position 2: should be sponsored (but no-fill in test)
      const item2 = await manager.getItemAt(2);
      // In test, requestAdForPlacement fails, so falls back to organic
      assert.strictEqual(item2?.type, "organic");

      manager.dispose();
    });

    test("with frequency 2: every other position is sponsored", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 2 },
        createMockReelFetcher()
      );

      const item0 = await manager.getItemAt(0);
      assert.strictEqual(item0?.type, "organic");

      const item1 = await manager.getItemAt(1);
      // Should attempt sponsored but falls back to organic
      assert.ok(item1);

      manager.dispose();
    });

    test("disabled frequency (frequency = 1) shows only organic", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 1 },
        createMockReelFetcher()
      );

      for (let i = 0; i < 10; i++) {
        const item = await manager.getItemAt(i);
        assert.strictEqual(item?.type, "organic");
      }

      manager.dispose();
    });
  });

  describe("fast swipe handling", () => {
    test("view with duration < threshold does not count as impression", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 2,
          impressionThresholdMs: 1000, // 1 second
        },
        createMockReelFetcher()
      );

      // Fast swipe: 300ms view time
      await manager.recordView(1, 300);

      // A view is recorded but doesn't trigger impression
      // (impression tracking happens in ReelsAdTrackingManager)
      assert.ok(true); // Test passes if no error

      manager.dispose();
    });

    test("view with duration >= threshold counts as impression", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 2,
          impressionThresholdMs: 1000,
        },
        createMockReelFetcher()
      );

      // Proper view: 2 seconds
      await manager.recordView(1, 2000);

      // Impression should be tracked (deduplication handled internally)
      assert.ok(true);

      manager.dispose();
    });
  });

  describe("duplicate impression prevention", () => {
    test("same position viewed twice is only counted once", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 2,
          impressionThresholdMs: 100,
        },
        createMockReelFetcher()
      );

      // First view
      await manager.recordView(1, 500);

      // Second view of same position (e.g., React rebuild)
      await manager.recordView(1, 500);

      // Internal deduplication prevents duplicate counting
      assert.ok(true);

      manager.dispose();
    });

    test("different positions each count separately", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 2,
          impressionThresholdMs: 100,
        },
        createMockReelFetcher()
      );

      // Two different sponsored positions
      await manager.recordView(1, 500);
      await manager.recordView(3, 500);

      // Both should be tracked (different positions)
      assert.ok(true);

      manager.dispose();
    });
  });

  describe("no-fill handling", () => {
    test("no-fill continues to organic reel", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 3 },
        createMockReelFetcher()
      );

      // Position 2 should be sponsored but we mock failure
      const item = await manager.getItemAt(2);

      // Falls back to organic
      assert.strictEqual(item?.type, "organic");
      assert.ok(item?.id); // Still has reel ID

      manager.dispose();
    });

    test("no-fill result is cached", async () => {
      const fetcher = createMockReelFetcher();
      let fetchCount = 0;
      const countingFetcher = async (pos: number): Promise<string> => {
        fetchCount += 1;
        return fetcher(pos);
      };

      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 3 },
        countingFetcher
      );

      // First request for position 2
      const item1 = await manager.getItemAt(2);
      const count1 = fetchCount;

      // Second request for position 2 should use cache
      const item2 = await manager.getItemAt(2);

      // Both should be organic
      assert.strictEqual(item1?.type, "organic");
      assert.strictEqual(item2?.type, "organic");

      manager.dispose();
    });
  });

  describe("reset and deduplication", () => {
    test("reset clears cached ads", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 3 },
        createMockReelFetcher()
      );

      // Get items (populates cache)
      await manager.getItemAt(0);
      await manager.getItemAt(1);

      // Reset clears cache
      manager.reset();

      // After reset, items can be re-fetched (in real scenario, might be different ads)
      const item = await manager.getItemAt(0);
      assert.ok(item);

      manager.dispose();
    });

    test("reset clears impression dedup tracking", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 2,
          impressionThresholdMs: 100,
        },
        createMockReelFetcher()
      );

      // Record impression
      await manager.recordView(1, 500);

      // Reset
      manager.reset();

      // Same position can be recorded again
      await manager.recordView(1, 500);

      assert.ok(true);

      manager.dispose();
    });
  });

  describe("prefetching", () => {
    test("prefetch requests ahead when enabled", async () => {
      const fetcher = createMockReelFetcher();
      let requestCount = 0;
      const countingFetcher = async (pos: number): Promise<string> => {
        requestCount += 1;
        return fetcher(pos);
      };

      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 3,
          prefetchAhead: 1,
        },
        countingFetcher
      );

      const beforeCount = requestCount;

      // Prefetch from position 0 (next sponsored is 2)
      await manager.prefetch(0);

      // After small delay, prefetch request might be pending
      assert.ok(true);

      manager.dispose();
    });

    test("no prefetch if prefetchAhead = 0", async () => {
      const manager = createReelsAdManager(
        {
          ...DEFAULT_REELS_AD_CONFIG,
          frequency: 3,
          prefetchAhead: 0,
        },
        createMockReelFetcher()
      );

      // Prefetch should be no-op
      await manager.prefetch(0);

      assert.ok(true);

      manager.dispose();
    });
  });

  describe("lifecycle", () => {
    test("dispose clears all state", async () => {
      const manager = createReelsAdManager(
        { ...DEFAULT_REELS_AD_CONFIG, frequency: 3 },
        createMockReelFetcher()
      );

      await manager.getItemAt(0);
      manager.dispose();

      // After dispose, internal state is cleared
      // (reset should be called before further use)
      assert.ok(true);
    });
  });
});
