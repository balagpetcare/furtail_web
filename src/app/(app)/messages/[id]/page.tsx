"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MoreHorizontal, Edit2, Trash2, Image, Video, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { messagesApi, messagesKeys } from "@/lib/api/messages";
import { fetchApi } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageItem {
  id: number | string;
  senderId: number;
  body: string;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  clientMessageId?: string;
  isOptimistic?: boolean;
  isFailed?: boolean;
}

export default function MessageThreadPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<MessageItem[]>([]);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoScrolled = useRef(false);

  const { data: me } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number }>("/user/me"),
  });
  const myId = String(me?.id ?? "");

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: messagesKeys.messages(conversationId),
    queryFn: ({ pageParam }) => messagesApi.getMessages(conversationId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    refetchInterval: 20_000,
  });

  const { data: convInfo } = useQuery({
    queryKey: messagesKeys.conversation(conversationId),
    queryFn: async () => {
      const res = await messagesApi.getConversations();
      return res.items?.find((c: any) => String(c.id) === conversationId);
    },
  });

  const messages: MessageItem[] = React.useMemo(() => {
    const byId = new Map<string, MessageItem>();
    const fetchedItems = messagesData?.pages.flatMap(page => page.items) || [];
    
    // Add fetched messages
    for (const m of fetchedItems as MessageItem[]) {
      if (m) byId.set(String(m.id), m);
    }
    
    // Add optimistic messages only if they haven't been resolved
    const fetchedClientIds = new Set(
      fetchedItems
        .map((m: any) => m?.clientMessageId)
        .filter(Boolean)
    );
    
    for (const om of optimisticMessages) {
      if (!fetchedClientIds.has(om.clientMessageId)) {
        byId.set(String(om.id), om);
      }
    }
    
    return [...byId.values()].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [messagesData, optimisticMessages]);
  const otherUser = convInfo?.otherUser;
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      hasAutoScrolled.current = true;
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesApi.markAsRead(conversationId).catch(() => {});
    }
  }, [conversationId, messages.length]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ text, clientMsgId }: { text: string; clientMsgId: string }) => 
      messagesApi.sendMessage(conversationId, text, clientMsgId),
    onSuccess: (data) => {
      setInput("");
      // Remove this message from optimistic list since it's now fetched
      if (data?.clientMessageId) {
        setOptimisticMessages(prev => prev.filter(m => m.clientMessageId !== data.clientMessageId));
      }
      queryClient.invalidateQueries({ queryKey: messagesKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() });
    },
    onError: (err, variables) => {
      toast.error("Failed to send message");
      // Mark optimistic message as failed
      setOptimisticMessages(prev => 
        prev.map(m => m.clientMessageId === variables.clientMsgId ? { ...m, isFailed: true } : m)
      );
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string | number; text: string }) =>
      messagesApi.editMessage(conversationId, id, text),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: messagesKeys.messages(conversationId) });
    },
    onError: () => toast.error("Failed to edit message"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => messagesApi.deleteMessage(conversationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.messages(conversationId) });
    },
    onError: () => toast.error("Failed to delete message"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessageMutation.isPending) return;
    
    const text = input.trim();
    const clientMsgId = `client-${Date.now()}`;
    
    // Add optimistic message
    const optMsg: MessageItem = {
      id: clientMsgId,
      senderId: Number(myId),
      body: text,
      createdAt: new Date().toISOString(),
      clientMessageId: clientMsgId,
      isOptimistic: true
    };
    
    setOptimisticMessages(prev => [...prev, optMsg]);
    setInput("");
    sendMessageMutation.mutate({ text, clientMsgId });
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 100MB limit.");
      return;
    }

    // Validate type (images, videos, audio)
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");

    if (!isImage && !isVideo && !isAudio) {
      toast.error("Unsupported file type. Only images, videos, and audio are allowed.");
      return;
    }

    // Furtail message API doesn't support attachments yet
    toast.info("Message attachments require backend API updates. Displaying details: " + file.name);
  };

  return (
    <div className="flex flex-col h-full bg-white w-full overflow-hidden">
      {/* Thread Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/70 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-gray-500 hover:text-gray-900 md:hidden active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative">
            <Avatar className="w-10 h-10 border border-gray-100">
              <AvatarImage src={getMediaUrl(otherUser?.avatarUrl)} />
              <AvatarFallback className="bg-purple-50 text-purple-700 font-bold">
                {otherUser?.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {convInfo?.otherUserOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-950 text-sm leading-tight">
              {otherUser?.displayName || `Conversation`}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {convInfo?.otherUserOnline ? "Active now" : "Offline"}
            </p>
          </div>
        </div>

        <div>
          <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer transition-colors active:scale-95">
            <MoreHorizontal className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 flex flex-col">
        {isLoading && (
          <div className="text-center text-xs text-gray-400 my-auto">Loading message history...</div>
        )}

        {hasNextPage && (
          <div className="text-center pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs rounded-full font-semibold px-4 cursor-pointer"
            >
              {isFetchingNextPage ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = String(msg.senderId) === myId;
          const isDeleted = Boolean(msg.deletedAt);
          const isEditingThis = editingId === msg.id;
          const isFailed = msg.isFailed;

          // Group consecutive messages from the same sender
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId && !isDeleted && !prevMsg.deletedAt;
          
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-2 group w-full",
                isMe ? "justify-end" : "justify-start",
                isConsecutive ? "mt-0.5" : "mt-3"
              )}
            >
              {/* Message Bubble */}
              <div className={cn("flex gap-2 max-w-[70%]", isMe ? "flex-row-reverse" : "flex-row")}>
                
                {/* Avatar block for recipient */}
                {!isMe && (
                  <div className="w-8 shrink-0 flex items-end justify-center">
                    {!isConsecutive && (
                      <Avatar className="w-8 h-8 border border-gray-100">
                        <AvatarImage src={getMediaUrl(otherUser?.avatarUrl)} />
                        <AvatarFallback className="bg-purple-50 text-purple-700 font-bold text-xs">
                          {otherUser?.displayName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                {/* Edit/Delete Trigger for My messages */}
                {isMe && !isDeleted && !isEditingThis && !msg.isOptimistic && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity self-center cursor-pointer">
                      <div className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 shadow-lg">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditText(msg.body);
                        }}
                        className="cursor-pointer gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(msg.id)}
                        className="text-red-600 cursor-pointer gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> <span>Unsend</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Bubble box */}
                <div className="flex flex-col">
                  <div
                    className={cn(
                      "p-3 text-sm whitespace-pre-wrap break-words shadow-sm/5 transition-all",
                      isMe
                        ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm',
                      isDeleted ? 'italic opacity-60 bg-gray-100 border-none text-gray-400' : '',
                      isFailed ? 'bg-red-50 text-red-700 border border-red-100' : '',
                      msg.isOptimistic && !isFailed ? 'opacity-70 bg-purple-500' : ''
                    )}
                  >
                    {isEditingThis ? (
                      <div className="space-y-2 min-w-[200px]">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-white text-gray-900 border border-gray-100 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-purple-200"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="text-[10px] text-gray-500 hover:text-gray-950 font-semibold px-2 py-1"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full px-3 py-1 cursor-pointer"
                            onClick={() => editMutation.mutate({ id: msg.id, text: editText })}
                            disabled={editMutation.isPending || !editText.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : isDeleted ? (
                      "Message removed"
                    ) : (
                      <>
                        <span>{msg.body}</span>
                        {msg.editedAt && (
                          <span className={cn("text-[9px] ml-1.5 opacity-60", isMe ? 'text-purple-200' : 'text-gray-400')}>
                            (edited)
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Read Receipt or Timestamp */}
                  <div className={cn(
                    "text-[9px] mt-1 text-gray-400 font-medium",
                    isMe ? "text-right" : "text-left"
                  )}>
                    {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    
                    {/* Read receipt avatar mockup */}
                    {isMe && idx === messages.length - 1 && !msg.isOptimistic && (
                      <span className="inline-block ml-1.5 align-middle select-none">
                        <Avatar className="w-3.5 h-3.5 border border-white">
                          <AvatarImage src={getMediaUrl(otherUser?.avatarUrl)} />
                          <AvatarFallback className="bg-purple-50 text-purple-700 text-[6px]">R</AvatarFallback>
                        </Avatar>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Composer Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2 relative z-10">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          {/* Attachment trigger */}
          <div className="shrink-0 flex items-center mb-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*,audio/*"
            />
            <button
              type="button"
              onClick={handleAttachmentClick}
              disabled={sendMessageMutation.isPending}
              className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full h-9 w-9 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex-1 bg-gray-100 rounded-2xl relative border border-gray-100">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message..."
              className="w-full bg-transparent resize-none outline-none py-2.5 px-4 max-h-32 text-sm leading-relaxed"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!input.trim() || sendMessageMutation.isPending} 
            size="icon" 
            className="rounded-full bg-purple-600 hover:bg-purple-700 h-9.5 w-9.5 flex-shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all text-white"
          >
            <Send className="w-4.5 h-4.5 ml-0.5 text-white fill-white" />
          </Button>
        </form>
      </div>
    </div>
  );
}
