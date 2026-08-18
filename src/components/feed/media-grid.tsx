"use client";

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { ClickableRegion } from "@/components/feed/clickable-region";

export interface FeedMediaItem {
  id: number | string;
  url: string;
  type?: string;
}

export function isVideoMedia(item: FeedMediaItem): boolean {
  return Boolean(item.type?.startsWith("video") || item.url.endsWith(".mp4"));
}

/**
 * Shared post/adoption/fundraising media rendering — extracted from the
 * original PostCard so all feed card kinds get the same grid math (1-up,
 * 2-up, 3-up asymmetric, 4-up +N overlay) instead of three copies of it.
 */
export function MediaGrid({
  media,
  onOpen,
  className,
}: {
  media: FeedMediaItem[];
  onOpen?: (index: number) => void;
  className?: string;
}) {
  if (!media || media.length === 0) return null;

  return (
    <div className={cn("mt-3.5 rounded-xl overflow-hidden bg-gray-50 border border-gray-100/70", className)}>
      {media.length === 1 ? (
        <GridCell item={media[0]} index={0} onOpen={onOpen} className="rounded-none" />
      ) : (
        <div className="grid gap-1 bg-gray-100/60 grid-cols-2">
          {media.slice(0, 4).map((item, index) => (
            <GridCell
              key={item.id}
              item={item}
              index={index}
              onOpen={onOpen}
              className={cn(
                "aspect-square rounded-none",
                media.length === 3 && index === 0 ? "row-span-2 aspect-auto h-full min-h-[250px]" : ""
              )}
              overflowBadge={media.length > 4 && index === 3 ? media.length - 4 : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GridCell({
  item,
  index,
  onOpen,
  className,
  overflowBadge,
}: {
  item: FeedMediaItem;
  index: number;
  onOpen?: (index: number) => void;
  className?: string;
  overflowBadge?: number;
}) {
  // Video cells don't wrap in a click-to-open region — a `<video controls>`
  // needs raw mouse/touch access to its own play/scrub/volume controls, and
  // stacking a click-intercepting wrapper around it produces inconsistent
  // behavior across browsers (some let control clicks bubble, some don't).
  // Native controls are already keyboard-operable once focused, so this
  // isn't an accessibility regression, just a deliberately narrower "click
  // opens the modal" surface for video specifically.
  if (isVideoMedia(item)) {
    return (
      <div className={cn("relative overflow-hidden bg-gray-50 flex items-center justify-center", className)}>
        <MediaItem mediaItem={item} />
        {overflowBadge !== undefined && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg select-none pointer-events-none">
            +{overflowBadge}
          </div>
        )}
      </div>
    );
  }

  return (
    <ClickableRegion
      onActivate={onOpen ? () => onOpen(index) : undefined}
      ariaLabel={`Open media ${index + 1}`}
      className={cn("relative overflow-hidden bg-gray-50 flex items-center justify-center block", className)}
    >
      <MediaItem mediaItem={item} />
      {overflowBadge !== undefined && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg select-none pointer-events-none">
          +{overflowBadge}
        </div>
      )}
    </ClickableRegion>
  );
}

export function MediaItem({ mediaItem }: { mediaItem: FeedMediaItem }) {
  const [error, setError] = useState(false);
  const mediaUrl = mediaItem.url;

  if (error || !mediaUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-gray-400 bg-gray-50/50 w-full h-full min-h-[180px]">
        <ImageOff className="w-8 h-8 mb-2 stroke-[1.5]" />
        <span className="text-sm">Attachment unavailable</span>
      </div>
    );
  }

  if (isVideoMedia(mediaItem)) {
    return (
      <video
        src={getMediaUrl(mediaUrl)}
        controls
        className="w-full h-full max-h-[500px] object-cover outline-none"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      src={getMediaUrl(mediaUrl)}
      alt="Post attachment"
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover max-h-[500px] transition-transform hover:scale-[1.005] duration-300"
      onError={() => setError(true)}
    />
  );
}
