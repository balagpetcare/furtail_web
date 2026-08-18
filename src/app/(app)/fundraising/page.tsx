"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fundraisingApi, fundraisingKeys } from "@/lib/api/fundraising";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl } from "@/lib/media";
import Link from "next/link";

export default function FundraisingPage() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: fundraisingKeys.feed(),
    queryFn: ({ pageParam }) => fundraisingApi.getFeed(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const campaigns = data?.pages.flatMap(page => page.items || []) || [];

  return (
    <div className="py-6 px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fundraising</h1>
          <p className="text-gray-500 text-sm mt-1">Help pets in need across the community.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/fundraising/my">
            <Button variant="outline" className="rounded-full">My Campaigns</Button>
          </Link>
          <Link href="/fundraising/create">
            <Button className="rounded-full bg-purple-600 hover:bg-purple-700">Start Campaign</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {isLoading && (
          <>
            <Skeleton className="w-full h-80 rounded-3xl" />
            <Skeleton className="w-full h-80 rounded-3xl" />
            <Skeleton className="w-full h-80 rounded-3xl" />
          </>
        )}

        {!isLoading && campaigns.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
            No active fundraising campaigns at the moment.
          </div>
        )}

        {campaigns.map((campaign: any) => {
          const progress = ((campaign.raisedMinor || 0) / (campaign.goalMinor || 1)) * 100;
          const image = campaign.coverMedia?.url || campaign.media?.[0]?.url;
          
          return (
            <Card key={campaign.id} className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm flex flex-col group">
              <Link href={`/fundraising/${campaign.id}`} className="flex-1 flex flex-col">
                <div className="h-48 overflow-hidden relative bg-gray-100">
                  {image ? (
                    <img src={getMediaUrl(image)} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-2">{campaign.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 truncate">by {campaign.owner?.displayName || 'Unknown'}</p>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-purple-600">${((campaign.raisedMinor || 0) / 100).toLocaleString()} raised</span>
                      <span className="text-gray-500">of ${((campaign.goalMinor || 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <Button className="w-full rounded-xl" variant="outline">
                      Donate Now
                    </Button>
                  </div>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>

      {hasNextPage && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading..." : "Load more campaigns"}
          </Button>
        </div>
      )}
    </div>
  );
}
