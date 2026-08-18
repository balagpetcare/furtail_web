"use client";

import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { storiesApi, storiesKeys, groupStoriesByAuthor, type StoryTray as StoryTrayModel } from "@/lib/api/stories";
import { authKeys, authApi } from "@/lib/api/auth";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HorizontalScroller } from "@/components/ui/design-system";
import { StoryViewerModal } from "@/components/stories/story-viewer-modal";

/**
 * Real, Postgres-backed 24h stories rail (`Story`/`StoryView` tables, see
 * docs/furtail-web-api-contract-map.md) — not faked. Own-story tile always
 * shows first (upload trigger); other authors follow in feed order.
 */
export function StoryTray() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingTrayIndex, setViewingTrayIndex] = useState<number | null>(null);

  const { data: me } = useQuery({ queryKey: authKeys.me, queryFn: () => authApi.getMe() });

  const { data: stories, isLoading } = useQuery({
    queryKey: storiesKeys.feed(),
    queryFn: () => storiesApi.getFeed(),
  });

  const trays = groupStoriesByAuthor(stories ?? []);
  const ownTray = trays.find((t) => t.isOwnStory);
  const otherTrays = trays.filter((t) => !t.isOwnStory);
  const orderedTrays: StoryTrayModel[] = ownTray ? [ownTray, ...otherTrays] : otherTrays;

  const createMutation = useMutation({
    mutationFn: (file: File) => storiesApi.createStory(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storiesKeys.feed() });
      toast.success("Story posted");
    },
    onError: () => toast.error("Failed to post story"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) createMutation.mutate(file);
    e.target.value = "";
  };

  if (!isLoading && orderedTrays.length === 0 && !me) return null;

  const avatarUrl = me?.profile.avatarMedia?.url ?? null;

  return (
    <div className="mb-5 px-4 sm:px-0">
      <HorizontalScroller>
        {isLoading && !me && (
          <div className="w-24 shrink-0 snap-start rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
        )}

        {me && (
          <button
            type="button"
            onClick={() => (ownTray ? setViewingTrayIndex(0) : fileInputRef.current?.click())}
            disabled={createMutation.isPending}
            className="w-24 shrink-0 snap-start relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] cursor-pointer text-left disabled:opacity-60"
          >
            {avatarUrl ? (
              <img src={getMediaUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-purple-600 ring-2 ring-white flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <p className="absolute bottom-1 left-0 right-0 text-center text-white text-[11px] font-semibold px-1 truncate">
              {ownTray ? "Your story" : "Add to story"}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          </button>
        )}

        {isLoading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="w-24 shrink-0 snap-start rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
          ))}

        {otherTrays.map((tray, i) => (
          <button
            key={tray.userId}
            type="button"
            onClick={() => setViewingTrayIndex(ownTray ? i + 1 : i)}
            className="w-24 shrink-0 snap-start relative rounded-2xl overflow-hidden bg-gray-900 aspect-[3/4] cursor-pointer text-left"
          >
            {tray.stories[0]?.thumbnailUrl || tray.stories[0]?.mediaUrl ? (
              <img
                src={getMediaUrl(tray.stories[0].thumbnailUrl || tray.stories[0].mediaUrl)}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
            <div
              className={cn(
                "absolute top-2 left-2 w-8 h-8 rounded-full ring-2 overflow-hidden bg-gray-300",
                tray.allViewed ? "ring-gray-300" : "ring-purple-500"
              )}
            >
              {tray.userAvatarUrl && <img src={getMediaUrl(tray.userAvatarUrl)} alt="" className="w-full h-full object-cover" />}
            </div>
            <p className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-[11px] font-semibold truncate">
              {tray.userName}
            </p>
          </button>
        ))}
      </HorizontalScroller>

      {viewingTrayIndex !== null && (
        <StoryViewerModal
          trays={orderedTrays}
          initialTrayIndex={viewingTrayIndex}
          onClose={() => setViewingTrayIndex(null)}
        />
      )}
    </div>
  );
}
