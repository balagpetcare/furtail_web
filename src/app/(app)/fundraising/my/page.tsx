"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fundraisingApi, fundraisingKeys } from "@/lib/api/fundraising";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { getMediaUrl } from "@/lib/media";

export default function MyCampaignsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: fundraisingKeys.my(),
    queryFn: fundraisingApi.getMyCampaigns,
  });

  const campaigns = data?.items ?? [];

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/fundraising" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Campaigns</h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center">
          Failed to load your campaigns.
        </div>
      )}

      {!isLoading && !error && campaigns.length === 0 && (
        <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
          You haven&apos;t started any campaigns yet.
        </div>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign: any) => {
          const image = campaign.coverMedia?.url || campaign.media?.[0]?.url;
          return (
            <Link key={campaign.id} href={`/fundraising/${campaign.id}`}>
              <Card className="p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {image && (
                    <img src={getMediaUrl(image)} alt={campaign.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{campaign.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    ${((campaign.raisedMinor || 0) / 100).toLocaleString()} raised of $
                    {((campaign.goalMinor || campaign.targetAmountMinor || 0) / 100).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700 flex-shrink-0">
                  {campaign.status}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
