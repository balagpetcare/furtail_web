/**
 * Hook for integrating reels ads with fail-open safety.
 */

import { useEffect, useState, useCallback } from 'react';
import { createReelsAdManager, type ReelsItem, type ReelsAdManager } from '@/lib/video/reels-ad-manager';
import { createReelsAdTrackingManager, type ReelsAdTrackingManager, type ReelsAdEvent } from '@/lib/video/reels-ad-tracking';
import { DEFAULT_REELS_AD_CONFIG, type ReelsAdConfig } from '@/lib/video/reels-ad-config';
import { getAdsFeatureConfig, canShowReelsAds, type AdsFeatureConfig } from '@/lib/ads/feature-control';
import { safeAsync } from '@/lib/ads/safety-wrapper';

export interface UseReelsAdsWithSafetyConfig {
  reelsFetcher: (position: number) => Promise<string>;
  userId?: string;
  sessionId?: string;
  enabled?: boolean;
  debug?: boolean;
  config?: Partial<ReelsAdConfig>;
}

const DEFAULT_FEATURE_CONFIG: AdsFeatureConfig = {
  globalEnabled: false,
  videoAdsEnabled: false,
  reelsAdsEnabled: false,
  preRollEnabled: false,
  midRollEnabled: false,
  postRollEnabled: false,
};

export function useReelsAdsWithSafety({
  reelsFetcher,
  userId,
  sessionId,
  enabled = true,
  debug = false,
  config: customConfig,
}: UseReelsAdsWithSafetyConfig) {
  const [featureConfig, setFeatureConfig] = useState<AdsFeatureConfig>(DEFAULT_FEATURE_CONFIG);
  const [reelsManager, setReelsManager] = useState<ReelsAdManager | null>(null);
  const [trackingManager, setTrackingManager] = useState<ReelsAdTrackingManager | null>(null);

  // Load feature config and initialize managers
  useEffect(() => {
    let isMounted = true;

    getAdsFeatureConfig()
      .then((config) => {
        if (!isMounted) return;

        setFeatureConfig(config);

        if (!enabled || !canShowReelsAds(config)) {
          if (debug) console.log('[ReelsAds] Ads disabled');
          return;
        }

        // Initialize reels manager
        const manager = createReelsAdManager(
          {
            ...DEFAULT_REELS_AD_CONFIG,
            ...customConfig,
            enabled: true,
          },
          reelsFetcher,
          userId,
          sessionId
        );

        // Initialize tracking manager
        const tracking = createReelsAdTrackingManager(
          '/api/v1/ads/tracking/batch'
        );

        if (isMounted) {
          setReelsManager(manager);
          setTrackingManager(tracking);
          if (debug) console.log('[ReelsAds] Managers initialized');
        }
      })
      .catch((error: unknown) => {
        if (debug) console.warn('[ReelsAds] Failed to initialize:', error);
        // Fail-open: continue without ads
        setFeatureConfig(DEFAULT_FEATURE_CONFIG);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, reelsFetcher, userId, sessionId, customConfig, debug]);

  const getItemAt = useCallback(
    async (position: number): Promise<ReelsItem | null> => {
      if (!reelsManager) {
        // Ads disabled: fetch organic reel
        try {
          const reelId = await reelsFetcher(position);
          return reelId ? { id: reelId, type: 'organic' } : null;
        } catch (error: unknown) {
          if (debug) console.warn('[ReelsAds] Failed to fetch reel:', error);
          return null;
        }
      }

      return safeAsync(
        () => reelsManager.getItemAt(position),
        `Get item at position ${position}`
      );
    },
    [reelsManager, reelsFetcher, debug]
  );

  const recordView = useCallback(
    async (position: number, durationMs: number): Promise<void> => {
      if (!reelsManager) return;

      return safeAsync(
        () => reelsManager.recordView(position, durationMs),
        `Record view at position ${position}`
      ).then(() => {});
    },
    [reelsManager]
  );

  const prefetch = useCallback(
    async (position: number): Promise<void> => {
      if (!reelsManager) return;

      return safeAsync(
        () => reelsManager.prefetch(position),
        `Prefetch from position ${position}`
      ).then(() => {});
    },
    [reelsManager]
  );

  const trackEvent = useCallback(
    async (event: ReelsAdEvent): Promise<void> => {
      if (!trackingManager) return;

      // Fire-and-forget
      trackingManager.track(event).catch((error: unknown) => {
        if (debug) console.warn('[ReelsAds] Tracking error:', error);
      });
    },
    [trackingManager, debug]
  );

  const reset = useCallback(() => {
    reelsManager?.reset();
  }, [reelsManager]);

  const cleanup = useCallback(() => {
    reelsManager?.dispose();
    trackingManager?.dispose();
  }, [reelsManager, trackingManager]);

  return {
    // State
    featureConfig,
    isAdsEnabled: enabled && featureConfig.globalEnabled && featureConfig.reelsAdsEnabled,

    // Managers
    reelsManager,
    trackingManager,

    // Handlers
    getItemAt,
    recordView,
    prefetch,
    trackEvent,
    reset,
    cleanup,
  };
}
