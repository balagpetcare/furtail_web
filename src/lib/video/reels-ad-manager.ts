/**
 * Reels ad manager — handles sponsored reel rotation, deduplication, and lifecycle.
 *
 * Responsibilities:
 *  - Determine which positions need sponsored content
 *  - Request ads from Petsmart API (with prefetching)
 *  - Deduplicate ads across React/Flutter rebuilds
 *  - Track view duration and trigger impressions
 *  - Handle no-fill by continuing to organic
 *  - Prefetch only when needed
 */

import type { ReelsAdConfig } from './reels-ad-config';
import { shouldBeSponsored, getNextSponsoredPosition } from './reels-ad-config';
import { requestAdForPlacement } from '@/lib/api/petsmart-ads-client';
import type { Ad } from '@/lib/video/video-ad-player';

export interface ReelsItem {
  id: string; // Reel/post ID
  type: 'organic' | 'sponsored' | 'sponsored_external';
  ad?: Ad & { deliveryRequestId: string };
  /** Command 5 — external render contract, present only when type is 'sponsored_external'. */
  externalAd?: import('@/lib/api/petsmart-ads-client').ExternalAdRenderContract;
  /** For deduplication: the request ID used for this ad. */
  adRequestId?: string;
}

export interface ReelsAdManager {
  /** Get item at position (may be organic or sponsored). */
  getItemAt(position: number): Promise<ReelsItem | null>;

  /** Prefetch ads for upcoming positions. */
  prefetch(fromPosition: number): Promise<void>;

  /** Mark an ad as viewed for duration. Triggers impression if threshold met. */
  recordView(position: number, durationMs: number): Promise<void>;

  /** Clear internal cache (for fresh feed). */
  reset(): void;

  /** Cleanup. */
  dispose(): void;
}

interface CachedAd {
  ad?: Ad & { deliveryRequestId: string };
  externalAd?: import('@/lib/api/petsmart-ads-client').ExternalAdRenderContract;
  requestId: string; // Stable ID for deduplication
}

export function createReelsAdManager(
  config: ReelsAdConfig,
  organicReelsFetcher: (position: number) => Promise<string>, // Returns reel ID
  userId?: string,
  sessionId?: string,
): ReelsAdManager {
  const adCache = new Map<number, CachedAd | null>(); // null = no-fill
  const impressionsSeen = new Set<string>(); // requestId:position for dedup
  let prefetchingPositions = new Set<number>();

  async function requestAdForPosition(position: number): Promise<CachedAd | null> {
    const cacheKey = position;

    // Check cache (including no-fill).
    if (adCache.has(cacheKey)) {
      return adCache.get(cacheKey) ?? null;
    }

    // Request ad.
    const requestId = `${sessionId ?? 'anon'}_pos_${position}_${Date.now()}`;
    try {
      const response = await requestAdForPlacement({
        userId: userId ?? '',
        placementCode: 'REELS_IN_FEED',
        context: {
          surface: 'reels_feed',
          position,
          sourcePlatform: 'furtail',
        },
        sessionId,
        requestId,
      });

      if (response.status === 'FILL' && 'ad' in response && response.ad) {
        const ad: Ad & { deliveryRequestId: string } = {
          id: response.ad.id,
          deliveryRequestId: 'deliveryRequestId' in response ? (response.deliveryRequestId ?? response.ad.id) : response.ad.id,
          creative: {
            id: response.ad.creative?.id ?? 'unknown',
            videoUrl: response.ad.creative?.videoUrl ?? '',
            assetUrl: response.ad.creative?.assetUrl ?? undefined,
            headline: response.ad.creative?.headline ?? undefined,
            body: response.ad.creative?.body ?? undefined,
          },
          ctaText: response.ad.ctaText ?? undefined,
          destinationUrl: response.ad.destinationUrl,
        };

        const cached: CachedAd = { ad, requestId };
        adCache.set(cacheKey, cached);
        return cached;
      }

      // Command 5: a genuine external-mediation FILL (deliveryType EXTERNAL).
      // Fails open the same as any other unrecognized shape if malformed —
      // rendering safety itself is enforced by ExternalAdCard's isRenderable().
      if (response.status === 'FILL' && 'deliveryType' in response && response.deliveryType === 'EXTERNAL') {
        const cached: CachedAd = { externalAd: response, requestId };
        adCache.set(cacheKey, cached);
        return cached;
      }

      // No fill / unavailable — cache the null result so we don't re-request.
      adCache.set(cacheKey, null);
      return null;
    } catch (error) {
      console.error(`[ReelsAdManager] Ad request failed for position ${position}:`, error);
      // Cache the failure so we don't keep retrying.
      adCache.set(cacheKey, null);
      return null;
    }
  }

  return {
    async getItemAt(position: number): Promise<ReelsItem | null> {
      // Always fetch organic content first.
      const reelId = await organicReelsFetcher(position);
      if (!reelId) return null;

      // Check if this position needs a sponsored reel.
      if (!shouldBeSponsored(position, config.frequency)) {
        return { id: reelId, type: 'organic' };
      }

      // Request ad for this position.
      const cached = await requestAdForPosition(position);

      if (!cached) {
        // No fill — return organic content instead.
        return { id: reelId, type: 'organic' };
      }

      if (cached.ad) {
        return {
          id: reelId,
          type: 'sponsored',
          ad: cached.ad,
          adRequestId: `${sessionId ?? 'anon'}_pos_${position}`,
        };
      }

      if (cached.externalAd) {
        return {
          id: reelId,
          type: 'sponsored_external',
          externalAd: cached.externalAd,
          adRequestId: `${sessionId ?? 'anon'}_pos_${position}`,
        };
      }

      // Defensive fail-open: neither shape populated -> treat as organic.
      return { id: reelId, type: 'organic' };
    },

    async prefetch(fromPosition: number): Promise<void> {
      if (!config.enabled || config.prefetchAhead <= 0) {
        return;
      }

      const nextSponsored = getNextSponsoredPosition(
        fromPosition,
        config.frequency,
        config.prefetchAhead * 2
      );

      if (nextSponsored > 0 && !prefetchingPositions.has(nextSponsored)) {
        prefetchingPositions.add(nextSponsored);
        void requestAdForPosition(nextSponsored).then(() => {
          prefetchingPositions.delete(nextSponsored);
        });
      }
    },

    async recordView(position: number, durationMs: number): Promise<void> {
      const cached = adCache.get(position);
      if (!cached) {
        return; // Not an ad or not cached.
      }

      const { requestId } = cached;
      const impressionKey = `${requestId}:${position}`;

      // Deduplicate impressions.
      if (impressionsSeen.has(impressionKey)) {
        return;
      }

      // Check if view duration qualifies as impression.
      if (durationMs >= config.impressionThresholdMs) {
        impressionsSeen.add(impressionKey);
        // Actual impression tracking happens via ReelsAdTrackingManager
        // (managed separately to keep this component focused on rotation logic)
      }
    },

    reset(): void {
      adCache.clear();
      impressionsSeen.clear();
      prefetchingPositions.clear();
    },

    dispose(): void {
      adCache.clear();
      impressionsSeen.clear();
      prefetchingPositions.clear();
    },
  };
}
