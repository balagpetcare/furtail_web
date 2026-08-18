"use client";

import React from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { ReactionControl, type ReactionType } from "@/components/social/reaction-control";

/**
 * Shared Like/Comment/Share action row — used by both the Single Post
 * page and the Comment modal. `onCommentClick` is optional: in the Comment
 * modal the comment list is already visible below, so the button is
 * purely decorative/FB-pattern-consistent; the Single Post page can pass a
 * handler that focuses the comment composer.
 */
export function PostActionsRow({
  viewerReaction,
  likePending,
  onReact,
  onRemoveReaction,
  onCommentClick,
  onShare,
}: {
  viewerReaction: string | null;
  likePending: boolean;
  onReact: (reaction: string) => void;
  onRemoveReaction: () => void;
  onCommentClick?: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex items-center gap-6 text-gray-500 text-sm relative">
      <ReactionControl
        viewerReaction={viewerReaction}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
        disabled={likePending}
      />

      {onCommentClick ? (
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
          onClick={onCommentClick}
          aria-label="Comment"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <span>Comment</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-gray-500">
          <MessageCircle className="w-4.5 h-4.5" />
          <span>Comment</span>
        </div>
      )}

      <button
        type="button"
        className="flex items-center gap-1.5 hover:text-purple-600 transition-colors ml-auto cursor-pointer"
        onClick={onShare}
        aria-label="Share post"
      >
        <Share2 className="w-4.5 h-4.5" />
        <span>Share</span>
      </button>
    </div>
  );
}
