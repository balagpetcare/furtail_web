"use client";

import React from "react";
import { useSuggestions } from "@/hooks/use-suggestions";
import { getMediaUrl } from "@/lib/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RelationshipButton } from "@/components/social/relationship-button";
import Link from "next/link";
import { Search } from "lucide-react";

export function RightSidebar() {
  const { suggestions, isLoading } = useSuggestions();

  return (
    <div className="py-6 px-5 space-y-6">
      <div>
        <form action="/search" method="GET" className="relative group">
          <input
            type="search"
            name="q"
            placeholder="Search Furtail..."
            className="w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-white border-2 border-transparent focus:border-purple-200 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-200"
          />
          <Search className="h-4.5 w-4.5 absolute left-4 top-3 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 text-[15px] tracking-tight">Suggested for you</h3>
          <Link href="/people" className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline">
            See all
          </Link>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-3.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-gray-100 rounded" />
                    <div className="h-2 w-1/2 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">No new suggestions</div>
          )}

          {suggestions.slice(0, 5).map((user) => {
            const fallback = user.displayName ? user.displayName.charAt(0).toUpperCase() : "U";

            return (
              <div key={user.userId} className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Link href={`/profile/${user.userId}`}>
                    <Avatar className="w-9 h-9 border border-gray-100/60 hover:opacity-90 transition-opacity">
                      <AvatarImage src={getMediaUrl(user.avatarUrl ?? null)} alt="Avatar" />
                      <AvatarFallback className="text-xs bg-purple-50 text-purple-700 font-bold">{fallback}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${user.userId}`} className="block">
                      <p className="font-semibold text-sm text-gray-900 truncate hover:underline leading-tight">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user.mutualFriendsCount > 0
                          ? `${user.mutualFriendsCount} mutual friend${user.mutualFriendsCount === 1 ? "" : "s"}`
                          : user.username
                            ? `@${user.username}`
                            : ""}
                      </p>
                    </Link>
                  </div>
                </div>

                <div className="shrink-0">
                  <RelationshipButton userId={user.userId} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
