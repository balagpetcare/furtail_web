/**
 * Video Ad Player state machine and orchestration.
 *
 * Manages:
 *  - Ad break detection and firing
 *  - Ad request/loading/playback
 *  - Content pause/resume coordination
 *  - Player state transitions (CONTENT_PLAYING → AD_LOADING → AD_PLAYING → CONTENT_RESUMING)
 *  - Tracking integration (ad impressions, completions, failures)
 *  - Preventing infinite ad loops
 */

import { calculateAdBreaks, getBreaksToFire, getNextBreak, type AdBreak, type AdBreakPolicy } from './ad-break-calculator';
import { requestAdForPlacement, trackPetSmartAdEvent } from '@/lib/api/petsmart-ads-client';
import type { VideoMedia } from './types';

export type PlayerState =
  | 'CONTENT_PLAYING'
  | 'CONTENT_PAUSED'
  | 'AD_LOADING'
  | 'AD_PLAYING'
  | 'AD_COMPLETED'
  | 'CONTENT_RESUMING'
  | 'ERROR';

export interface AdBreakContext {
  breakId: string;
  breakType: 'PRE_ROLL' | 'MID_ROLL' | 'POST_ROLL';
  triggerAtMs: number;
}

export interface VideoAdConfig {
  userId?: string;
  sessionId?: string;
  postId?: string | number;
  adBreakPolicy?: Partial<AdBreakPolicy>;
  enabled: boolean;
}

export interface Ad {
  id: string;
  deliveryRequestId: string;
  creative: {
    id: string;
    videoUrl: string;
    assetUrl?: string;
    headline?: string;
    body?: string;
  };
  ctaText?: string;
  destinationUrl: string;
}

export interface VideoAdPlayer {
  readonly state: PlayerState;
  readonly currentAdBreak: AdBreakContext | null;
  readonly currentAd: Ad | null;
  onStateChange(listener: (state: PlayerState) => void): () => void;
  onAdBreak(listener: (context: AdBreakContext) => void): () => void;
  onAdLoaded(listener: (ad: Ad) => void): () => void;
  onAdCompleted(listener: () => void): () => void;
  onContentResume(listener: () => void): () => void;
  handleTimeUpdate(currentTimeMs: number): Promise<void>;
  handlePause(): void;
  handlePlay(): void;
  handleSeeked(newTimeMs: number): void;
  completeCurrentAd(): void;
  skipCurrentAd(): void;
  cancelCurrentAd(): void;
  dispose(): void;
}

interface InternalState {
  state: PlayerState;
  contentVideoDurationMs: number;
  currentTimeMs: number;
  previousTimeMs: number;
  adBreaks: AdBreak[];
  servedBreakIds: Set<string>;
  currentAdBreak: AdBreakContext | null;
  currentAd: Ad | null;
  consecutiveAdFailures: number;
  adRequestInFlight: boolean;
}

const MAX_CONSECUTIVE_AD_FAILURES = 3;

