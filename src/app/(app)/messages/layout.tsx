"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { messagesApi, messagesKeys, type ConversationListItem } from "@/lib/api/messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import { SearchInput, LoadingSkeleton, CountBadge } from "@/components/ui/design-system";
import { cn } from "@/lib/utils";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const conversationId = params.id as string | undefined;
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: messagesKeys.conversations(),
    queryFn: () => messagesApi.getConversations(),
  });

  const threads = data?.items || [];

  const filteredThreads = threads.filter((thread: ConversationListItem) => {
    const otherUser = thread.otherUser || {};
    const displayName = otherUser.displayName || "";
    const username = otherUser.username || "";
    return (
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      username.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex h-[calc(100vh-56px)] bg-white overflow-hidden w-full">
      {/* Left Inbox Pane */}
      <div className={cn(
        "flex-col shrink-0 bg-white border-r border-gray-100/70 h-full",
        conversationId ? "hidden md:flex md:w-80 lg:w-88" : "flex w-full md:w-80 lg:w-88"
      )}>
        {/* Inbox Header */}
        <div className="p-4 border-b border-gray-50 space-y-3">
          <h1 className="text-xl font-extrabold text-gray-950 tracking-tight">Messages</h1>
          <SearchInput
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-1.5 pl-9 text-xs"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50/50">
          {isLoading && (
            <div className="p-4 space-y-3">
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          )}

          {!isLoading && filteredThreads.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400 select-none">
              {search ? "No conversations found" : "No conversations yet"}
            </div>
          )}

          {!isLoading && filteredThreads.map((thread: ConversationListItem) => {
            const otherUser = thread.otherUser || {};
            const lastMessage = thread.lastMessage;
            const unreadCount = thread.unreadCount || 0;
            const hasUnread = unreadCount > 0;
            const isSelected = conversationId === String(thread.conversationId);
            
            return (
              <Link 
                key={thread.conversationId} 
                href={`/messages/${thread.conversationId}`}
                className={cn(
                  "flex items-center gap-3.5 p-4 transition-all duration-150 hover:bg-gray-50 select-none outline-none",
                  isSelected ? "bg-purple-50/40 hover:bg-purple-50/40" : "",
                  hasUnread ? "bg-slate-50/20" : ""
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12 border border-gray-100/80">
                    <AvatarImage src={getMediaUrl(otherUser.avatarUrl)} />
                    <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                      {otherUser.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status Indicator Mockup (Furtail user presence) */}
                  {thread.otherUserOnline && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={cn(
                      "text-sm text-gray-900 truncate leading-tight",
                      hasUnread || isSelected ? "font-bold" : "font-semibold"
                    )}>
                      {otherUser.displayName || 'Unknown User'}
                    </h3>
                    {lastMessage?.createdAt && (
                      <span className={cn(
                        "text-[10px]",
                        hasUnread ? "text-purple-600 font-bold" : "text-gray-400 font-medium"
                      )}>
                        {new Date(lastMessage.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    hasUnread ? "text-gray-900 font-semibold" : "text-gray-400 font-medium"
                  )}>
                    {lastMessage?.body || "No messages yet."}
                  </p>
                </div>

                {hasUnread && (
                  <div className="shrink-0">
                    <CountBadge count={unreadCount} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Conversation Pane / Children */}
      <div className={cn(
        "flex-1 h-full min-w-0 bg-gray-50/30",
        conversationId ? "flex" : "hidden md:flex"
      )}>
        {children}
      </div>
    </div>
  );
}
