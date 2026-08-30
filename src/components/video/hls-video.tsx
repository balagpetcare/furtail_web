"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { getMediaUrl } from "@/lib/media";

const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

/** Shape of hls.js's error event data (fields we consume). */
type HlsErrorEvent = {
  type?: string;
  details?: string;
  fatal?: boolean;
};

function devLog(tag: string, payload: Record<string, unknown>) {
  if (isDev) {
    console.log(tag, payload);
  }
}

/**
 * Imperative handle for the player's custom controls. HLS quality
 * switching is only possible through hls.js (or Safari's native HLS,
 * which doesn't expose a JS API for it), so `getLevels()` returns `null`
 * when quality control isn't available — the UI then shows "Auto" only.
 */
export interface HlsVideoHandle {
  /** Apply a playback speed (0.25..2). Also syncs hls.js playingRate. */
  setPlaybackRate(rate: number): void;
  /** Available HLS quality levels (highest-first, index 0 = Auto). Null
   * when running native HLS or MP4 fallback (no quality switching). */
  getLevels(): { index: number; height: number; label: string }[] | null;
  /** Select a quality level (0 = Auto). No-op for native/MP4. */
  setLevel(level: number | "auto"): void;
}

/**
 * HLS video player with automatic fallback.
 *
 * Behavior:
 *  - Safari/macOS (and anything with native HLS) plays the HLS URL directly.
 *  - Browsers without native HLS (Firefox, Chrome desktop, etc.) use hls.js.
 *  - `src` may be a relative backend path (`/api/v1/media/...`) — it is
 *    resolved to an absolute URL with getMediaUrl().
 *  - Recoverable hls.js errors (network/media) trigger recovery instead of
 *    an infinite reload loop; only fatal errors surface the failure UI.
 *  - The Hls instance is destroyed on unmount / source change.
 *  - Quality + playback-rate control exposed via the imperative `ref`
 *    (used by FurtailVideoPlayer's settings menu).
 */
