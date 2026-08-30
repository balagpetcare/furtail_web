"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Share2, Bookmark, UserPlus, UserCheck, ThumbsDown } from "lucide-react";
import { postsApi, postsKeys, type Post } from "@/lib/api/posts";
import { socialApi } from "@/lib/api/social";
import { getMediaUrl } from "@/lib/media";
import { trackNotInterested } from "@/lib/video/watch-analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Comments } from "@/components/post/comments";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Immersive viewer side/overlay panel for a single video slide in the
 * Reels-style scroller: author row + follow, caption, and a dark action
 * rail (reaction, comment, share, bookmark). Reuses the same API
 * mutations and components as every other surface — no duplicated social
 * logic.
 */
export function VideoSocialOverlay({
  post,
  meId,
}: {
  post: Post;
  meId?: number;
}) {
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isOwner = meId !== undefined && meId === post.author.id;
  const safeName = post.author.displayName || post.author.username || "Furtail User";
  const avatarUrl = getMediaUrl(post.author.avatarUrl ?? null);
  const avatarFallback = safeName.charAt(0).toUpperCase();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: postsKeys.all });

  const reactMutation = useMutation({
    mutationFn: (reaction: string | null) =>
      reaction === null
        ? postsApi.unlikePost(String(post.id))
        : postsApi.reactPost(String(post.id), reaction),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to update reaction"),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      post.isBookmarkedByMe
        ? postsApi.unbookmarkPost(String(post.id))
        : postsApi.bookmarkPost(String(post.id)),
    onSuccess: () => {
      invalidate();
      toast.success(post.isBookmarkedByMe ? "Removed from saved" : "Saved");
    },
    onError: () => toast.error("Failed to update saved posts"),
  });

  const shareMutation = useMutation({
    mutationFn: () => postsApi.sharePost(String(post.id)),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to share post"),
  });

  const followMutation = useMutation({
    mutationFn: () =>
      post.isFollowingAuthor
        ? socialApi.unfollowUser(String(post.author.userId))
        : socialApi.followUser(String(post.author.userId)),
    onSuccess: () => {
      invalidate();
      toast.success(post.isFollowingAuthor ? "Unfollowed" : "Following");
    },
    onError: () => toast.error("Failed to update follow"),
  });

  const viewerReaction = post.viewerReaction || (post.isLikedByMe ? "LIKE" : null);
  const totalReactions = post.totalReactionCount ?? post.likeCount ?? 0;

  const handleShare = async () => {
    const url = `${window.location.origin}/videos/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
    shareMutation.mutate();
  };

  const caption = post.caption?.trim();

  return (
    <>
      {/* Left-bottom: author + caption */}
      <div className="absolute bottom-20 left-3 right-20 sm:left-4 sm:right-auto sm:max-w-md z-10 text-white pointer-events-auto">
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/profile/${post.author.userId}`} className="flex items-center gap-2 group">
            <Avatar className="w-9 h-9 border-2 border-white/30 shrink-0">
              <AvatarImage src={avatarUrl || undefined} alt={safeName} />
              <AvatarFallback className="bg-purple-600 text-white text-xs font-bold">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm group-hover:underline">{safeName}</span>
          </Link>
          {!isOwner && (
            <button
              type="button"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={cn(
                "ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-purple-400",
                post.isFollowingAuthor
                  ? "bg-white/15 hover:bg-white/25 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white",
              )}
              aria-label={post.isFollowingAuthor ? `Unfollow ${safeName}` : `Follow ${safeName}`}
            >
              {post.isFollowingAuthor ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {post.isFollowingAuthor ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {caption && (
          <p className="text-sm leading-relaxed text-white/90 line-clamp-3 drop-shadow">{caption}</p>
        )}
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5 text-white pointer-events-auto">
        <RailButton
          label="Reaction"
          active={Boolean(viewerReaction)}
          count={totalReactions}
          onClick={() => reactMutation.mutate(viewerReaction ? null : "LIKE")}
        >
          <Heart
            className={cn("w-7 h-7", viewerReaction && "fill-red-500 text-red-500")}
            strokeWidth={viewerReaction ? 1.5 : 2}
          />
        </RailButton>

        <RailButton
          label="Comments"
          count={post.commentCount}
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle className="w-7 h-7" />
        </RailButton>

        <RailButton label="Share" count={post.shareCount ?? 0} onClick={handleShare}>
          <Share2 className="w-7 h-7" />
        </RailButton>

        <RailButton label="Save" active={Boolean(post.isBookmarkedByMe)} onClick={() => bookmarkMutation.mutate()}>
          <Bookmark
            className={cn("w-7 h-7", post.isBookmarkedByMe && "fill-purple-500 text-purple-500")}
          />
        </RailButton>

        {/* Not interested — explicit negative feedback for the future
        ranking engine. "Where supported": the immersive viewer is the
        primary discovery surface, so this lives here. */}
        <RailButton
          label="Not interested"
          onClick={() => {
            trackNotInterested(post.id);
            toast.success("Noted — we'll show fewer videos like this");
          }}
        >
          <ThumbsDown className="w-6 h-6" />
        </RailButton>
      </div>

      {/* Comments sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Comments postId={String(post.id)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function RailButton({
  label,
  children,
  onClick,
  count,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  count?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}${typeof count === "number" && count > 0 ? ` (${count})` : ""}`}
      className={cn(
        "flex flex-col items-center gap-1 group cursor-pointer focus-visible:outline-2 focus-visible:outline-purple-400",
        active ? "text-white" : "text-white",
      )}
    >
      <span className="p-1.5 rounded-full hover:bg-white/15 transition-colors flex items-center justify-center">
        {children}
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[11px] font-semibold tabular-nums">{formatCompact(count)}</span>
      )}
    </button>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