export function createVideoAdPlayer(
  contentVideo: VideoMedia,
  config: VideoAdConfig,
): VideoAdPlayer {
  const state: InternalState = {
    state: 'CONTENT_PLAYING',
    contentVideoDurationMs: contentVideo.durationMs ?? 0,
    currentTimeMs: 0,
    previousTimeMs: 0,
    adBreaks: [],
    servedBreakIds: new Set(),
    currentAdBreak: null,
    currentAd: null,
    consecutiveAdFailures: 0,
    adRequestInFlight: false,
  };

  // Calculate ad breaks once at creation time.
  if (config.enabled && state.contentVideoDurationMs > 0) {
    const policy = { ...require('./ad-break-calculator').DEFAULT_AD_BREAK_POLICY, ...config.adBreakPolicy };
    state.adBreaks = calculateAdBreaks(state.contentVideoDurationMs, policy);
  }

  const listeners = {
    stateChange: new Set<(state: PlayerState) => void>(),
    adBreak: new Set<(context: AdBreakContext) => void>(),
    adLoaded: new Set<(ad: Ad) => void>(),
    adCompleted: new Set<() => void>(),
    contentResume: new Set<() => void>(),
  };

  function transitionState(newState: PlayerState) {
    if (state.state === newState) return;
    state.state = newState;
    listeners.stateChange.forEach(listener => listener(newState));
  }

  async function requestAd(breakContext: AdBreakContext): Promise<Ad | null> {
    if (!config.enabled || state.adRequestInFlight) {
      return null;
    }

    state.adRequestInFlight = true;
    try {
      transitionState('AD_LOADING');

      const placementCode = breakContext.breakType === 'PRE_ROLL'
        ? 'VIDEO_PRE_ROLL'
        : breakContext.breakType === 'MID_ROLL'
          ? 'VIDEO_MID_ROLL'
          : 'VIDEO_POST_ROLL';

      const response = await requestAdForPlacement({
        userId: config.userId ?? '',
        placementCode,
        context: {
          surface: 'video_player',
          breakType: breakContext.breakType,
          videoId: String(config.postId ?? ''),
          sourcePlatform: 'furtail',
        },
        sessionId: config.sessionId,
        requestId: breakContext.breakId,
      });

      // Command 5: external mediation can, in principle, fill a video
      // ad-break placement (TEST_PROVIDER declares support for
      // VIDEO_PRE_ROLL/MID_ROLL/POST_ROLL — see capability matrix), but this
      // player has no in-stream external-render implementation yet
      // (VAST/markup-in-video-break is a materially different rendering
      // path from the MARKUP feed/reels case). An EXTERNAL FILL is
      // deliberately treated as NO_FILL here — fail-open, never a fake ad —
      // a real disclosed gap, not a silent drop.
      if (response.status === 'FILL' && 'ad' in response && response.ad) {
        const ad: Ad = {
          id: response.ad.id,
          deliveryRequestId: 'deliveryRequestId' in response ? (response.deliveryRequestId ?? response.ad.id) : response.ad.id,
          creative: {
            id: response.ad.creative?.id ?? 'unknown',
            videoUrl: response.ad.creative?.videoUrl ?? response.ad.creative?.assetUrl ?? '',
            assetUrl: response.ad.creative?.assetUrl ?? undefined,
            headline: response.ad.creative?.headline ?? undefined,
            body: response.ad.creative?.body ?? undefined,
          },
          ctaText: response.ad.ctaText ?? undefined,
          destinationUrl: response.ad.destinationUrl,
        };

        state.currentAd = ad;
        state.consecutiveAdFailures = 0;
        listeners.adLoaded.forEach(listener => listener(ad));
        return ad;
      }

      // No fill or error — resume content immediately.
      state.consecutiveAdFailures += 1;
      return null;
    } catch (error) {
      console.error('[VideoAdPlayer] Ad request failed:', error);
      state.consecutiveAdFailures += 1;
      return null;
    } finally {
      state.adRequestInFlight = false;
    }
  }

  async function fireAdBreak(breakDef: AdBreak) {
    // Prevent infinite ad loops: after 3 consecutive failures, disable ads.
    if (state.consecutiveAdFailures >= MAX_CONSECUTIVE_AD_FAILURES) {
      console.warn('[VideoAdPlayer] Too many ad failures, disabling ads');
      state.servedBreakIds.add(breakDef.id); // Mark as served to prevent re-fire.
      return;
    }

    const breakContext: AdBreakContext = {
      breakId: breakDef.id,
      breakType: breakDef.type,
      triggerAtMs: breakDef.triggerAtMs,
    };

    state.currentAdBreak = breakContext;
    listeners.adBreak.forEach(listener => listener(breakContext));

    const ad = await requestAd(breakContext);
    if (!ad) {
      // No fill — immediately resume content.
      state.currentAdBreak = null;
      transitionState('CONTENT_RESUMING');
      listeners.contentResume.forEach(listener => listener());
      return;
    }

    transitionState('AD_PLAYING');

    // Track ad impression.
    void trackPetSmartAdEvent({
      eventId: breakContext.breakId,
      deliveryRequestId: ad.deliveryRequestId,
      adId: ad.id,
      eventType: 'video_start',
      userId: config.userId,
      sessionId: config.sessionId,
      metadata: { breakType: breakContext.breakType },
    });
  }

  return {
    get state() {
      return state.state;
    },
    get currentAdBreak() {
      return state.currentAdBreak;
    },
    get currentAd() {
      return state.currentAd;
    },

    onStateChange(listener: (state: PlayerState) => void) {
      listeners.stateChange.add(listener);
      return () => listeners.stateChange.delete(listener);
    },

    onAdBreak(listener: (context: AdBreakContext) => void) {
      listeners.adBreak.add(listener);
      return () => listeners.adBreak.delete(listener);
    },

    onAdLoaded(listener: (ad: Ad) => void) {
      listeners.adLoaded.add(listener);
      return () => listeners.adLoaded.delete(listener);
    },

    onAdCompleted(listener: () => void) {
      listeners.adCompleted.add(listener);
      return () => listeners.adCompleted.delete(listener);
    },

    onContentResume(listener: () => void) {
      listeners.contentResume.add(listener);
      return () => listeners.contentResume.delete(listener);
    },

    async handleTimeUpdate(currentTimeMs: number) {
      state.currentTimeMs = currentTimeMs;

      // Check if we're not in an ad and there are breaks to fire.
      const isInAd = state.state === 'AD_PLAYING' || state.state === 'AD_LOADING' || state.state === 'AD_COMPLETED';
      if (!isInAd) {
        const breaksToFire = getBreaksToFire(
          currentTimeMs,
          state.adBreaks,
          state.servedBreakIds,
          state.previousTimeMs,
        );

        for (const breakDef of breaksToFire) {
          state.servedBreakIds.add(breakDef.id);
          await fireAdBreak(breakDef);
          // If we fired an ad, stop checking for more breaks in this update.
          const nowInAd = state.state === 'AD_PLAYING' || state.state === 'AD_LOADING';
          if (nowInAd) {
            break;
          }
        }
      }

      state.previousTimeMs = currentTimeMs;
    },

    handlePause() {
      if (state.state === 'CONTENT_PLAYING') {
        transitionState('CONTENT_PAUSED');
      }
    },

    handlePlay() {
      if (state.state === 'CONTENT_PAUSED') {
        transitionState('CONTENT_PLAYING');
      }
      if (state.state === 'CONTENT_RESUMING') {
        transitionState('CONTENT_PLAYING');
      }
    },

    handleSeeked(newTimeMs: number) {
      // Seek resets the break state for a clean break detection on the new position.
      // Don't reset servedBreakIds; seeking backward shouldn't re-fire a break.
      state.previousTimeMs = newTimeMs;
      state.currentTimeMs = newTimeMs;
    },

    completeCurrentAd() {
      if (state.currentAd && state.currentAdBreak) {
        void trackPetSmartAdEvent({
          eventId: `${state.currentAdBreak.breakId}_complete`,
          deliveryRequestId: state.currentAd.deliveryRequestId,
          adId: state.currentAd.id,
          eventType: 'video_complete',
          userId: config.userId,
          sessionId: config.sessionId,
          metadata: { breakType: state.currentAdBreak.breakType },
        });
      }

      state.currentAd = null;
      state.currentAdBreak = null;
      transitionState('CONTENT_RESUMING');
      listeners.adCompleted.forEach(listener => listener());
      listeners.contentResume.forEach(listener => listener());
    },

    skipCurrentAd() {
      state.currentAd = null;
      state.currentAdBreak = null;
      transitionState('CONTENT_RESUMING');
      listeners.contentResume.forEach(listener => listener());
    },

    cancelCurrentAd() {
      state.currentAd = null;
      state.currentAdBreak = null;
      transitionState('CONTENT_RESUMING');
      listeners.contentResume.forEach(listener => listener());
    },

    dispose() {
      listeners.stateChange.clear();
      listeners.adBreak.clear();
      listeners.adLoaded.clear();
      listeners.adCompleted.clear();
      listeners.contentResume.clear();
    },
  };
}
