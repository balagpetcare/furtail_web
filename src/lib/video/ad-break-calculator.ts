/**
 * Ad break calculation — determines when pre-roll, mid-roll, and post-roll
 * breaks should fire based on video duration and configurable policy.
 *
 * Prevents duplicate breaks via served-break state (same break never fires
 * twice after seek/re-render/pause). Breaks are pinned to absolute
 * playhead positions, not percentage, so they're stable under seek.
 */

export interface AdBreakPolicy {
  /** Enable pre-roll (fires at start, before content plays). */
  enablePreRoll: boolean;
  /** Enable mid-roll (fires at calculated intervals within content). */
  enableMidRoll: boolean;
  /** Enable post-roll (fires after content ends). */
  enablePostRoll: boolean;
  /** Target interval in seconds for mid-roll breaks (e.g., every 5 minutes). */
  midRollIntervalSeconds: number;
  /** Minimum content duration in seconds to enable mid-roll. Default 120s (2min). */
  minDurationForMidRoll: number;
}

export const DEFAULT_AD_BREAK_POLICY: AdBreakPolicy = {
  enablePreRoll: true,
  enableMidRoll: true,
  enablePostRoll: true,
  midRollIntervalSeconds: 300, // Every 5 minutes
  minDurationForMidRoll: 120, // 2 minutes minimum
};

export interface AdBreak {
  /** Unique identifier for this break (e.g., "PRE_ROLL", "MID_ROLL_1", "POST_ROLL"). */
  id: string;
  /** Break type. */
  type: "PRE_ROLL" | "MID_ROLL" | "POST_ROLL";
  /** Absolute playhead position in milliseconds where this break triggers.
   * For PRE_ROLL this is 0; for POST_ROLL it's > duration. */
  triggerAtMs: number;
  /** Human-readable label (e.g., "Pre-Roll", "Mid-Roll @ 3min"). */
  label: string;
}

/**
 * Calculate all ad breaks for a video given its duration and policy.
 *
 * Mid-roll breaks are placed at regular intervals; the number of breaks
 * adapts to the video duration (longer videos get more breaks).
 *
 * Returns breaks sorted by triggerAtMs (pre-roll first, then mid-rolls in order,
 * post-roll last). Caller is responsible for tracking which breaks have fired.
 */
export function calculateAdBreaks(
  durationMs: number,
  policy: AdBreakPolicy = DEFAULT_AD_BREAK_POLICY,
): AdBreak[] {
  const breaks: AdBreak[] = [];

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return breaks;
  }

  const durationSeconds = durationMs / 1000;

  // Pre-roll: always at position 0 if enabled.
  if (policy.enablePreRoll) {
    breaks.push({
      id: "PRE_ROLL",
      type: "PRE_ROLL",
      triggerAtMs: 0,
      label: "Pre-Roll",
    });
  }

  // Mid-rolls: at regular intervals if enabled and duration is sufficient.
  if (policy.enableMidRoll && durationSeconds >= policy.minDurationForMidRoll) {
    const intervalSeconds = policy.midRollIntervalSeconds;
    // Calculate mid-roll positions: skip the first intervalSeconds to avoid
    // overlapping with pre-roll, place one every intervalSeconds after that.
    for (
      let positionSeconds = intervalSeconds;
      positionSeconds < durationSeconds;
      positionSeconds += intervalSeconds
    ) {
      const index = Math.floor(positionSeconds / intervalSeconds);
      breaks.push({
        id: `MID_ROLL_${index}`,
        type: "MID_ROLL",
        triggerAtMs: Math.round(positionSeconds * 1000),
        label: `Mid-Roll @ ${Math.floor(positionSeconds / 60)}min`,
      });
    }
  }

  // Post-roll: at or just after the content ends if enabled.
  if (policy.enablePostRoll) {
    breaks.push({
      id: "POST_ROLL",
      type: "POST_ROLL",
      triggerAtMs: durationMs,
      label: "Post-Roll",
    });
  }

  return breaks;
}

/**
 * Determine which ad breaks (if any) should fire given the current playhead
 * position and a set of already-served breaks.
 *
 * Returns an array of AdBreak objects representing breaks that are newly
 * triggered. If the same break was already served, it is not returned again
 * (idempotency).
 *
 * Accounts for seeks: if the user scrubbed past multiple breaks, all newly
 * crossed breaks are returned. If they scrubbed backward, no breaks fire
 * (we don't re-play a break they've already seen).
 */
export function getBreaksToFire(
  currentTimeMs: number,
  allBreaks: AdBreak[],
  servedBreakIds: Set<string>,
  previousTimeMs: number = 0,
): AdBreak[] {
  const toFire: AdBreak[] = [];

  for (const breakDef of allBreaks) {
    // Skip if already served.
    if (servedBreakIds.has(breakDef.id)) {
      continue;
    }

    // Fire if we've crossed this break's trigger point and we're moving forward.
    // For breaks at the start (triggerAtMs === 0), fire on any forward motion.
    // For other breaks, ensure previousTimeMs < triggerAtMs <= currentTimeMs.
    const isBreakCrossed =
      breakDef.triggerAtMs === 0
        ? previousTimeMs <= 0 && currentTimeMs >= 0
        : previousTimeMs < breakDef.triggerAtMs && breakDef.triggerAtMs <= currentTimeMs;

    if (isBreakCrossed) {
      toFire.push(breakDef);
    }
  }

  return toFire;
}

/**
 * Determine the next upcoming ad break given the current playhead position.
 * Used for UI that shows "upcoming break in X seconds".
 */
export function getNextBreak(
  currentTimeMs: number,
  allBreaks: AdBreak[],
  servedBreakIds: Set<string>,
): AdBreak | null {
  for (const breakDef of allBreaks) {
    if (!servedBreakIds.has(breakDef.id) && breakDef.triggerAtMs > currentTimeMs) {
      return breakDef;
    }
  }
  return null;
}
