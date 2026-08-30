/**
 * Reels ad tracking — comprehensive event tracking for sponsored reels.
 *
 * Events:
 *  - ad_request: Ad was requested for this position
 *  - ad_served: Ad response received (not billable)
 *  - impression: Ad was viewed for threshold duration (BILLABLE)
 *  - video_start: User played the ad
 *  - video_25/50/75: Playback milestones
 *  - video_complete: Ad played to end
 *  - click: User clicked the ad
 *  - skip: User skipped the ad
 *  - viewable_impression: Ad was in viewport (if supported)
 *  - playback_error: Ad playback failed
 *
 * Key principles:
 *  - impression requires both ad_served + min view time (not just response)
 *  - fast swipes do not count as impressions
 *  - impression and completion must be idempotent (deduplicated by requestId)
 *  - all events correlated via eventId + requestId/deliveryId
 */

export type ReelsAdEventType =
  | 'ad_request'
  | 'ad_served'
  | 'impression'
  | 'video_start'
  | 'video_25'
  | 'video_50'
  | 'video_75'
  | 'video_complete'
  | 'click'
  | 'skip'
  | 'viewable_impression'
  | 'playback_error';

export interface ReelsAdEvent {
  /** Unique event ID (for deduplication). */
  eventId: string;
  /** Ad delivery request ID (correlates all events for this ad). */
  deliveryRequestId: string;
  /** Ad creative ID. */
  adId: string;
  /** Event type. */
  eventType: ReelsAdEventType;
  /** Reels position (0-based) where this ad appeared. */
  position: number;
  /** Reel/post ID (user content behind the ad). */
  reelId?: string;
  /** User ID (viewer). */
  userId?: string;
  /** Session ID (user session, not ad session). */
  sessionId?: string;
  /** Timestamp when event occurred. */
  occurredAt?: string;
  /** Additional metadata. */
  metadata?: {
    /** For impression: view duration in ms. */
    viewDurationMs?: number;
    /** For video_* events: current playback position in ms. */
    positionMs?: number;
    /** For skip: skip reason if provided. */
    skipReason?: string;
    /** For playback_error: error message. */
    error?: string;
    /** Ad request duration in ms. */
    requestDurationMs?: number;
    /** Device type. */
    deviceType?: string;
  };
}

export interface ReelsAdTrackingManager {
  /**
   * Track an event for the given ad.
   * Best-effort — failures are logged but never thrown.
   */
  track(event: ReelsAdEvent): Promise<void>;

  /** Track all outstanding events (flush). */
  flush(): Promise<void>;

  /** Stop the manager and flush pending events. */
  dispose(): Promise<void>;
}

interface PendingEvent {
  event: ReelsAdEvent;
  attempts: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds
const FLUSH_BATCH_SIZE = 10; // Or when batch reaches 10 events

export function createReelsAdTrackingManager(
  trackingEndpoint: string,
): ReelsAdTrackingManager {
  const pendingEvents: PendingEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushing = false;

  const flush = async () => {
    if (flushing || pendingEvents.length === 0) {
      return;
    }

    flushing = true;
    const batch = pendingEvents.splice(0, FLUSH_BATCH_SIZE);

    try {
      const response = await fetch(trackingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: batch.map((e) => ({
            ...e.event,
            occurredAt: e.event.occurredAt ?? new Date().toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        // Re-queue failed events with retry count.
        for (const item of batch) {
          if (item.attempts < MAX_RETRY_ATTEMPTS) {
            item.attempts += 1;
            pendingEvents.push(item);
          }
        }
      }
    } catch (error) {
      console.warn('[ReelsAdTracking] Flush failed:', error);
      // Re-queue all events for retry.
      for (const item of batch) {
        if (item.attempts < MAX_RETRY_ATTEMPTS) {
          item.attempts += 1;
          pendingEvents.push(item);
        }
      }
    } finally {
      flushing = false;

      // Reschedule if there are more events.
      if (pendingEvents.length > 0) {
        ensureTimer();
      }
    }
  };

  const ensureTimer = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_INTERVAL_MS);
  };

  return {
    async track(event: ReelsAdEvent): Promise<void> {
      pendingEvents.push({
        event,
        attempts: 0,
      });
      ensureTimer();

      // Flush immediately if batch is full.
      if (pendingEvents.length >= FLUSH_BATCH_SIZE) {
        void flush();
      }
    },

    async flush(): Promise<void> {
      while (pendingEvents.length > 0) {
        await flush();
      }
    },

    async dispose(): Promise<void> {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flush();
    },
  };
}

/**
 * Determine if a view should count as a billable impression.
 *
 * An impression requires:
 *  1. Ad served (not just request)
 *  2. Viewed for at least the impression threshold
 *  3. Not a fast swipe
 */
export function isImpressionQualified(
  viewDurationMs: number,
  impressionThresholdMs: number
): boolean {
  return viewDurationMs >= impressionThresholdMs;
}

/**
 * Generate a stable event ID for deduplication.
 * Uses deliveryRequestId + eventType to ensure idempotency.
 */
export function generateEventId(
  deliveryRequestId: string,
  eventType: ReelsAdEventType
): string {
  return `${deliveryRequestId}_${eventType}`;
}
