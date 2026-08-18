"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { PostCard } from "@/components/post/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExplorePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: postsKeys.feed("trending"),
    queryFn: () => postsApi.getTrending(20),
  });

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Explore</h1>
        <p className="text-gray-500">Discover popular posts from the Furtail community.</p>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <>
            <Skeleton className="w-full h-64 rounded-2xl" />
            <Skeleton className="w-full h-48 rounded-2xl" />
          </>
        )}

        {error && (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center">
            Failed to load trending feed.
          </div>
        )}

        {!isLoading && !error && !data?.data.length && (
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            No trending posts in the last week yet.
          </div>
        )}

        {data?.data?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
