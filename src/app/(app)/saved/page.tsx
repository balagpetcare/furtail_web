"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi, postsKeys } from "@/lib/api/posts";

export default function SavedContentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: [...postsKeys.all, "bookmarked"],
    queryFn: () => postsApi.getBookmarked(),
  });

  return (
    <div className="py-6 px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Saved</h1>
        <p className="text-gray-500">Your bookmarked posts, campaigns, and adoption listings.</p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full bg-white border border-gray-100 rounded-xl mb-6 p-1 h-auto flex">
          <TabsTrigger value="posts" className="flex-1 rounded-lg py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Posts</TabsTrigger>
          <TabsTrigger value="fundraising" className="flex-1 rounded-lg py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Fundraisers</TabsTrigger>
          <TabsTrigger value="adoption" className="flex-1 rounded-lg py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Adoptions</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-2xl" />
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center">
              Failed to load saved posts.
            </div>
          ) : !data?.data.length ? (
            <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
              You haven&apos;t saved any posts yet.
            </div>
          ) : (
            data.data.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="fundraising">
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            Saved fundraisers are coming soon.
          </div>
        </TabsContent>

        <TabsContent value="adoption">
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            Saved adoption listings are coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
