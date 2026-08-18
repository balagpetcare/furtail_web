"use client";

import React from "react";
import { normalizeAuthor } from "@/lib/api/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";

interface PreviewComment {
  id: number | string;
  text: string;
  createdAt: string;
  user?: unknown;
  likeCount?: number;
  replyCount?: number;
}

/**
 * Compact, always-visible 1-2 comment preview shown under a feed card —
 * separate from the full paginated `Comments` thread rendered inside the
 * comment modal. Renders exactly what the feed API already returned in
 * `post.commentPreviews` (server-ranked: viewer's own > friend's > post
 * author's > engagement > recency — see social-store.ts
 * topCommentsForPost). No fetch of its own: fetching every comment per
 * feed card and ranking client-side is exactly what this replaces.
 */
export function CommentPreview({
  comments,
  commentCount,
  onOpen,
}: {
  comments: PreviewComment[] | undefined;
  commentCount: number;
  onOpen: () => void;
}) {
  if (commentCount === 0 || !comments || comments.length === 0) return null;

  return (
    <div className="mt-3 pl-1 space-y-1.5">
      {comments.slice(0, 2).map((comment) => {
        const author = normalizeAuthor(comment.user);
        return (
          <button
            key={comment.id}
            type="button"
            onClick={onOpen}
            className="flex items-start gap-2.5 w-full text-left cursor-pointer group focus-visible:outline-none"
          >
            <Avatar className="w-7 h-7 border border-gray-100 shrink-0">
              <AvatarImage src={getMediaUrl(author.avatarUrl)} alt={author.displayName} />
              <AvatarFallback className="text-[11px]">{author.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="bg-gray-50 group-hover:bg-gray-100 rounded-2xl px-3.5 py-2 min-w-0 transition-colors">
              <span className="font-semibold text-xs text-gray-900">{author.displayName}</span>
              <p
                className="text-sm text-gray-800 break-words"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {comment.text}
              </p>
            </div>
          </button>
        );
      })}
      {commentCount > comments.length && (
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-semibold text-gray-500 hover:text-purple-700 pl-9 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
        >
          View all {commentCount} comments
        </button>
      )}
    </div>
  );
}
