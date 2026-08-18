"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";

/**
 * Shared avatar/name → profile link pieces, used by comment authors in
 * both Single Post and Comment Modal (comments.tsx). Always links to the
 * real comment author's own id (never the viewer) — see normalizeAuthor().
 * Split into two components (rather than one wrapper) because the avatar
 * and display name render in disjoint parts of the comment bubble markup
 * (avatar outside the bubble, name inside it) — not because their behavior
 * differs. stopPropagation guards against any ancestor click handlers.
 */
function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function ProfileAvatarLink({
  userId,
  displayName,
  avatarUrl,
  className,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/profile/${userId}`}
      onClick={stop}
      aria-label={`View ${displayName}'s profile`}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      <Avatar className={className ?? "w-8 h-8 border border-gray-100"}>
        <AvatarImage src={getMediaUrl(avatarUrl)} alt={displayName} />
        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    </Link>
  );
}

export function ProfileNameLink({
  userId,
  displayName,
  className,
}: {
  userId: string;
  displayName: string;
  className?: string;
}) {
  return (
    <Link
      href={`/profile/${userId}`}
      onClick={stop}
      className={
        className ??
        "font-semibold text-sm text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
      }
    >
      {displayName}
    </Link>
  );
}
