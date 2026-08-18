"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { socialApi, socialKeys } from "@/lib/api/social";
import { fetchApi } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import { RelationshipButton } from "@/components/social/relationship-button";
import { PageContainer, Surface, TabBar, LoadingSkeleton, EmptyState } from "@/components/ui/design-system";
import { Users } from "lucide-react";

interface RequestUser {
  id?: number;
  userId?: number;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
}

interface FriendRequestItem {
  id?: number;
  fromUser?: RequestUser;
  toUser?: RequestUser;
  user?: RequestUser;
}

export default function PeoplePage() {
  const [activeTab, setActiveTab] = React.useState("suggestions");

  const { data: suggestionsResp, isLoading: suggestionsLoading } = useQuery({
    queryKey: socialKeys.suggestions(),
    queryFn: () => socialApi.getSuggestions(),
  });

  const { data: incoming, isLoading: incomingLoading } = useQuery({
    queryKey: socialKeys.incomingRequests(),
    queryFn: () =>
      fetchApi<{ items: FriendRequestItem[] }>("/social/friend-requests/incoming", {
        params: { limit: 50 },
      }),
  });

  const suggestions = suggestionsResp?.items ?? [];
  const incomingRequests = incoming?.items ?? [];

  const tabs = [
    { id: "suggestions", label: "Suggestions" },
    { id: "requests", label: `Requests ${incomingRequests.length > 0 ? `(${incomingRequests.length})` : ""}` },
  ];

  return (
    <PageContainer className="bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-950 tracking-tight">People</h1>
        <p className="text-xs text-gray-500 mt-1">Find new friends and manage your connections.</p>
      </div>

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="sticky-none border-none relative z-10 -mx-4 px-4 bg-transparent mb-5"
      />

      <div className="space-y-4">
        {activeTab === "suggestions" && (
          suggestionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LoadingSkeleton className="h-28" />
              <LoadingSkeleton className="h-28" />
            </div>
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No suggestions right now"
              description="Check back later for new connections suggested for you."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestions.map((user) => (
                <Surface
                  key={user.userId}
                  className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-200/60 transition-all duration-200"
                >
                  <Link href={`/profile/${user.userId}`} className="shrink-0">
                    <Avatar className="w-12 h-12 border border-gray-100/80">
                      <AvatarImage src={getMediaUrl(user.avatarUrl)} alt="Avatar" />
                      <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                        {user.displayName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${user.userId}`} className="hover:underline hover:text-purple-700 transition-colors">
                      <p className="font-semibold text-sm text-gray-900 truncate">{user.displayName}</p>
                    </Link>
                    {user.username && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">@{user.username}</p>
                    )}
                  </div>
                  <div className="shrink-0 scale-90 origin-right">
                    <RelationshipButton userId={String(user.userId)} />
                  </div>
                </Surface>
              ))}
            </div>
          )
        )}

        {activeTab === "requests" && (
          incomingLoading ? (
            <div className="space-y-3">
              <LoadingSkeleton className="h-24" />
            </div>
          ) : incomingRequests.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No pending requests"
              description="You have no incoming friend requests at the moment."
            />
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req) => {
                const user = req.fromUser || req.user || {};
                const targetId = String(user.id ?? user.userId ?? "");
                return (
                  <Surface
                    key={req.id ?? targetId}
                    className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-200/60 transition-all duration-200"
                  >
                    <Link href={`/profile/${targetId}`} className="shrink-0">
                      <Avatar className="w-12 h-12 border border-gray-100/80">
                        <AvatarImage src={getMediaUrl(user.avatarUrl ?? null)} alt="Avatar" />
                        <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                          {user.displayName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${targetId}`} className="hover:underline hover:text-purple-700 transition-colors">
                        <p className="font-semibold text-sm text-gray-900 truncate">{user.displayName}</p>
                      </Link>
                    </div>
                    <div className="shrink-0 scale-90 origin-right">
                      <RelationshipButton userId={targetId} />
                    </div>
                  </Surface>
                );
              })}
            </div>
          )
        )}
      </div>
    </PageContainer>
  );
}
