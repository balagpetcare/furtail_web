"use client";

import { postsApi } from "@/lib/api/posts";

/**
 * Watch-analytics event tracking for video playback — the client half of
 * `POST /api/v1/videos/:id/events`.
 *
 * Design goals (Phase 4):
 *  - No event spam: each event type fires at most once per watch *session*,
 *    and sessions flush through a short debounce so a fast watch of a short
 *    clip produces one batched network call, not N.
 *  - Server-side idempotency: the backend's `@@unique([sessionId,
 *    eventType])` constraint silently drops any duplicate we do send, so a
 *    retried request can never double-count.
 *  - Replay = a fresh session: when a video ends and is watched again, a new
 *    session id is minted so the replay's own `replay` + `start` + milestone
 *    events aren't discarded by that same idempotency constraint. This gives
 *    the future ranking engine a clean per-view event stream (watch time,
 *    completion, replays all derivable without heuristics).
 *  - Errors are swallowed: analytics are best-effort and must never throw,
 *    navigate, or otherwise disturb playback.
 *
 * Events carry `postId` (via the URL), `sessionId`, `eventType`,
 * `positionMs`, and an optional opaque `value` (quality label /
 * not-interested reason) — sufficient IDs for post/user-level ranking.
 */

export type WatchEventType =
  | "impression"
  | "start"
  | "progress_3s"
  | "progress_10s"
  | "progress_25"
  | "progress_50"
  | "progress_75"
  | "complete"
  | "replay"
  | "quality_change"
  | "not_interested";

interface PendingEvent {
  eventType: WatchEventType;
  positionMs?: number;
  value?: string;
}

/** Network transport for a batched batch of engagement events. Injected so
 * the state machine is testable without mocking modules; defaults to the
 * real API call. */
type IngestTransport = (
  postId: number | string,
  sessionId: string,
  events: PendingEvent[],
) => Promise<unknown>;

const defaultTransport: IngestTransport = (postId, sessionId, events) =>
  postsApi.ingestVideoEngagementEvents(postId, sessionId, events);

interface WatchSessionHandle {
  markVisible(): void;
  onPlay(): void;
  onProgress(currentMs: number, durationMs: number): void;
  onEnded(): void;
  onReplay(): void;
  qualityChange(value: string): void;
  notInterested(value?: string): void;
  dispose(): void;
}

const FLUSH_DEBOUNCE_MS = 1200;
const NOOP_SESSION: WatchSessionHandle = {
  markVisible: () => {},
  onPlay: () => {},
  onProgress: () => {},
  onEnded: () => {},
  onReplay: () => {},
  qualityChange: () => {},
  notInterested: () => {},
  dispose: () => {},
};

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** One event stream (one sessionId). Emits each type at most once. */
function createInnerSession(
  postId: number | string,
  transport: IngestTransport,
  firstEvent?: { type: WatchEventType; value?: string },
) {
  const emitted = new Set<WatchEventType>();
  let pending: PendingEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let visible = false;
  let started = false;
  let ended = false;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (disposed || pending.length === 0) return;
    const events = pending;
    pending = [];
    // Fire-and-forget: analytics must never throw or redirect playback.
    transport(postId, sessionId, events).catch(() => {});
  };

  const scheduleFlush = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_DEBOUNCE_MS);
  };

  const emit = (eventType: WatchEventType, opts?: { positionMs?: number; value?: string }) => {
    if (disposed || emitted.has(eventType)) return;
    emitted.add(eventType);
    pending.push({ eventType, positionMs: opts?.positionMs, value: opts?.value });
    scheduleFlush();
  };

  const sessionId = makeSessionId();
  if (firstEvent) emit(firstEvent.type, { value: firstEvent.value });

  return {
    markVisible() {
      if (visible) return;
      visible = true;
      emit("impression");
    },
    onPlay() {
      if (ended) return; // replay is routed through onReplay by the player
      if (started) return;
      started = true;
      emit("start");
    },
    onProgress(currentMs: number, durationMs: number) {
      if (disposed || !started || ended) return;
      if (durationMs <= 0 || !Number.isFinite(durationMs)) return;
      const positionMs = Math.round(Math.max(0, Math.min(currentMs, durationMs)));
      if (currentMs >= 3000) emit("progress_3s", { positionMs });
      if (currentMs >= 10000) emit("progress_10s", { positionMs });
      const pct = (currentMs / durationMs) * 100;
      if (pct >= 25) emit("progress_25", { positionMs });
      if (pct >= 50) emit("progress_50", { positionMs });
      if (pct >= 75) emit("progress_75", { positionMs });
    },
    onEnded() {
      if (ended || disposed) return;
      ended = true;
      emit("complete");
      // Complete is terminal for this watch — flush immediately so the
      // trailing milestones + complete arrive together, promptly.
      flush();
    },
    qualityChange(value: string) {
      emit("quality_change", { value: String(value).slice(0, 120) });
    },
    notInterested(value?: string) {
      emit("not_interested", { value: value ? String(value).slice(0, 120) : undefined });
      flush();
    },
    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // Flush any buffered events BEFORE marking disposed — otherwise the
      // disposed guard inside flush() would silently drop the tail of the
      // stream (e.g. a fast watch whose debounce never fired).
      flush();
      disposed = true;
    },
  };
}

export type WatchSession = WatchSessionHandle;

/**
 * Creates a session whose identity is stable across replays while the
 * underlying event stream rotates. Without this wrapper, callers would need
 * to re-query a mutable "current session" after every `ended` event; with it,
 * the player simply keeps calling the same handle.
 */
export function createWatchSession(
  postId: number | string,
  transport: IngestTransport = defaultTransport,
): WatchSession {
  if (postId === undefined || postId === null || postId === "") {
    return NOOP_SESSION;
  }
  let inner = createInnerSession(postId, transport);
  return {
    markVisible: () => inner.markVisible(),
    onPlay: () => inner.onPlay(),
    onProgress: (c, d) => inner.onProgress(c, d),
    onEnded: () => inner.onEnded(),
    onReplay: () => {
      // A replay is a brand-new watch: new sessionId so the replay's own
      // milestone events aren't dropped by the (sessionId, eventType)
      // uniqueness constraint. The fresh stream's first event is `replay`
      // (with `start` following on play) so the ranking engine can count
      // replays directly and derive per-view watch time/completion.
      inner.dispose();
      inner = createInnerSession(postId, transport, { type: "replay" });
    },
    qualityChange: (v) => inner.qualityChange(v),
    notInterested: (v) => inner.notInterested(v),
    dispose: () => inner.dispose(),
  };
}

/**
 * One-off negative-feedback signal for surfaces without a live player (e.g.
 * a social overlay rail). Mints its own session so it is always accepted by
 * the idempotency constraint, regardless of what any player emitted.
 */
export function trackNotInterested(
  postId: number | string,
  value?: string,
  transport: IngestTransport = defaultTransport,
): void {
  if (postId === undefined || postId === null || postId === "") return;
  createWatchSession(postId, transport).notInterested(value);
}