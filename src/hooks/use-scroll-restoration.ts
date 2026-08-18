"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { consumeScrollPosition, saveScrollPosition } from "@/lib/return-navigation";

/**
 * Restores this page's scroll position (once, after `ready` becomes true)
 * from what was saved the last time the user scrolled here, and keeps
 * saving the current position while mounted so it's fresh whenever the
 * user navigates away (e.g. opens a post). See `return-navigation.ts` for
 * why this exists instead of relying on the browser's/Next's built-in
 * scroll restoration.
 *
 * @param ready — content the user was actually looking at has rendered
 *   (e.g. the feed query is no longer loading). Restoring before this is
 *   true would scroll into an empty/short page and be immediately wrong.
 */
export function useScrollRestoration(ready: boolean) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = `${pathname}${search ? `?${search}` : ""}`;
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;
    const y = consumeScrollPosition(routeKey);
    if (y === null) return;
    // Two rAFs: one to let this render commit, one to let layout settle
    // (images/skeletons swapping for real content can still be resizing
    // on the first frame) before jumping.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
    // `restoredRef` (not the dependency array) is what prevents a later
    // `ready` flip (e.g. a background refetch) from re-triggering this.
  }, [ready, routeKey]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        saveScrollPosition(routeKey, window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [routeKey]);
}
