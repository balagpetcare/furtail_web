/**
 * Small shared mechanism for two related "return to where I was" concerns:
 *
 * 1. Knowing whether the Close (×) button on a page like `/post/[id]` can
 *    safely call `router.back()` — vs. having to fall back to a known-good
 *    route (Home) because the user landed directly on this URL (typed it,
 *    pasted a share link, opened in a new tab) with no real app history to
 *    go back to. `window.history.length` alone is unreliable (browsers
 *    seed it with pre-existing entries), so `AppShell` marks a
 *    session-scoped flag the moment any real in-app page mounts; the
 *    Close button only trusts `router.back()` if that flag is present.
 *
 * 2. Saving/restoring scroll position across a feed → detail → back trip.
 *    Next.js App Router's built-in scroll restoration is not reliable here
 *    because the feed re-fetches and re-renders asynchronously on
 *    remount, so the browser's automatic restore can land before the
 *    content (and its height) exists. Instead, the origin page
 *    continuously persists its own scroll position (there's no reliable
 *    "before navigate" hook for client components in the App Router), and
 *    restores it once, after its content is ready, consuming (deleting)
 *    the saved value so it never applies to a later, unrelated visit.
 *
 * sessionStorage (not localStorage) deliberately — this is single-tab,
 * single-session state, not something that should persist across browser
 * restarts or leak between tabs.
 */

const APP_VISITED_KEY = "furtail:hasAppHistory";
const SCROLL_KEY_PREFIX = "furtail:scroll:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function markAppVisited(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(APP_VISITED_KEY, "1");
  } catch {
    // sessionStorage can throw in locked-down/private-browsing contexts — safe to ignore, it only degrades the Close button's fallback heuristic.
  }
}

/** Whether this tab has rendered a real in-app page before now — the signal the Close button uses to decide whether `router.back()` is safe. */
export function hasInternalAppHistory(): boolean {
  if (!isBrowser()) return false;
  try {
    return sessionStorage.getItem(APP_VISITED_KEY) === "1" && window.history.length > 1;
  } catch {
    return false;
  }
}

function scrollKey(routeKey: string): string {
  return `${SCROLL_KEY_PREFIX}${routeKey}`;
}

export function saveScrollPosition(routeKey: string, y: number): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(scrollKey(routeKey), String(Math.round(y)));
  } catch {
    // Non-fatal — worst case, restoration is skipped next time.
  }
}

/** Reads and clears the saved position in one step — a restoration is only ever consumed once. */
export function consumeScrollPosition(routeKey: string): number | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(scrollKey(routeKey));
    if (raw === null) return null;
    sessionStorage.removeItem(scrollKey(routeKey));
    const y = Number(raw);
    return Number.isFinite(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}
