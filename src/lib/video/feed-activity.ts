"use client";

/**
 * Module-level registry that enforces "only one feed video plays at a
 * time." Every inline feed player registers itself when it starts
 * autoplaying and unregisters when it leaves the viewport (or unmounts).
 *
 * Because this is a module singleton (not React state), any number of
 * FeedCard instances can coordinate without any shared component tree or
 * context — the moment video B becomes visible and plays, video A's pause
 * is triggered imperatively. This is deliberately lightweight: it holds a
 * single reference to the currently-active player's pause callback.
 */

type ActivePlayer = {
  /** Unique key for the owning media (used to avoid self-pausing). */
  key: string;
  pause: () => void;
};

let active: ActivePlayer | null = null;

/**
 * Register `player` as the active feed player, pausing whichever player
 * was active before it (unless it's the same one). Returns a release
 * function the caller should invoke on leave-viewport/unmount.
 */
export function activateFeedPlayer(key: string, pause: () => void): () => void {
  if (active && active.key !== key) {
    // Pause the previously-active video so only this one plays.
    try {
      active.pause();
    } catch {
      // ignore — the other element may already be gone
    }
  }
  active = { key, pause };
  return () => {
    if (active?.key === key) active = null;
  };
}

/**
 * Pause whatever feed player is currently active (used by the "videos"
 * scroller so that entering a dedicated viewer doesn't leave a Home feed
 * video running underneath).
 */
export function pauseActiveFeedPlayer(): void {
  if (active) {
    try {
      active.pause();
    } catch {
      // ignore
    }
    active = null;
  }
}
