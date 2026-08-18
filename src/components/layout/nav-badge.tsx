"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi, notificationsKeys } from "@/lib/api/notifications";
import { messagesApi, messagesKeys } from "@/lib/api/messages";

function Dot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NotificationsBadge() {
  const { data } = useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 60_000,
  });
  return <Dot count={data?.count ?? 0} />;
}

export function MessagesBadge() {
  const { data } = useQuery({
    queryKey: messagesKeys.unread(),
    queryFn: messagesApi.getUnreadSummary,
    refetchInterval: 60_000,
  });
  return <Dot count={data?.totalUnreadConversations ?? 0} />;
}
