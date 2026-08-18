"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useSuggestions } from "@/hooks/use-suggestions";
import { getMediaUrl } from "@/lib/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RelationshipButton } from "@/components/social/relationship-button";
import { HorizontalScroller, SectionHeader } from "@/components/ui/design-system";

/**
 * Horizontal "People You May Know" rail for Home — same real data
 * (`/social/discovery/suggestions`) and the same `RelationshipButton`
 * action component as `RightSidebar`'s vertical list, via `useSuggestions`.
 */
export function PeopleYouMayKnowRail() {
  const { suggestions, isLoading, dismiss } = useSuggestions();

  if (!isLoading && suggestions.length === 0) return null;

  return (
    <div className="mb-5 px-4 sm:px-0">
      <SectionHeader
        title="People You May Know"
        action={
          <Link href="/people" className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline">
            See all
          </Link>
        }
        className="mb-3 border-none pb-0"
      />

      <HorizontalScroller>
        {isLoading &&
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="w-40 shrink-0 snap-start rounded-2xl border border-gray-100 bg-white p-3 animate-pulse space-y-3">
              <div className="w-full aspect-square rounded-xl bg-gray-100" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
              <div className="h-7 w-full bg-gray-100 rounded-full" />
            </div>
          ))}

        {suggestions.map((user) => {
          const fallback = user.displayName ? user.displayName.charAt(0).toUpperCase() : "U";
          return (
            <div
              key={user.userId}
              className="w-40 shrink-0 snap-start rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-sm transition-shadow relative"
            >
              <button
                type="button"
                onClick={() => dismiss(user.userId)}
                aria-label="Dismiss suggestion"
                className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white cursor-pointer shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <Link href={`/profile/${user.userId}`} className="block">
                <div className="w-full aspect-square bg-purple-50 flex items-center justify-center">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={getMediaUrl(user.avatarUrl ?? null)} alt={user.displayName} />
                    <AvatarFallback className="text-2xl bg-purple-100 text-purple-700 font-bold">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Link>

              <div className="p-3 space-y-2">
                <Link href={`/profile/${user.userId}`}>
                  <p className="font-semibold text-sm text-gray-900 truncate hover:underline leading-tight">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user.mutualFriendsCount > 0
                      ? `${user.mutualFriendsCount} mutual friend${user.mutualFriendsCount === 1 ? "" : "s"}`
                      : user.username
                        ? `@${user.username}`
                        : "Suggested for you"}
                  </p>
                </Link>
                <RelationshipButton userId={user.userId} compact />
              </div>
            </div>
          );
        })}
      </HorizontalScroller>
    </div>
  );
}
