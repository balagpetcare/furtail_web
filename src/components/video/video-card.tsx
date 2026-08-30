"use client";

import React from "react";
import Link from "next/link";
import { Play, Eye } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Post } from "@/lib/api/posts";

/**
 * VideoCard — a clickable thumbnail card for the Videos browse grid.
 * Shows the video's poster image with a play overlay, the author's
 * avatar/name, a caption preview, and the view count. Links to
 * `/videos/[id]` (the immersive video detail page).
 *
 * Reuses the existing `Post` type and `getMediaUrl` — no new API or
 * data shape, just a browse-optimized presentation of the same
 * `GET /posts/videos` payload that the Reels rail already consumes.
 */
export function VideoCard({ post }: { post: Post }) {
  const videoMedia = post.media.find(
    (m) => m.type?.startsWith("video") || m.url.endsWith(".mp4"),
  );
  const posterUrl = videoMedia?.posterUrl
    ? getMediaUrl(videoMedia.posterUrl)
    : undefined;
  const href = `/videos/${post.publicId ?? post.id}`;

  const authorName = post.author.displayName || post.author.username || "Furtail User";
  const avatarUrl = getMediaUrl(post.author.avatarUrl ?? null);
  const avatarFallback = authorName.charAt(0).toUpperCase();

  const caption = post.caption?.trim() || "";

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={caption || "Video"}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Play className="w-10 h-10 text-gray-400" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>

        {/* View count badge */}
        {(post.viewCount ?? post.shareCount ?? 0) > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-[11px] font-medium">
            <Eye className="w-3 h-3" />
            {formatCount(post.viewCount ?? post.shareCount ?? 0)}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2">
        <Avatar className="w-7 h-7 shrink-0 border border-gray-100">
          <AvatarImage src={avatarUrl || undefined} alt={authorName} />
          <AvatarFallback className="text-[10px] bg-purple-50 text-purple-700 font-bold">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {authorName}
          </p>
          <p className="text-xs text-gray-500 line-clamp-2 leading-tight mt-0.5">
            {caption || "Watch this video"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
