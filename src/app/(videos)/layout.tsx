import React from "react";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

/**
 * Immersive layout for the Videos detail route (`/videos/[id]`) —
 * deliberately bypasses `AppShell` (no Header/Sidebars/BottomNav) so
 * the video gets the full viewport, mirroring the `(post)` route
 * group's approach for `/post/[id]`. Route groups don't appear in
 * the URL, so `/videos/[id]` is unchanged.
 */
export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
