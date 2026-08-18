import React from "react";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

/**
 * Deliberately bypasses `AppShell` (no LeftSidebar/RightSidebar/bottom
 * nav) — a separate top-level route group from `(app)`, not a variant of
 * it, so the Single Post page (`/post/[id]`) gets the full viewport
 * instead of the app's fixed sidebar columns. Route groups don't appear
 * in the URL, so this doesn't change the `/post/[id]` path at all, and
 * `AppShell`'s "has the user seen a real in-app page" marker (see
 * return-navigation.ts) is exactly what tells them apart: pages under
 * `(app)` set it, this one deliberately doesn't.
 */
export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
