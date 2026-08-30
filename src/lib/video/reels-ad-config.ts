/**
 * Configuration for reels ads frequency and behavior.
 * Controls when sponsored content appears in the organic feed.
 */

export interface ReelsAdConfig {
  /** Enable sponsored reels in the feed. */
  enabled: boolean;
  /** Show a sponsored reel every N organic reels (e.g., 3 means every 3rd position). */
  frequency: number;
  /** Skip policy: non-skippable OR delay in milliseconds. */
  skipPolicy: 'non-skippable' | { skipAfterMs: number };
  /** Minimum view time in milliseconds to count as impression. */
  impressionThresholdMs: number;
  /** Prefetch the next ad N positions ahead (0 = on-demand). */
  prefetchAhead: number;
}

export const DEFAULT_REELS_AD_CONFIG: ReelsAdConfig = {
  enabled: true,
  frequency: 3, // Every 3rd reel
  skipPolicy: { skipAfterMs: 5000 }, // Skippable after 5 seconds
  impressionThresholdMs: 1000, // 1 second = impression
  prefetchAhead: 1, // Prefetch 1 reel ahead
};

/**
 * Calculate whether position N should be a sponsored reel.
 * Position 0 is organic, position 1 is organic, ..., position (frequency-1) is sponsored.
 * Then repeats.
 *
 * Example with frequency=3:
 * Position 0: organic
 * Position 1: organic
 * Position 2: sponsored
 * Position 3: organic
 * Position 4: organic
 * Position 5: sponsored
 */
export function shouldBeSponsored(
  position: number,
  frequency: number
): boolean {
  if (frequency <= 1) return false; // No ads if frequency <= 1
  return position % frequency === frequency - 1;
}

/**
 * Get the next sponsored reel position after the given position.
 * Returns -1 if no more sponsored positions in a reasonable lookahead window.
 */
export function getNextSponsoredPosition(
  currentPosition: number,
  frequency: number,
  lookaheadLimit: number = 100
): number {
  if (frequency <= 1) return -1;

  for (let i = currentPosition + 1; i < currentPosition + lookaheadLimit; i++) {
    if (shouldBeSponsored(i, frequency)) {
      return i;
    }
  }
  return -1;
}

/**
 * Get the impression threshold label for UI/tracking.
 */
export function getImpressionThresholdLabel(thresholdMs: number): string {
  if (thresholdMs < 1000) {
    return `${thresholdMs}ms`;
  }
  return `${(thresholdMs / 1000).toFixed(1)}s`;
}
