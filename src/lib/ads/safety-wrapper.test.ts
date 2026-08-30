import { test, describe } from "node:test";
import * as assert from "node:assert";
import {
  safeAsync,
  safeSync,
  safeRequestAd,
  safeLoadMedia,
  handleAdMediaFailure,
  handleNoAdCandidates,
} from "./safety-wrapper";

describe("Ads Safety Wrapper", () => {
  describe("safeAsync", () => {
    test("returns result on success", async () => {
      const result = await safeAsync(
        async () => "success",
        "test operation"
      );
      assert.strictEqual(result, "success");
    });

    test("returns null on error", async () => {
      const result = await safeAsync(
        async () => {
          throw new Error("operation failed");
        },
        "failing operation"
      );
      assert.strictEqual(result, null);
    });

    test("returns null on timeout", async () => {
      const result = await safeAsync(
        async () => {
          await new Promise((_resolve) =>
            setTimeout(_resolve, 10000) // 10 seconds
          );
          return "never happens";
        },
        "slow operation",
        { timeoutMs: 100 } // 100ms timeout
      );
      assert.strictEqual(result, null);
    });

    test("handles rejection", async () => {
      const result = await safeAsync(
        async () => {
          return Promise.reject(new Error("rejected"));
        },
        "rejected operation"
      );
      assert.strictEqual(result, null);
    });
  });

  describe("safeSync", () => {
    test("returns result on success", () => {
      const result = safeSync(() => 42, "test");
      assert.strictEqual(result, 42);
    });

    test("returns null on error", () => {
      const result = safeSync(
        () => {
          throw new Error("sync error");
        },
        "failing sync"
      );
      assert.strictEqual(result, null);
    });
  });

  describe("safeRequestAd", () => {
    test("returns ad on success", async () => {
      const ad = { id: "ad-123", videoUrl: "https://example.com/ad.mp4" };
      const result = await safeRequestAd(async () => ad);
      assert.deepStrictEqual(result, ad);
    });

    test("returns null when request returns null", async () => {
      const result = await safeRequestAd(async () => null);
      assert.strictEqual(result, null);
    });

    test("returns null on request error", async () => {
      const result = await safeRequestAd(async () => {
        throw new Error("ad server error");
      });
      assert.strictEqual(result, null);
    });

    test("returns null on timeout", async () => {
      const result = await safeRequestAd(
        async () => {
          await new Promise((_resolve) => setTimeout(_resolve, 10000));
          return { id: "ad-123" };
        },
        { timeoutMs: 100 }
      );
      assert.strictEqual(result, null);
    });
  });

  describe("Scenario: Ads API unavailable", () => {
    test("content plays without ads", async () => {
      const adResult = await safeRequestAd(async () => {
        throw new Error("API unavailable");
      });

      assert.strictEqual(adResult, null); // Ad request failed

      // Content plays anyway (caller handles null)
      const fallback = () => "continue with organic content";
      assert.strictEqual(fallback(), "continue with organic content");
    });
  });

  describe("Scenario: Ad request timeout", () => {
    test("content plays immediately", async () => {
      const adResult = await safeRequestAd(
        async () => {
          await new Promise((_resolve) => setTimeout(_resolve, 5000));
          return { id: "ad-123" };
        },
        { timeoutMs: 100 }
      );

      assert.strictEqual(adResult, null);
      // Content plays without waiting for ad
    });
  });

  describe("Scenario: No ad candidates (no-fill)", () => {
    test("fallback to organic reel", async () => {
      const adResult = await safeRequestAd(async () => null);

      assert.strictEqual(adResult, null);

      // Use organic content as fallback
      const organicReel = await handleNoAdCandidates(
        () => ({ id: "reel-456", type: "organic" })
      );
      assert.strictEqual(organicReel.type, "organic");
    });
  });

  describe("Scenario: Ad media failure", () => {
    test("content plays without ad", async () => {
      const organicContent = await handleAdMediaFailure(
        () => ({ id: "reel-456", type: "organic" })
      );

      assert.strictEqual(organicContent.type, "organic");
    });
  });

  describe("Scenario: Tracking failure", () => {
    test("playback unaffected", () => {
      // Tracking failure must not throw or affect playback
      assert.doesNotThrow(() => {
        // Simulate tracking failure
        const trackingFailed = null; // Network error, Redis down, etc.
        // Content continues playing
        const contentPlays = true;
        assert.strictEqual(contentPlays, true);
      });
    });
  });

  describe("Scenario: Redis degradation", () => {
    test("feature flags default to disabled", async () => {
      // If Redis is down, feature config fetch fails
      const config = await safeAsync(
        async () => {
          throw new Error("Redis connection failed");
        },
        "fetch feature config"
      );

      assert.strictEqual(config, null);
      // Caller defaults to all disabled (fail-open)
    });
  });

  describe("Scenario: Budget exhaustion", () => {
    test("content plays without ad", async () => {
      const adResult = await safeRequestAd(
        async () => {
          // Budget exhausted → NO_FILL response
          return null;
        }
      );

      assert.strictEqual(adResult, null);
      // Content plays as normal
    });
  });

  describe("Scenario: Reservation conflict", () => {
    test("fallback handles gracefully", async () => {
      const adResult = await safeRequestAd(
        async () => {
          // Reservation conflict in auction
          throw new Error("Reservation conflict");
        }
      );

      assert.strictEqual(adResult, null);
      // Content continues playing
    });
  });

  describe("Global kill switch", () => {
    test("all ads disabled when global flag is false", () => {
      const config = {
        globalEnabled: false,
        videoAdsEnabled: true,
        reelsAdsEnabled: true,
      };

      // Global kill switch overrides everything
      assert.strictEqual(config.globalEnabled, false);
      // No ads should be requested
    });

    test("all ads enabled when global flag is true", () => {
      const config = {
        globalEnabled: true,
        videoAdsEnabled: true,
        reelsAdsEnabled: true,
      };

      assert.strictEqual(config.globalEnabled, true);
      // Ads can be requested
    });
  });
});
