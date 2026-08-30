/**
 * Hook for integrating video ads (pre/mid/post-roll) with fail-open safety.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createVideoAdPlayer, type PlayerState, type VideoAdPlayer, type Ad } from '@/lib/video/video-ad-player';
import type { VideoMedia } from '@/lib/video/types';
import { getAdsFeatureConfig, canShowPlacement, type AdsFeatureConfig } from '@/lib/ads/feature-control';

export interface UseVideoAdsWithSafetyConfig {
  video: VideoMedia;
  userId?: string;
  sessionId?: string;
  postId?: string | number;
  enabled?: boolean;
  debug?: boolean;
}

const DEFAULT_FEATURE_CONFIG: AdsFeatureConfig = {
  globalEnabled: false,
  videoAdsEnabled: false,
  reelsAdsEnabled: false,
  preRollEnabled: false,
  midRollEnabled: false,
  postRollEnabled: false,
};

export function useVideoAdsWithSafety({
  video,
  userId,
  sessionId,
  postId,
  enabled = true,
  debug = false,
}: UseVideoAdsWithSafetyConfig) {
  const [playerState, setPlayerState] = useState<PlayerState>('CONTENT_PLAYING');
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [featureConfig, setFeatureConfig] = useState<AdsFeatureConfig>(DEFAULT_FEATURE_CONFIG);
  const playerRef = useRef<VideoAdPlayer | null>(null);

  // Load feature config once
  useEffect(() => {
    getAdsFeatureConfig()
      .then((config) => {
        setFeatureConfig(config);
        if (debug) console.log('[VideoAds] Feature config loaded:', config);
      })
      .catch((error: unknown) => {
        if (debug) console.warn('[VideoAds] Failed to load feature config:', error);
        setFeatureConfig(DEFAULT_FEATURE_CONFIG);
      });
  }, [debug]);

  // Create video ad player if ads are enabled
  useEffect(() => {
    if (!enabled || !featureConfig.globalEnabled || !featureConfig.videoAdsEnabled) {
      setPlayerState('CONTENT_PLAYING');
      setCurrentAd(null);
      return;
    }

    const player = createVideoAdPlayer(video, {
      enabled: true,
      userId,
      sessionId,
      postId,
      adBreakPolicy: {
        enablePreRoll: canShowPlacement(featureConfig, 'pre_roll'),
        enableMidRoll: canShowPlacement(featureConfig, 'mid_roll'),
        enablePostRoll: canShowPlacement(featureConfig, 'post_roll'),
        midRollIntervalSeconds: 300,
        minDurationForMidRoll: 120,
      },
    });

    playerRef.current = player;

    const unsubState = player.onStateChange(setPlayerState);
    const unsubAd = player.onAdLoaded((ad: Ad) => setCurrentAd(ad));

    return () => {
      unsubState();
      unsubAd();
      player.dispose();
      playerRef.current = null;
    };
  }, [enabled, featureConfig, video, userId, sessionId, postId]);

  const handleTimeUpdate = useCallback(
    (timeMs: number) => {
      playerRef.current?.handleTimeUpdate(timeMs).catch((error: unknown) => {
        if (debug) console.warn('[VideoAds] Time update error:', error);
      });
    },
    [debug]
  );

  const handlePause = useCallback(() => {
    playerRef.current?.handlePause();
  }, []);

  const handlePlay = useCallback(() => {
    playerRef.current?.handlePlay();
  }, []);

  const handleSeeked = useCallback((timeMs: number) => {
    playerRef.current?.handleSeeked(timeMs);
  }, []);

  const handleAdComplete = useCallback(() => {
    playerRef.current?.completeCurrentAd();
  }, []);

  const handleAdSkip = useCallback(() => {
    playerRef.current?.skipCurrentAd();
  }, []);

  return {
    // State
    playerState,
    currentAd,
    isAdsEnabled: enabled && featureConfig.globalEnabled && featureConfig.videoAdsEnabled,

    // Handlers
    handleTimeUpdate,
    handlePause,
    handlePlay,
    handleSeeked,
    handleAdComplete,
    handleAdSkip,

    // Config
    featureConfig,
  };
}
