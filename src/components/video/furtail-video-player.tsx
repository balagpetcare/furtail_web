"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
  RefreshCw,
  ImageOff,
  Clapperboard,
  Captions,
  CaptionsOff,
} from "lucide-react";
import { HlsVideo, type HlsVideoHandle } from "@/components/video/hls-video";
import { useVideoPlayback } from "@/components/video/playback-context";
import { useVideoAdsWithSafety } from "@/hooks/useVideoAdsWithSafety";
import { activateFeedPlayer } from "@/lib/video/feed-activity";
import { createWatchSession, type WatchSession } from "@/lib/video/watch-analytics";
import type { VideoMedia } from "@/lib/video/types";
import { isPlayableVideo } from "@/lib/video/types";
import { cn } from "@/lib/utils";
import { VideoAdOverlay } from "@/components/video/video-ad-overlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PlayerMode = "feed" | "videos" | "single";

interface FurtailVideoPlayerProps {
  video: VideoMedia;
  mode?: PlayerMode;
  className?: string;
  /** Retry-processing callback (FAILED status). When absent the Retry
   * button is hidden. */
  onRetry?: (mediaId: number | string) => void;
  onError?: () => void;
  preload?: "none" | "metadata" | "auto";
  /** External (scroller) playback control. When provided the player
   * defers play/pause to `active` instead of running its own
   * IntersectionObserver (used by the immersive Videos scroller). */
  active?: boolean;
  /** Optional external ref to the underlying <video> element. */
  externalRef?: React.RefObject<HTMLVideoElement | null>;
  /** Feed mode: show a "Watch in Videos" overlay link. */
  showWatchInVideos?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function FurtailVideoPlayer({
  video,
  mode = "feed",
  className,
  onRetry,
  onError,
  preload,
  active,
  externalRef,
  showWatchInVideos = false,
}: FurtailVideoPlayerProps) {
  if (video.status === "PROCESSING") {
    return <ProcessingPlaceholder poster={video.posterUrl} mode={mode} className={className} />;
  }
  if (video.status === "FAILED" || !isPlayableVideo(video.status)) {
    return (
      <FailedPlaceholder
        onRetry={onRetry ? () => onRetry(video.mediaId) : undefined}
        mode={mode}
        className={className}
      />
    );
  }

  return (
    <PlayableVideo
      video={video}
      mode={mode}
      className={className}
      onError={onError}
      preload={preload}
      active={active}
      externalRef={externalRef}
      showWatchInVideos={showWatchInVideos}
    />
  );
}

// ---------------------------------------------------------------------------
// Playable video — HLS/MP4 engine + full custom controls.
// ---------------------------------------------------------------------------

function PlayableVideo({
  video,
  mode,
  className,
  onError,
  preload: preloadOverride,
  active,
  externalRef,
  showWatchInVideos,
}: {
  video: VideoMedia;
  mode: PlayerMode;
  className?: string;
  onError?: () => void;
  preload?: "none" | "metadata" | "auto";
  active?: boolean;
  externalRef?: React.RefObject<HTMLVideoElement | null>;
  showWatchInVideos?: boolean;
}) {
  const {
    muted: sharedMuted,
    volume: sharedVolume,
    playbackRate: sharedRate,
    setMuted,
    setVolume,
    setPlaybackRate,
  } = useVideoPlayback();

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalVideoRef;
  const hlsHandleRef = useRef<HlsVideoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [localError, setLocalError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState<{ index: number; height: number; label: string }[] | null>(null);
  const [quality, setQuality] = useState<number | "auto">("auto");

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseFeedRef = useRef<(() => void) | null>(null);
  const watchRef = useRef<WatchSession | null>(null);
  const endedRef = useRef(false);
  const [captionsOn, setCaptionsOn] = useState(false);

  // Initialize video ads with safety
  const {
    playerState: adPlayerState,
    currentAd,
    isAdsEnabled,
    handleTimeUpdate,
    handlePause,
    handlePlay,
    handleSeeked,
    handleAdComplete,
    handleAdSkip,
    featureConfig,
  } = useVideoAdsWithSafety({
    video,
    enabled: true,
    debug: false,
  });

  const isVideosMode = mode === "videos";
  const isExternallyControlled = active !== undefined;

  // Videos mode: portrait videos fill the frame (cover), landscape videos
  // fit within it (contain) — both preserve aspect ratio with no stretching.
  const isPortrait =
    typeof video.width === "number" &&
    typeof video.height === "number" &&
    video.height > video.width;
  const videosObjectFit = isPortrait ? "object-cover" : "object-contain";

  const defaultPreload = isVideosMode ? "auto" : "metadata";
  const preload = preloadOverride ?? defaultPreload;
  // Feed + single are muted unless the user has explicitly chosen a
  // shared (non-muted) preference; videos mode follows the shared pref.
  const muted = sharedMuted;

  const hlsSrc = video.hlsUrl ?? null;
  const fallbackSrc = video.playbackUrl;

  const key = `${mode}:${video.mediaId}`;

  // ---- Imperative playback helpers ---------------------------------------
  const pauseVideo = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const playVideo = (opts?: { force?: boolean }) => {
    const vid = videoRef.current;
    if (!vid) return;
    // Reduced motion: respect the OS setting and don't autoplay (unless
    // the user explicitly pressed play).
    if (!opts?.force && prefersReducedMotion()) return;
    const p = vid.play();
    if (p) {
      p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // ---- External (scroller) control --------------------------------------
  useEffect(() => {
    if (!isExternallyControlled) return;
    const vid = videoRef.current;
    if (!vid) return;
    if (active) {
      // The 'play'/'pause' DOM events (listened below) update isPlaying, so
      // no synchronous setState here (React Compiler-friendly).
      if (!prefersReducedMotion()) vid.play().catch(() => {});
    } else {
      vid.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isExternallyControlled]);

  // ---- Feed autoplay via IntersectionObserver + single-active registry --
  useEffect(() => {
    if (isExternallyControlled) return;
    if (mode !== "feed") return;
    const el = containerRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;

    const pause = () => {
      vid.pause();
      setIsPlaying(false);
    };
    const play = () => {
      if (prefersReducedMotion()) return;
      const p = vid.play();
      if (p) p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.intersectionRatio > 0) {
          // The video is visible — record the impression (once per session).
          watchRef.current?.markVisible();
        }
        if (entry.intersectionRatio > 0.6) {
          // Claim the "single active feed video" slot (pauses any other).
          releaseFeedRef.current?.();
          releaseFeedRef.current = activateFeedPlayer(key, pause);
          play();
        } else {
          pause();
          releaseFeedRef.current?.();
          releaseFeedRef.current = null;
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      releaseFeedRef.current?.();
      releaseFeedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isExternallyControlled, key]);

  // ---- Apply shared volume + playback rate to the element ---------------
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = muted;
    vid.volume = sharedVolume;
    vid.playbackRate = sharedRate;
    hlsHandleRef.current?.setPlaybackRate(sharedRate);
  }, [muted, sharedVolume, sharedRate, videoRef]);

  // ---- Attach time/buffering/play/pause/fullscreen listeners ------------
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onTime = () => {
      setCurrentTime(vid.currentTime);
      handleTimeUpdate(vid.currentTime * 1000);
    };
    const onDuration = () => {
      if (Number.isFinite(vid.duration)) setDuration(vid.duration);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      handlePlay();
    };
    const onPause = () => {
      setIsPlaying(false);
      handlePause();
    };
    const onPlay = () => {
      setIsPlaying(true);
      handlePlay();
    };
    const onSeeked = () => {
      handleSeeked(vid.currentTime * 1000);
    };

    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("durationchange", onDuration);
    vid.addEventListener("loadedmetadata", onDuration);
    vid.addEventListener("waiting", onWaiting);
    vid.addEventListener("playing", onPlaying);
    vid.addEventListener("canplay", onPlaying);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("play", onPlay);
    vid.addEventListener("seeked", onSeeked);

    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("durationchange", onDuration);
      vid.removeEventListener("loadedmetadata", onDuration);
      vid.removeEventListener("waiting", onWaiting);
      vid.removeEventListener("playing", onPlaying);
      vid.removeEventListener("canplay", onPlaying);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("seeked", onSeeked);
    };
  }, [videoRef, handleTimeUpdate, handlePause, handlePlay, handleSeeked]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // ---- Watch analytics: session lifecycle --------------------------------
  // A session exists for the lifetime of a playable player. Replays rotate
  // the underlying stream (see createWatchSession) so milestone events stay
  // per-view and idempotent. Errors are swallowed — analytics never disturb
  // playback.
  useEffect(() => {
    const postId = video.postId;
    if (postId === undefined || postId === null || postId === "") return;
    const session = createWatchSession(postId);
    watchRef.current = session;
    if (mode === "single") session.markVisible();
    return () => {
      session.dispose();
      if (watchRef.current === session) watchRef.current = null;
    };
  }, [mode, video.postId]);

  // Videos-scroller impression fires when the slide becomes the active one.
  useEffect(() => {
    if (mode !== "videos") return;
    if (active) watchRef.current?.markVisible();
  }, [active, mode]);

  // Playback-sourced events (start / milestones / complete / replay).
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onPlay = () => {
      if (endedRef.current) {
        endedRef.current = false;
        watchRef.current?.onReplay();
      } else {
        watchRef.current?.onPlay();
      }
    };
    const onTime = () => {
      const durationMs = Number.isFinite(vid.duration) ? vid.duration * 1000 : 0;
      watchRef.current?.onProgress(vid.currentTime * 1000, durationMs);
    };
    const onEnded = () => {
      endedRef.current = true;
      watchRef.current?.onEnded();
    };

    vid.addEventListener("play", onPlay);
    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("ended", onEnded);
    };
  }, [videoRef]);

  // ---- Control visibility (auto-hide while playing in videos mode) ------
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if ((isVideosMode || isFullscreen) && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ---- Player actions ----------------------------------------------------
  const togglePlay = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (videoRef.current?.paused) {
      playVideo({ force: true });
    } else {
      pauseVideo();
    }
  };

  const toggleMute = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMuted(!muted);
  };

  const onSeek = (value: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = value;
    setCurrentTime(value);
  };

  const onVolumeChange = (value: number) => {
    setVolume(value);
    if (value > 0 && muted) setMuted(false);
    if (value === 0 && !muted) setMuted(true);
  };

  const toggleFullscreen = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  const onRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    hlsHandleRef.current?.setPlaybackRate(rate);
  };

  const onQualityChange = (value: number | "auto") => {
    const next = value === "auto" ? "auto" : value;
    setQuality(next);
    hlsHandleRef.current?.setLevel(value);
    // Record the manual quality selection for the ranking/analytics stream.
    const label =
      value === "auto"
        ? "auto"
        : (levels?.find((l) => l.index === value)?.label ?? String(value));
    watchRef.current?.qualityChange(label);
  };

  const toggleCaptions = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCaptionsOn((prev) => !prev);
  };

  const openSettings = () => {
    setLevels(hlsHandleRef.current?.getLevels() ?? null);
    setShowControls(true);
  };

  // Keyboard shortcuts for the player region (works whenever the container
  // or anything inside it has focus; interactive elements handle their own
  // keys, so Space on a focused button still activates that button).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT" || target?.isContentEditable) {
      return;
    }
    const vid = videoRef.current;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (vid) onSeek(Math.max(0, vid.currentTime - 5));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (vid && Number.isFinite(vid.duration)) onSeek(Math.min(vid.duration, vid.currentTime + 5));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!muted && sharedVolume < 1) onVolumeChange(Math.min(1, sharedVolume + 0.1));
        break;
      case "ArrowDown":
        e.preventDefault();
        if (sharedVolume > 0) onVolumeChange(Math.max(0, sharedVolume - 0.1));
        break;
    }
  };

  if (localError) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-900/50 min-h-[120px]", className)}>
        <ImageOff className="w-8 h-8 mb-2 stroke-[1.5]" />
        <span className="text-sm">Video couldn&apos;t be loaded</span>
      </div>
    );
  }

  const effectiveVolume = muted ? 0 : sharedVolume;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-black",
        isVideosMode ? "" : "bg-black/90",
        className,
      )}
      role="group"
      aria-label="Video player"
      tabIndex={0}
      onClick={isVideosMode ? togglePlay : undefined}
      onDoubleClick={isVideosMode ? toggleFullscreen : undefined}
      onKeyDown={handleKeyDown}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isVideosMode && isPlaying && setShowControls(false)}
      onTouchStart={showControlsTemporarily}
    >
      {/* Object fit: videos/feed cover the frame; single contains (no stretch) */}
      <HlsVideo
        ref={hlsHandleRef}
        src={hlsSrc}
        fallbackSrc={fallbackSrc}
        poster={video.posterUrl}
        controls={false}
        autoPlay={false}
        muted={muted}
        playsInline
        preload={preload}
        externalRef={videoRef}
        ariaLabel="Video"
        captionSrc={video.captionUrl ?? null}
        captionDefault={captionsOn}
        onError={() => {
          setLocalError(true);
          onError?.();
        }}
        className={cn(
          "w-full h-full outline-none select-none",
          mode === "single"
            ? "max-w-full max-h-full object-contain"
            : isVideosMode
              ? videosObjectFit
              : "object-cover",
        )}
      />

      {/* Video Ad Overlay */}
      {isAdsEnabled && (
        <VideoAdOverlay
          playerState={adPlayerState}
          currentAd={currentAd}
          currentAdBreak={null}
          onAdComplete={handleAdComplete}
          onAdSkip={handleAdSkip}
          showSkipButton={featureConfig.preRollEnabled || featureConfig.midRollEnabled}
          skipButtonDelayMs={5000}
        />
      )}

      {/* Buffering indicator */}
      {isBuffering && !localError && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Buffering"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <Loader2 className="w-10 h-10 text-white animate-spin drop-shadow-lg" />
        </div>
      )}

      {/* Watch in Videos (feed mode) */}
      {mode === "feed" && showWatchInVideos && (
        <Link
          href={`/videos/${video.postId ?? video.mediaId}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 hover:bg-black/75 text-white text-xs font-semibold px-3 py-1.5 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-purple-400 cursor-pointer"
          aria-label="Watch this video in the Videos viewer"
        >
          <Clapperboard className="w-3.5 h-3.5" />
          Watch in Videos
        </Link>
      )}

      {/* Center play button (when paused) */}
      {!isPlaying && !isBuffering && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group"
        >
          <span className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors group-focus-visible:ring-2 group-focus-visible:ring-purple-400">
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 px-2.5 pt-6 pb-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} />

        <div className="flex items-center gap-1 text-white mt-1">
          <IconButton label={isPlaying ? "Pause" : "Play"} onClick={() => togglePlay()} active={isPlaying}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </IconButton>

          <span className="text-[11px] font-medium tabular-nums px-1 select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume — mute toggle + always-rendered slider (keyboard-focusable,
          no hover-only popover). */}
          <div className="flex items-center gap-1">
            <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              {muted || effectiveVolume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </IconButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={effectiveVolume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="w-16 h-1.5 accent-white cursor-pointer"
            />
          </div>

          {/* Captions (entry point — only rendered when the media actually
          carries a captions track). */}
          {video.captionUrl && (
            <IconButton
              label={captionsOn ? "Turn off captions" : "Turn on captions"}
              onClick={toggleCaptions}
              active={captionsOn}
            >
              {captionsOn ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}
            </IconButton>
          )}

          {/* Settings */}
          <DropdownMenu onOpenChange={(open) => open && openSettings()}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Settings"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-purple-400"
                >
                  <Settings className="w-5 h-5" />
                </button>
              }
            />
            <DropdownMenuContent align="end" side="top" sideOffset={8} className="bg-gray-900/95 backdrop-blur border border-white/10 text-white w-44">
              <DropdownMenuRadioGroup
                value={String(sharedRate)}
                onValueChange={(v) => onRateChange(Number(v))}
              >
                {SPEED_OPTIONS.map((s) => (
                  <DropdownMenuRadioItem
                    key={s}
                    value={String(s)}
                    className="text-sm data-[checked]:text-purple-300 focus:bg-white/10"
                  >
                    {s === 1 ? "Normal" : `${s}×`}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  Quality{quality === "auto" ? " (Auto)" : ""}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={2} className="bg-gray-900/95 backdrop-blur border border-white/10 text-white w-36">
                  <DropdownMenuRadioGroup
                    value={quality === "auto" ? "auto" : String(quality)}
                    onValueChange={(v) => onQualityChange(v === "auto" ? "auto" : Number(v))}
                  >
                    <DropdownMenuRadioItem value="auto" className="text-sm data-[checked]:text-purple-300 focus:bg-white/10">
                      Auto
                    </DropdownMenuRadioItem>
                    {(levels ?? []).map((l) => (
                      <DropdownMenuRadioItem
                        key={l.index}
                        value={String(l.index)}
                        className="text-sm data-[checked]:text-purple-300 focus:bg-white/10"
                      >
                        {l.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen */}
          <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-purple-400",
        active && "bg-white/15",
      )}
    >
      {children}
    </button>
  );
}

function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (value: number) => void;
}) {
  const max = duration > 0 && Number.isFinite(duration) ? duration : 0;
  return (
    <div className="group/seek flex items-center gap-2 px-0.5">
      <input
        type="range"
        min={0}
        max={max || 0}
        step={0.1}
        value={Math.min(currentTime, max || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={formatTime(currentTime)}
        className="block w-full h-1.5 accent-purple-500 cursor-pointer disabled:opacity-40"
        disabled={max === 0}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// ---------------------------------------------------------------------------
// Shared placeholders.
// ---------------------------------------------------------------------------

function ProcessingPlaceholder({
  poster,
  mode,
  className,
}: {
  poster?: string;
  mode: PlayerMode;
  className?: string;
}) {
  const isDark = mode === "videos" || mode === "single";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-gray-400 w-full h-full min-h-[180px] relative overflow-hidden",
        isDark ? "bg-black" : "bg-gray-50/50",
        className,
      )}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={cn("absolute inset-0 w-full h-full", isDark ? "object-contain" : "object-cover")}
        />
      )}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-1.5 rounded-lg px-4 py-2 text-sm",
          isDark ? "bg-black/40 text-gray-300" : "bg-black/40 text-white",
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing video…</span>
      </div>
    </div>
  );
}

function FailedPlaceholder({
  onRetry,
  mode,
  className,
}: {
  onRetry?: (() => void) | undefined;
  mode: PlayerMode;
  className?: string;
}) {
  const isDark = mode === "videos" || mode === "single";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-gray-400 w-full h-full min-h-[180px]",
        isDark ? "bg-black" : "bg-gray-50/50",
        className,
      )}
    >
      <ImageOff className="w-8 h-8 mb-2 stroke-[1.5]" />
      <span className="text-sm">Video failed to process</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer",
            isDark ? "text-purple-300 hover:text-purple-200" : "text-purple-600 hover:text-purple-700",
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry processing
        </button>
      )}
    </div>
  );
}