export const HlsVideo = forwardRef<HlsVideoHandle, HlsVideoProps>(function HlsVideo(
  {
    src,
    fallbackSrc,
    poster,
    className,
    controls = true,
    autoPlay = false,
    muted = false,
    playsInline = true,
    preload = "metadata",
    onError,
    externalRef,
    captionSrc,
    captionDefault,
    ariaLabel,
  }: HlsVideoProps,
  ref,
) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalRef;
  const hlsRef = useRef<Hls | null>(null);
  const levelsRef = useRef<{ index: number; height: number; label: string }[] | null>(null);
  const recoverAttemptsRef = useRef(0);
  const [error, setError] = useState(false);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);

  const hlsSource = src ? getMediaUrl(src) : undefined;
  const rawSource = fallbackSrc ? getMediaUrl(fallbackSrc) : undefined;
  const playableSource = hlsSource || rawSource || undefined;
  const isHls = hlsSource && /\.m3u8($|\?)/i.test(hlsSource) ? hlsSource : undefined;

  useImperativeHandle(
    ref,
    () => ({
      setPlaybackRate(rate: number) {
        const video = videoRef.current;
        if (video) video.playbackRate = rate;
      },
      getLevels() {
        return levelsRef.current;
      },
      setLevel(level: number | "auto") {
        const hls = hlsRef.current;
        if (!hls) return;
        if (level === "auto") {
          hls.currentLevel = -1;
          hls.autoLevelCapping = -1;
        } else if (typeof level === "number" && level >= 0 && level < hls.levels.length) {
          hls.autoLevelCapping = level;
          hls.currentLevel = level;
        }
      },
    }),
    [videoRef],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(false);
    setErrorLabel(null);
    recoverAttemptsRef.current = 0;
    levelsRef.current = null;

    devLog("HLS_VIDEO_MOUNT", { src, hlsSource, fallbackUrl: rawSource, isHls: Boolean(isHls) });

    if (!isHls || !playableSource) {
      if (playableSource) {
        video.src = playableSource;
      }
      return;
    }

    const canPlayNative = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (canPlayNative) {
      devLog("HLS_VIDEO_NATIVE", { hlsSource });
      video.src = isHls;
      return;
    }

    let hls: Hls | null = null;

    const cleanup = () => {
      if (hls) {
        try {
          hls.destroy();
        } catch {
          /* ignore */
        }
      }
      hls = null;
      hlsRef.current = null;
    };

    const handleFatal = (label: string) => {
      setErrorLabel(label);
      setError(true);
      onError?.();
    };

    try {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          devLog("HLS_MEDIA_ATTACHED", { hlsSource });
          hls?.loadSource(isHls!);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          devLog("HLS_MANIFEST_PARSED", { hlsSource, levels: hls?.levels?.length });
          recoverAttemptsRef.current = 0;
          if (hls && hls.levels && hls.levels.length > 1) {
            levelsRef.current = [...hls.levels]
              .map((level, index) => ({
                index,
                height: level.height || 0,
                label: level.height ? `${level.height}p` : `Quality ${index}`,
              }))
              .sort((a, b) => b.height - a.height);
          } else {
            levelsRef.current = null;
          }
          if (autoPlay) {
            video
              .play()
              .then(() => {
                /* playing */
              })
              .catch(() => {
                /* autoplay blocked */
              });
          }
        });
        hls.on(Hls.Events.ERROR, (_evt: unknown, data: HlsErrorEvent) => {
          const { type, details, fatal } = data ?? {};
          devLog("HLS_ERROR", { hlsSource, type, details, fatal });
          if (!fatal) return;
          if (type === "networkError" && recoverAttemptsRef.current < 2) {
            recoverAttemptsRef.current += 1;
            hls?.startLoad();
            return;
          }
          if (type === "mediaError" && recoverAttemptsRef.current < 2) {
            recoverAttemptsRef.current += 1;
            hls?.recoverMediaError();
            return;
          }
          handleFatal("HLS playback failed");
        });
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else if (rawSource) {
        video.src = rawSource;
      } else {
        handleFatal("HLS not supported");
      }
    } catch (err) {
      devLog("HLS_VIDEO_SETUP_ERROR", { error: String(err) });
      if (rawSource) {
        video.src = rawSource;
      } else {
        handleFatal("HLS init failed");
      }
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHls, playableSource, rawSource, autoPlay]);

  const nativeError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    devLog("HLS_VIDEO_NATIVE_ERROR", {
      code: el.error?.code,
      message: el.error?.message,
      networkState: el.networkState,
      readyState: el.readyState,
    });
    setError(true);
    setErrorLabel("Video couldn't be loaded");
    onError?.();
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 min-h-[120px]">
        <span className="text-sm">{errorLabel || "Video couldn't be loaded"}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      poster={poster || undefined}
      aria-label={ariaLabel}
      onError={nativeError}
    >
      {captionSrc ? (
        <track
          key={captionDefault ? "on" : "off"}
          kind="captions"
          src={captionSrc}
          srcLang="en"
          label="Captions"
          default={captionDefault ?? false}
        />
      ) : null}
    </video>
  );
});

export interface HlsVideoProps {
  src?: string | null;
  fallbackSrc?: string | null;
  poster?: string | null;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  onError?: () => void;
  /** Optional external ref to the underlying <video> element. When
   * provided the caller can imperatively control playback. When omitted
   * an internal ref is used. */
  externalRef?: React.RefObject<HTMLVideoElement | null>;
  /** Optional WebVTT captions file. When present a <track kind="captions">
   * is attached and the player's captions control can toggle it. */
  captionSrc?: string | null;
  /** Whether the captions track should be shown by default. Re-keyed so the
   * track is re-created on toggle (reliable cross-browser), rather than the
   * player mutating textTracks directly. */
  captionDefault?: boolean;
  /** Accessible name for the <video> element. */
  ariaLabel?: string;
}
