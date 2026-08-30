"use client";

import React, { useEffect, useState, useRef } from "react";
import { Play, X, Volume2, VolumeX } from "lucide-react";
import type { Ad, PlayerState, AdBreakContext } from "@/lib/video/video-ad-player";

interface VideoAdOverlayProps {
  playerState: PlayerState;
  currentAd: Ad | null;
  currentAdBreak: AdBreakContext | null;
  onAdComplete: () => void;
  onAdSkip: () => void;
  onCTAClick?: () => void;
  showSkipButton?: boolean;
  skipButtonDelayMs?: number;
}

/**
 * Overlay UI for playing video ads within the player.
 * Displays the ad video, CTA button, and skip button (if applicable).
 *
 * Responsibilities:
 *  - Render ad video (from creative.videoUrl)
 *  - Show ad metadata (headline, body)
 *  - Render CTA button with link to destinationUrl
 *  - Show skip button after delay (for skippable ads)
 *  - Track mute state within the ad context
 *  - Signal completion to the parent player when ad finishes
 */
export const VideoAdOverlay = React.forwardRef<
  HTMLVideoElement,
  VideoAdOverlayProps
>(function VideoAdOverlay(
  {
    playerState,
    currentAd,
    currentAdBreak,
    onAdComplete,
    onAdSkip,
    onCTAClick,
    showSkipButton = true,
    skipButtonDelayMs = 5000,
  },
  externalRef,
) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef || internalRef;
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show ad video only when in AD_PLAYING state and we have an ad.
  const isLoading = playerState === "AD_LOADING";
  const isPlaying = playerState === "AD_PLAYING" && currentAd;
  const shouldShowAd = isPlaying || isLoading;

  useEffect(() => {
    // Reset skip state when a new ad loads.
    setCanSkip(false);
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
    }

    if (isPlaying && showSkipButton) {
      skipTimerRef.current = setTimeout(() => {
        setCanSkip(true);
      }, skipButtonDelayMs);
    }

    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
      }
    };
  }, [isPlaying, showSkipButton, skipButtonDelayMs]);

  useEffect(() => {
    if (videoRef instanceof Function) return;
    const video = videoRef?.current;
    if (!video || !isPlaying) return;

    const handleEnded = () => {
      onAdComplete();
    };

    const handleError = () => {
      console.error("[VideoAdOverlay] Ad video playback error");
      onAdComplete();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    // Autoplay ad video.
    video
      .play()
      .catch((err) => {
        console.warn("[VideoAdOverlay] Ad autoplay blocked or failed:", err);
      });

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [isPlaying, onAdComplete, videoRef]);

  if (!shouldShowAd || !currentAd) {
    return null;
  }

  const handleCTAClick = () => {
    if (currentAd.destinationUrl) {
      window.open(currentAd.destinationUrl, "_blank");
    }
    onCTAClick?.();
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-black rounded-lg overflow-hidden">
      {/* Ad Video */}
      <video
        ref={videoRef instanceof Function ? undefined : videoRef}
        src={currentAd.creative.videoUrl}
        className="w-full h-full object-cover"
        controls={false}
        muted={isMuted}
      />

      {/* Ad Overlay Controls */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none">
        {/* Top: Close/Mute Controls */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="text-white text-xs font-semibold px-2 py-1 bg-black/50 rounded">
            {currentAdBreak?.breakType === "PRE_ROLL"
              ? "Pre-Roll Ad"
              : currentAdBreak?.breakType === "MID_ROLL"
                ? "Mid-Roll Ad"
                : "Post-Roll Ad"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom: Ad Info & CTA */}
        <div className="space-y-3 pointer-events-auto">
          {currentAd.creative.headline && (
            <div className="text-white font-semibold text-sm">
              {currentAd.creative.headline}
            </div>
          )}
          {currentAd.creative.body && (
            <div className="text-white text-xs opacity-90">
              {currentAd.creative.body}
            </div>
          )}
          <div className="flex gap-2">
            {currentAd.ctaText && currentAd.destinationUrl && (
              <button
                onClick={handleCTAClick}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3" />
                {currentAd.ctaText}
              </button>
            )}
            {canSkip && (
              <button
                onClick={onAdSkip}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator for AD_LOADING state */}
      {playerState === "AD_LOADING" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
});

VideoAdOverlay.displayName = "VideoAdOverlay";
