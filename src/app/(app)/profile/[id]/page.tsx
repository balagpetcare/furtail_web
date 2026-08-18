"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, UserX, Flag, MapPin, Calendar, Heart, Gift, Compass } from "lucide-react";
import { usersApi, usersKeys } from "@/lib/api/users";
import { petsApi, petsKeys } from "@/lib/api/pets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaUrl } from "@/lib/media";
import { PostCard } from "@/components/post/post-card";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { socialApi, socialKeys } from "@/lib/api/social";
import { RelationshipButton } from "@/components/social/relationship-button";
import { ConnectionsTab } from "@/components/social/connections-tab";
import { ReportDialog } from "@/components/social/report-dialog";
import { PageContainer, Surface, LoadingSkeleton, EmptyState } from "@/components/ui/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchApi } from "@/lib/api-client";

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);

  const blockMutation = useMutation({
    mutationFn: () => socialApi.blockUser(userId),
    onSuccess: () => {
      toast.success("User blocked");
      queryClient.invalidateQueries({ queryKey: socialKeys.status(userId) });
    },
    onError: () => toast.error("Failed to block user"),
  });

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: usersKeys.detail(userId),
    queryFn: () => usersApi.getProfile(userId),
    enabled: !!userId,
  });

  const { data: me } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number }>("/user/me"),
  });

  const isOwner = String(me?.id) === userId;
  const displayName = profile?.profile.displayName || `User ${userId.substring(0, 6)}`;
  const avatarUrl = profile?.profile.avatarMedia?.url ?? null;
  const coverUrl = profile?.profile.coverMedia?.url ?? null;

  const { data: counts } = useQuery({
    queryKey: socialKeys.counts(userId),
    queryFn: () => socialApi.getCounts(userId),
    enabled: !!userId,
  });

  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: postsKeys.feed(`user-${userId}`),
    queryFn: () => postsApi.getUserPosts(userId, undefined, 10),
    enabled: !!userId,
  });

  const { data: pets, isLoading: isPetsLoading } = useQuery({
    queryKey: petsKeys.profile(userId),
    queryFn: () => petsApi.getPetsByOwner(userId),
    enabled: !!userId,
  });

  if (isProfileLoading) {
    return (
      <PageContainer className="bg-white min-h-screen">
        <LoadingSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="bg-white min-h-screen p-0! sm:p-0!">
      {/* Cover / Banner Area */}
      <div className="relative h-44 sm:h-52 w-full bg-purple-100 overflow-hidden">
        {coverUrl ? (
          <img
            src={getMediaUrl(coverUrl)}
            alt="Profile Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-100 to-purple-50" />
        )}
      </div>

      {/* Profile Info Overlay Container */}
      <div className="px-6 pb-6 relative -mt-16 sm:-mt-20 border-b border-gray-100/70">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <Avatar className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-white shadow-md bg-white">
            <AvatarImage src={getMediaUrl(avatarUrl)} alt="Profile Avatar" />
            <AvatarFallback className="bg-purple-50 text-purple-700 text-3xl font-extrabold">
              {displayName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <RelationshipButton userId={userId} />
            {!isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors active:scale-95">
                    <MoreHorizontal className="w-5 h-5" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 shadow-lg">
                  <DropdownMenuItem onClick={() => blockMutation.mutate()} className="text-red-600 cursor-pointer py-2">
                    <UserX className="w-4 h-4 mr-2" /> Block user
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-red-600 cursor-pointer py-2">
                    <Flag className="w-4 h-4 mr-2" /> Report user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="mt-4 space-y-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight leading-tight">{displayName}</h1>
            {profile?.profile.username && (
              <p className="text-xs text-gray-400 mt-0.5 font-medium">@{profile.profile.username}</p>
            )}
          </div>

          <p className="text-sm text-gray-600 max-w-xl leading-relaxed">{profile?.profile.bio || "No bio available."}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{profile?.profile.placeLive || "Unknown Location"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Member since {profile?.createdAt ? new Date(profile.createdAt as string).getFullYear() : "recently"}</span>
            </div>
          </div>

          {/* Social Counts */}
          <div className="flex items-center gap-6 pt-3 select-none">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-gray-900 text-sm">{counts?.followers ?? 0}</span>
              <span className="text-xs text-gray-500 font-medium">Followers</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-gray-900 text-sm">{counts?.following ?? 0}</span>
              <span className="text-xs text-gray-500 font-medium">Following</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-gray-900 text-sm">{counts?.friends ?? 0}</span>
              <span className="text-xs text-gray-500 font-medium">Friends</span>
            </div>
          </div>
        </div>
      </div>

      {!isOwner && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          type="USER"
          targetId={Number(userId)}
        />
      )}

      {/* Profile Tabs */}
      <div className="px-6 py-5">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full bg-gray-50 border border-gray-100 rounded-xl mb-6 p-1 h-auto flex flex-wrap">
            <TabsTrigger value="posts" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Posts</TabsTrigger>
            <TabsTrigger value="pets" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Pets</TabsTrigger>
            <TabsTrigger value="about" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">About</TabsTrigger>
            <TabsTrigger value="connections" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Connections</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4 outline-none">
            {isPostsLoading ? (
               <LoadingSkeleton />
            ) : posts?.data?.length ? (
              posts.data.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <EmptyState
                icon={Compass}
                title="No posts yet"
                description={`${displayName} has not posted anything yet.`}
              />
            )}
          </TabsContent>
          
          <TabsContent value="pets" className="outline-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isPetsLoading ? (
                <div className="col-span-2 py-8"><LoadingSkeleton className="h-24" /></div>
              ) : !pets?.items?.length ? (
                <div className="col-span-2">
                  <EmptyState
                    icon={Gift}
                    title="No pets listed"
                    description={`${displayName} has not registered any pets yet.`}
                  />
                </div>
              ) : (
                pets.items.map((pet: any) => (
                  <Surface key={pet.id} className="p-4 flex items-center gap-4 border border-gray-100 hover:border-gray-200/50 transition-colors">
                    <Avatar className="w-16 h-16 border border-gray-100/50 shrink-0">
                      <AvatarImage src={getMediaUrl(pet.avatarUrl)} />
                      <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">P</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-950 text-sm truncate">{pet.name}</h4>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{pet.species}</p>
                    </div>
                  </Surface>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="about" className="outline-none">
            <Surface className="p-6 border border-gray-100">
              <h3 className="font-bold text-gray-950 text-sm mb-4">About</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Location: <span className="text-gray-900 font-medium">{profile?.profile.placeLive || "Unknown"}</span></p>
                <p>Joined Furtail: <span className="text-gray-900 font-medium">{profile?.createdAt ? new Date(profile.createdAt as string).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : "Recently"}</span></p>
              </div>
            </Surface>
          </TabsContent>

          <TabsContent value="connections" className="outline-none">
            <ConnectionsTab userId={userId} isOwner={isOwner} />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
