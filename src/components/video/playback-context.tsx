"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * Shared video playback preferences — persists across all
 * FurtailVideoPlayer instances and page navigations so that a user's
 * mute/volume choice in one surface (e.g. the Videos scroll-feed)
 * carries over to every other (feed cards, single-post detail).
 *
 * Persisted to localStorage so the preference survives sessions.
 */

type VideoPlaybackPrefs = {
  /** When true, all new players start muted (browser autoplay-policy
   * friendly). The Videos scroll-feed auto-plays muted; if the user
   * unmutes, subsequent videos in the feed also unmute. */
  muted: boolean;
  /** 0..1 — shared volume for every player's custom volume control. */
  volume: number;
  /** Playback speed (0.5..2) — persisted and applied to every player,
   * so a speed chosen in one surface carries to all others. */
  playbackRate: number;
  setMuted: (m: boolean) => void;
  setVolume: (v: number) => void;
  setPlaybackRate: (r: number) => void;
  toggleMuted: () => void;
};

const STORAGE_KEY = "furtail-video-prefs";
const DEFAULTS: Pick<VideoPlaybackPrefs, "muted" | "volume" | "playbackRate"> = {
  muted: true,
  volume: 1,
  playbackRate: 1,
};

const VideoPlaybackContext = createContext<VideoPlaybackPrefs | null>(null);

function loadStoredPrefs(): Pick<VideoPlaybackPrefs, "muted" | "volume" | "playbackRate"> {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULTS.muted,
      volume: typeof parsed.volume === "number" ? parsed.volume : DEFAULTS.volume,
      playbackRate:
        typeof parsed.playbackRate === "number" ? parsed.playbackRate : DEFAULTS.playbackRate,
    };
  } catch {
    return DEFAULTS;
  }
}

export function VideoPlaybackProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Pick<VideoPlaybackPrefs, "muted" | "volume" | "playbackRate">>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    return loadStoredPrefs();
  });

  const setMuted = useCallback((m: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, muted: m };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable (private mode) — in-memory is fine.
      }
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setPrefs((prev) => {
      const next = { ...prev, volume: Math.max(0, Math.min(1, v)) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setPlaybackRate = useCallback((r: number) => {
    setPrefs((prev) => {
      const next = { ...prev, playbackRate: Math.max(0.25, Math.min(2, r)) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted(!prefs.muted);
  }, [prefs.muted, setMuted]);

  const value: VideoPlaybackPrefs = {
    ...prefs,
    setMuted,
    setVolume,
    setPlaybackRate,
    toggleMuted,
  };

  return <VideoPlaybackContext.Provider value={value}>{children}</VideoPlaybackContext.Provider>;
}

export function useVideoPlayback(): VideoPlaybackPrefs {
  const ctx = useContext(VideoPlaybackContext);
  if (!ctx) {
    // Fallback when no provider is in the tree (e.g. during SSR or in
    // a component rendered outside the app shell). Returns safe
    // defaults with no-op setters so consumers never crash.
    return {
      ...DEFAULTS,
      setMuted: () => {},
      setVolume: () => {},
      setPlaybackRate: () => {},
      toggleMuted: () => {},
    };
  }
  return ctx;
}
