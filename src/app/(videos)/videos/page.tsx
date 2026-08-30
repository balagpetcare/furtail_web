"use client";

import React, { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { LoadingSkeleton } from "@/components/ui/design-system";
import { Clapperboard } from "lucide-react";

const PAGE_SIZE = 12;

/**
 * `/videos` — entry into the immersive Reels-style viewer. Loads the
 * eligible-videos feed and immediately redirects (router.replace) to the
 * first video's `/videos/[id]` deep link, which owns the full immersive
 * experience. Keeping the viewer on `/videos/[id]` means Back from any
 * video returns to the previous Home/feed position naturally.
 */
export default function VideosPage() {
  const router = useRouter();

  const { data } = useInfiniteQuery({
    queryKey: postsKeys.videos({ sort: "recent" }),
    queryFn: ({ pageParam }) =>
      postsApi.getEligibleVideosFeed({ cursor: pageParam as string | undefined, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const videos = React.useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  useEffect(() => {
    if (videos.length > 0) {
      const first = videos[0];
      router.replace(`/videos/${first.id}`, { scroll: false });
    }
  }, [videos, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-white/70">
        <Clapperboard className="w-6 h-6" />
        <span className="text-sm font-medium">Loading videos…</span>
      </div>
      <div className="w-full max-w-md">
        <LoadingSkeleton />
      </div>
    </div>
  );
}
