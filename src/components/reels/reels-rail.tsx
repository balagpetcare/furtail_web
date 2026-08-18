"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { getMediaUrl } from "@/lib/media";
import { HorizontalScroller, SectionHeader } from "@/components/ui/design-system";

/**
 * Horizontal Reels rail — real data from `GET /api/v1/posts/videos`
 * (`postsApi.getVideosFeed`, see docs/furtail-web-api-contract-map.md).
 * There's no separate "reel" entity server-side, just VIDEO/REEL-typed
 * posts, so a reel is a real Single Post page link like any other post.
 */
export function ReelsRail() {
  const { data, isLoading } = useQuery({
    queryKey: postsKeys.videos({ limit: 10 }),
    queryFn: () => postsApi.getVideosFeed({ limit: 10 }),
  });

  const reels = data ?? [];
  if (!isLoading && reels.length === 0) return null;

  return (
    <div className="mb-5 px-4 sm:px-0">
      <SectionHeader title="Reels" className="mb-3 border-none pb-0" />

      <HorizontalScroller>
        {isLoading &&
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="w-32 shrink-0 snap-start rounded-2xl bg-gray-100 animate-pulse aspect-[9/16]" />
          ))}

        {reels.map((post) => {
          const media = post.media?.[0];
          const thumbUrl = media ? getMediaUrl(media.url) : undefined;
          return (
            <Link
              key={post.id}
              href={`/post/${post.publicId ?? post.id}`}
              className="w-32 shrink-0 snap-start relative rounded-2xl overflow-hidden bg-gray-900 aspect-[9/16] group cursor-pointer text-left block focus-visible:outline-2 focus-visible:outline-purple-500 focus-visible:outline-offset-2"
            >
              {thumbUrl ? (
                media?.type?.startsWith("video") ? (
                  <video src={thumbUrl} className="w-full h-full object-cover" muted preload="metadata" />
                ) : (
                  <img src={thumbUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No preview</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white" />
              </div>
              {post.caption && (
                <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium line-clamp-2">
                  {post.caption}
                </p>
              )}
            </Link>
          );
        })}
      </HorizontalScroller>
    </div>
  );
}
