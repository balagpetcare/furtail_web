"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { socialApi, socialKeys } from "@/lib/api/social";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelationshipButton } from "@/components/social/relationship-button";

export function ConnectionsTab({ userId, isOwner }: { userId: string, isOwner: boolean }) {
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: socialKeys.friends(),
    queryFn: () => fetchApi<{items: any[]}>("/social/friends", { params: { limit: 100 } }),
    enabled: isOwner,
  });

  const { data: followers, isLoading: followersLoading } = useQuery({
    queryKey: socialKeys.followers(),
    queryFn: () => fetchApi<{items: any[]}>("/social/followers", { params: { limit: 100 } }),
    enabled: isOwner,
  });

  const { data: following, isLoading: followingLoading } = useQuery({
    queryKey: socialKeys.following(),
    queryFn: () => fetchApi<{items: any[]}>("/social/following", { params: { limit: 100 } }),
    enabled: isOwner,
  });

  const { data: incomingReqs, isLoading: incomingReqsLoading } = useQuery({
    queryKey: socialKeys.incomingRequests(),
    queryFn: () => fetchApi<{items: any[]}>("/social/friend-requests/incoming", { params: { limit: 100 } }),
    enabled: isOwner,
  });

  if (!isOwner) {
    return (
      <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
        Connections are private.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100">
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="w-full bg-gray-50 border border-gray-100 rounded-xl mb-6 p-1 flex">
          <TabsTrigger value="friends" className="flex-1 rounded-lg py-2">Friends</TabsTrigger>
          <TabsTrigger value="followers" className="flex-1 rounded-lg py-2">Followers</TabsTrigger>
          <TabsTrigger value="following" className="flex-1 rounded-lg py-2">Following</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 rounded-lg py-2 relative">
            Requests
            {incomingReqs?.items?.length ? (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            ) : null}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="friends">
          <ConnectionList items={friends?.items || []} loading={friendsLoading} emptyText="No friends yet." />
        </TabsContent>
        <TabsContent value="followers">
          <ConnectionList items={followers?.items || []} loading={followersLoading} emptyText="No followers yet." />
        </TabsContent>
        <TabsContent value="following">
          <ConnectionList items={following?.items || []} loading={followingLoading} emptyText="Not following anyone." />
        </TabsContent>
        <TabsContent value="requests">
          <ConnectionList items={incomingReqs?.items || []} loading={incomingReqsLoading} emptyText="No pending friend requests." isRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectionList({ items, loading, emptyText, isRequests }: { items: any[], loading: boolean, emptyText: string, isRequests?: boolean }) {
  if (loading) {
    return <div className="py-4 text-center text-gray-400">Loading...</div>;
  }
  
  if (!items || items.length === 0) {
    return <div className="py-8 text-center text-gray-400">{emptyText}</div>;
  }
  
  return (
    <div className="space-y-4">
      {items.map((item: any) => {
        // Handle different payload shapes (e.g. Follow object vs Friend object)
        const user = item.user || item.follower || item.following || item.fromUser || item.toUser || item;
        const targetId = String(user.id || user.userId);
        return (
          <div key={item.id || targetId} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getMediaUrl(user.avatarUrl)} />
              <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{user.displayName || `User ${targetId}`}</h4>
              <p className="text-xs text-gray-500">@{user.username || targetId}</p>
            </div>
            <RelationshipButton userId={targetId} />
          </div>
        );
      })}
    </div>
  );
}

import { fetchApi } from "@/lib/api-client";
