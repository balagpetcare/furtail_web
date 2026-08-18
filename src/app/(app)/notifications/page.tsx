"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, UserPlus, MessageCircle, Info, Check } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  notificationsApi,
  notificationsKeys,
  notificationTargetHref,
  type NotificationItem,
} from "@/lib/api/notifications";
import { getMediaUrl } from "@/lib/media";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: notificationsKeys.all,
    queryFn: ({ pageParam }) => notificationsApi.getNotifications(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string | number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount });
    }
  });

  const notifications = data?.pages.flatMap((page) => page.items || []) || [];

  const handleClick = (notif: NotificationItem) => {
    if (!notif.isRead) markAsReadMutation.mutate(notif.id);
    const href = notificationTargetHref(notif);
    if (href) router.push(href);
  };

  const getIcon = (type: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("LIKE")) return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
    if (t.includes("FOLLOW") || t.includes("FRIEND")) return <UserPlus className="w-4 h-4 text-blue-500" />;
    if (t.includes("COMMENT") || t.includes("REPLY")) return <MessageCircle className="w-4 h-4 text-green-500" />;
    return <Info className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
        {notifications.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading && (
          <div className="p-4 space-y-4">
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
          </div>
        )}

        {isError && (
          <div className="p-12 text-center text-red-500 bg-red-50">
            Failed to load notifications.
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            You have no notifications yet.
          </div>
        )}

        {notifications.map((notif, i) => {
          const isRead = notif.isRead;

          return (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(notif)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClick(notif);
              }}
              className={`flex gap-4 p-4 transition-colors cursor-pointer ${i !== notifications.length - 1 ? 'border-b border-gray-100' : ''} ${!isRead ? 'bg-purple-50/30 hover:bg-purple-50/60' : 'hover:bg-gray-50'}`}
            >
              <div className="relative">
                <Avatar className="w-12 h-12 border border-gray-100">
                  <AvatarImage src={getMediaUrl(notif.actorAvatarUrl)} />
                  <AvatarFallback>{notif.actorName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                  {getIcon(notif.type)}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-gray-800 text-[15px]">
                  <span className="font-bold text-gray-900">{notif.actorName || 'Someone'}</span> {notif.body}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {notif.createdAt && new Date(notif.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}

        {hasNextPage && (
          <div className="p-4 text-center border-t border-gray-100">
            <Button 
              variant="outline" 
              onClick={() => fetchNextPage()} 
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
