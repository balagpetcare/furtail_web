"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { VideosScroller } from "@/components/video/videos-scroller";
import { LoadingSkeleton } from "@/components/ui/design-system";
import { fetchApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ui/design-system";

const PAGE_SIZE = 12;
const MAX_DEEP_LINK_PAGES = 10;

/**
 * Immersive video viewer — deep-link (`/videos/[id]`) into the shared
 * videos feed. Fetches the cursor-paginated eligible-videos feed, finds
 * the requested post's index (fetching more pages until found), and
 * renders `VideosScroller` starting there. Navigating between videos uses
 * `router.replace` (via `onIndexChange`) so Browser Back returns to the
 * previous Home/feed position in one step, not one step per video.
 */
export default function VideoViewerPage() {
  const params = useParams();
  const router = useRouter();
  const requestedId = String(params.id ?? "");

  // Capture the deep-link target once (first mount). The scroller drives
  // subsequent URL changes, so we never reset to this after navigation.
  const targetIdRef = useRef<string>(requestedId);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const pagesFetchedRef = useRef(0);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: postsKeys.videos({ sort: "recent" }),
      queryFn: ({ pageParam }) =>
        postsApi.getEligibleVideosFeed({ cursor: pageParam as string | undefined, limit: PAGE_SIZE }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const videos = React.useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // Resolve the deep-link target: fetch pages until the id is found (or a
  // bounded number of pages have been fetched, at which point we start at
  // the beginning rather than leaving the viewer stuck on a loader).
  useEffect(() => {
    if (startIndex !== null) return;
    if (!targetIdRef.current) return;
    const idx = videos.findIndex((p) => String(p.id) === targetIdRef.current);
    if (idx >= 0) {
      setStartIndex(idx);
      return;
    }
    if (hasNextPage && !isFetchingNextPage && pagesFetchedRef.current < MAX_DEEP_LINK_PAGES) {
      pagesFetchedRef.current += 1;
      void fetchNextPage();
      return;
    }
    // Not found within the fetched window — fall back to the first video.
    setStartIndex(videos.length > 0 ? 0 : -1);
  }, [videos, hasNextPage, isFetchingNextPage, fetchNextPage, startIndex]);

  const { data: me } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number }>("/user/me").catch(() => undefined),
  });

  if (isLoading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError && videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <ErrorState
          title="Failed to load videos"
          description="There was a problem loading this video. It might have been deleted."
        />
      </div>
    );
  }

  if (startIndex === null || videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <VideosScroller
      videos={videos}
      initialIndex={Math.min(Math.max(startIndex, 0), videos.length - 1)}
      onIndexChange={(id) => {
        // Sync the URL without pushing history — Back returns to Home/feed.
        const next = String(id);
        if (next !== params.id) router.replace(`/videos/${next}`, { scroll: false });
      }}
      onFetchMore={() => void fetchNextPage()}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      meId={me?.id}
    />
  );
}
