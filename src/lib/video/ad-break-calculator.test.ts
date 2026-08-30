import { test, describe, before } from "node:test";
import * as assert from "node:assert";
import {
  calculateAdBreaks,
  getBreaksToFire,
  getNextBreak,
  DEFAULT_AD_BREAK_POLICY,
  type AdBreak,
  type AdBreakPolicy,
} from "./ad-break-calculator";

describe("Ad Break Calculator", () => {
  describe("calculateAdBreaks", () => {
    test("should return empty array for zero/negative duration", () => {
      assert.deepStrictEqual(calculateAdBreaks(0), []);
      assert.deepStrictEqual(calculateAdBreaks(-1000), []);
    });

    test("should return only pre-roll for very short videos", () => {
      const breaks = calculateAdBreaks(60000); // 1 minute
      const preRoll = breaks.filter((b) => b.type === "PRE_ROLL");
      const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
      const postRoll = breaks.filter((b) => b.type === "POST_ROLL");

      assert.strictEqual(preRoll.length, 1);
      assert.strictEqual(preRoll[0]?.triggerAtMs, 0);
      assert.strictEqual(midRoll.length, 0); // Below minDurationForMidRoll (120s)
      assert.strictEqual(postRoll.length, 1);
    });

    test("should calculate correct pre-roll, mid-rolls, and post-roll for 10min video", () => {
      const durationMs = 10 * 60 * 1000; // 10 minutes
      const breaks = calculateAdBreaks(durationMs);

      // With 5min interval: 0 (pre), 5min (mid), 10min (post)
      const preRoll = breaks.filter((b) => b.type === "PRE_ROLL");
      const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
      const postRoll = breaks.filter((b) => b.type === "POST_ROLL");

      assert.strictEqual(preRoll.length, 1);
      assert.strictEqual(preRoll[0]?.triggerAtMs, 0);

      assert.strictEqual(midRoll.length, 1);
      assert.strictEqual(midRoll[0]?.triggerAtMs, 300000); // 5 minutes

      assert.strictEqual(postRoll.length, 1);
      assert.strictEqual(postRoll[0]?.triggerAtMs, 600000); // 10 minutes
    });

    test("should calculate multiple mid-rolls for longer videos", () => {
      const durationMs = 30 * 60 * 1000; // 30 minutes
      const breaks = calculateAdBreaks(durationMs);

      const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
      // Expected: breaks at 5min, 10min, 15min, 20min, 25min
      assert.ok(midRoll.length > 1);
      assert.strictEqual(midRoll[0]?.triggerAtMs, 300000); // 5 minutes
      assert.strictEqual(midRoll[1]?.triggerAtMs, 600000); // 10 minutes
    });

    test("should respect custom break policy", () => {
      const policy: AdBreakPolicy = {
        enablePreRoll: false,
        enableMidRoll: true,
        enablePostRoll: false,
        midRollIntervalSeconds: 120, // 2 minutes
        minDurationForMidRoll: 60,
      };

      const durationMs = 10 * 60 * 1000; // 10 minutes
      const breaks = calculateAdBreaks(durationMs, policy);

      assert.strictEqual(breaks.filter((b) => b.type === "PRE_ROLL").length, 0);
      assert.strictEqual(breaks.filter((b) => b.type === "POST_ROLL").length, 0);

      const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
      // Expected: 2min, 4min, 6min, 8min intervals
      assert.ok(midRoll.length > 0);
    });

    test("should disable mid-roll below minDurationForMidRoll", () => {
      const policy: AdBreakPolicy = {
        enablePreRoll: true,
        enableMidRoll: true,
        enablePostRoll: true,
        midRollIntervalSeconds: 300,
        minDurationForMidRoll: 300, // 5 minutes minimum
      };

      // 3 minute video
      const breaks = calculateAdBreaks(180000, policy);
      const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
      assert.strictEqual(midRoll.length, 0);
    });

    test("should order breaks chronologically", () => {
      const durationMs = 20 * 60 * 1000; // 20 minutes
      const breaks = calculateAdBreaks(durationMs);

      for (let i = 1; i < breaks.length; i++) {
        assert.ok(
          breaks[i]!.triggerAtMs >= breaks[i - 1]!.triggerAtMs,
          `Break ${i} should be after break ${i - 1}`
        );
      }
    });
  });

  describe("getBreaksToFire", () => {
    let testBreaks: AdBreak[];

    before(() => {
      testBreaks = [
        { id: "PRE_ROLL", type: "PRE_ROLL", triggerAtMs: 0, label: "Pre-Roll" },
        {
          id: "MID_ROLL_1",
          type: "MID_ROLL",
          triggerAtMs: 300000,
          label: "Mid-Roll @ 5min",
        },
        {
          id: "MID_ROLL_2",
          type: "MID_ROLL",
          triggerAtMs: 600000,
          label: "Mid-Roll @ 10min",
        },
        { id: "POST_ROLL", type: "POST_ROLL", triggerAtMs: 900000, label: "Post-Roll" },
      ];
    });

    test("should fire break when crossing its trigger point", () => {
      const servedIds = new Set<string>();
      const breaks = getBreaksToFire(300000, testBreaks, servedIds, 0);

      // Should fire PRE_ROLL (crossed at 0) and MID_ROLL_1 (crossed at 300000)
      assert.strictEqual(breaks.length, 2);
      assert.deepStrictEqual(
        breaks.map((b) => b.id),
        ["PRE_ROLL", "MID_ROLL_1"]
      );
    });

    test("should not re-fire already-served breaks", () => {
      const servedIds = new Set(["PRE_ROLL", "MID_ROLL_1"]);
      const breaks = getBreaksToFire(300000, testBreaks, servedIds, 0);

      assert.strictEqual(breaks.length, 0);
    });

    test("should not fire when seeking backward", () => {
      const servedIds = new Set<string>();
      // Moving from 600000 back to 200000
      const breaks = getBreaksToFire(200000, testBreaks, servedIds, 600000);

      assert.strictEqual(breaks.length, 0);
    });

    test("should fire all breaks crossed during seek forward", () => {
      const servedIds = new Set<string>();
      // Jump from 0 to 700000 (crosses PRE_ROLL, MID_ROLL_1, MID_ROLL_2)
      const breaks = getBreaksToFire(700000, testBreaks, servedIds, 0);

      assert.strictEqual(breaks.length, 3);
      assert.deepStrictEqual(
        breaks.map((b) => b.id),
        ["PRE_ROLL", "MID_ROLL_1", "MID_ROLL_2"]
      );
    });

    test("should handle empty break list", () => {
      const breaks = getBreaksToFire(1000, [], new Set(), 0);
      assert.strictEqual(breaks.length, 0);
    });
  });

  describe("getNextBreak", () => {
    let testBreaks: AdBreak[];

    before(() => {
      testBreaks = [
        { id: "PRE_ROLL", type: "PRE_ROLL", triggerAtMs: 0, label: "Pre-Roll" },
        {
          id: "MID_ROLL_1",
          type: "MID_ROLL",
          triggerAtMs: 300000,
          label: "Mid-Roll @ 5min",
        },
        {
          id: "MID_ROLL_2",
          type: "MID_ROLL",
          triggerAtMs: 600000,
          label: "Mid-Roll @ 10min",
        },
        { id: "POST_ROLL", type: "POST_ROLL", triggerAtMs: 900000, label: "Post-Roll" },
      ];
    });

    test("should return next upcoming break", () => {
      const next = getNextBreak(0, testBreaks, new Set());
      assert.strictEqual(next?.id, "MID_ROLL_1");
    });

    test("should skip already-served breaks", () => {
      const servedIds = new Set(["PRE_ROLL", "MID_ROLL_1"]);
      const next = getNextBreak(0, testBreaks, servedIds);
      assert.strictEqual(next?.id, "MID_ROLL_2");
    });

    test("should return null when no breaks remain", () => {
      const servedIds = new Set(["PRE_ROLL", "MID_ROLL_1", "MID_ROLL_2", "POST_ROLL"]);
      const next = getNextBreak(900000, testBreaks, servedIds);
      assert.strictEqual(next, null);
    });

    test("should return null after video ends", () => {
      const next = getNextBreak(1000000, testBreaks, new Set()); // After POST_ROLL
      assert.strictEqual(next, null);
    });
  });
});
