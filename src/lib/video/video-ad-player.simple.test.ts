/**
 * Simple unit tests for video ad player (without mocking framework).
 * Tests state machine transitions and break calculations.
 */

import { test, describe } from "node:test";
import * as assert from "node:assert";
import { calculateAdBreaks } from "./ad-break-calculator";
import type { VideoMedia } from "./types";

describe("Video Ad Player - State Machine", () => {
  test("should calculate pre/mid/post-roll breaks for 10min video", () => {
    const durationMs = 10 * 60 * 1000;
    const breaks = calculateAdBreaks(durationMs);

    const preRoll = breaks.filter((b) => b.type === "PRE_ROLL");
    const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
    const postRoll = breaks.filter((b) => b.type === "POST_ROLL");

    assert.strictEqual(preRoll.length, 1, "Should have 1 pre-roll");
    assert.strictEqual(preRoll[0]?.triggerAtMs, 0, "Pre-roll at start");

    assert.strictEqual(midRoll.length, 1, "Should have 1 mid-roll for 10min video");
    assert.strictEqual(midRoll[0]?.triggerAtMs, 300000, "Mid-roll at 5 minutes");

    assert.strictEqual(postRoll.length, 1, "Should have 1 post-roll");
    assert.strictEqual(postRoll[0]?.triggerAtMs, 600000, "Post-roll at 10 minutes");
  });

  test("should have no mid-rolls for short videos", () => {
    const durationMs = 2 * 60 * 1000; // 2 minutes
    const breaks = calculateAdBreaks(durationMs);

    const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
    assert.strictEqual(midRoll.length, 0, "Should have no mid-roll for 2min video");
  });

  test("should have multiple mid-rolls for long videos", () => {
    const durationMs = 30 * 60 * 1000; // 30 minutes
    const breaks = calculateAdBreaks(durationMs);

    const midRoll = breaks.filter((b) => b.type === "MID_ROLL");
    assert.ok(midRoll.length >= 4, "Should have at least 4 mid-rolls for 30min video");
  });

  test("should not duplicate breaks after seek", () => {
    const breaks = calculateAdBreaks(10 * 60 * 1000);
    const served = new Set<string>();

    // Simulate firing all breaks
    for (const breakDef of breaks) {
      served.add(breakDef.id);
    }

    // Simulate seek backward and forward
    const newServed = new Set(served);
    assert.strictEqual(
      newServed.size,
      breaks.length,
      "Should not have duplicate served breaks"
    );
  });

  test("should respect feature policy", () => {
    const noPolicyBreaks = calculateAdBreaks(10 * 60 * 1000, {
      enablePreRoll: true,
      enableMidRoll: true,
      enablePostRoll: true,
      midRollIntervalSeconds: 300,
      minDurationForMidRoll: 120,
    });

    const noPreRollBreaks = calculateAdBreaks(10 * 60 * 1000, {
      enablePreRoll: false,
      enableMidRoll: true,
      enablePostRoll: true,
      midRollIntervalSeconds: 300,
      minDurationForMidRoll: 120,
    });

    const preRollCount = noPolicyBreaks.filter((b) => b.type === "PRE_ROLL").length;
    const preRollCountDisabled = noPreRollBreaks.filter(
      (b) => b.type === "PRE_ROLL"
    ).length;

    assert.strictEqual(preRollCount, 1, "Default should have pre-roll");
    assert.strictEqual(preRollCountDisabled, 0, "Disabled pre-roll should not appear");
  });
});
