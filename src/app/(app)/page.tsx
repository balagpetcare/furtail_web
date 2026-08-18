"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { adoptionApi, adoptionKeys } from "@/lib/api/adoption";
import { fundraisingApi, fundraisingKeys } from "@/lib/api/fundraising";
import { PostComposer } from "@/components/post/post-composer";
import { StoryTray } from "@/components/stories/story-tray";
import { PeopleYouMayKnowRail } from "@/components/social/people-you-may-know-rail";
import { ReelsRail } from "@/components/reels/reels-rail";
import { FeedItemRenderer } from "@/components/feed/feed-item-renderer";
import { buildMixedFeed } from "@/lib/feed/build-feed";
import { TabBar, LoadingSkeleton, EmptyState, ErrorState } from "@/components/ui/design-system";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";

export default function HomeFeed() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("for-you");

  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: activeTab === "trending" ? postsKeys.feed("trending") : postsKeys.feed("for-you"),
    queryFn: () => (activeTab === "trending" ? postsApi.getTrending(10) : postsApi.getFeed({ limit: 10 })),
    retry: 1,
  });

  // Restores Home's scroll position when returning from a post opened via
  // router.push — must wait for the feed to actually have content (a
  // scrollTo against an empty/loading page would land nowhere near where
  // the user actually was). See use-scroll-restoration.ts.
  useScrollRestoration(!postsLoading);

  // Adoption/fundraising are real but separate feeds (no unified backend
  // endpoint — see docs/furtail-web-feature-matrix.md); fetched alongside
  // posts and interleaved client-side by `buildMixedFeed`. Failures here
  // degrade to "just show posts" rather than failing the whole feed.
  const { data: adoptionData } = useQuery({
    queryKey: adoptionKeys.feed({ home: true }),
    queryFn: () => adoptionApi.getFeed({ limit: 6 }),
    enabled: activeTab === "for-you",
  });

  const { data: fundraisingData } = useQuery({
    queryKey: fundraisingKeys.feed(),
    queryFn: () => fundraisingApi.getFeed(undefined, 6),
    enabled: activeTab === "for-you",
  });

  const handleRetry = () => {
    refetch();
  };

  const tabs = [
    { id: "for-you", label: "For You" },
    { id: "trending", label: "Trending" },
  ];

  const posts = postsData?.data ?? [];
  const feedItems =
    activeTab === "for-you"
      ? buildMixedFeed(posts, adoptionData?.items ?? [], fundraisingData?.items ?? [])
      : posts.map((post) => ({ kind: "post" as const, key: `post-${post.id}`, post }));

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header with Switchable Tabs */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-gray-100/70 px-4 sm:px-6 py-2 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-gray-950 tracking-tight">Home</h1>
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="border-none sticky-none relative z-10"
        />
      </header>

      <div className="py-5 space-y-5">
        <div className="px-4 sm:px-0 space-y-5">
          <PostComposer />
        </div>

        <StoryTray />

        <PeopleYouMayKnowRail />

        <ReelsRail />

        <div className="px-4 sm:px-0 space-y-5">

          <div className="space-y-0">
            {postsLoading && (
              <div className="space-y-5">
                {[1, 2].map((i) => (
                  <LoadingSkeleton key={i} />
                ))}
              </div>
            )}

            {postsError && (
              <ErrorState
                title="Failed to load feed"
                description="There was a problem loading your timeline posts."
                onRetry={handleRetry}
                isRetrying={isRefetching}
              />
            )}

            {!postsLoading && !postsError && feedItems.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title="Your feed is empty"
                description="Follow other pet lovers and share your thoughts to get started!"
                action={
                  <Button
                    onClick={() => queryClient.invalidateQueries({ queryKey: postsKeys.all })}
                    className="mx-auto rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 h-9 cursor-pointer"
                  >
                    Refresh feed
                  </Button>
                }
              />
            )}

            {!postsLoading &&
              !postsError &&
              feedItems.map((item) => <FeedItemRenderer key={item.key} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
