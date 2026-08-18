"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { storiesApi, storiesKeys, type StoryTray } from "@/lib/api/stories";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORY_DURATION_MS = 5000;

export function StoryViewerModal({
  trays,
  initialTrayIndex,
  onClose,
}: {
  trays: StoryTray[];
  initialTrayIndex: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [trayIndex, setTrayIndex] = useState(initialTrayIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  const tray = trays[trayIndex];
  const story = tray?.stories[storyIndex];

  const viewMutation = useMutation({
    mutationFn: (id: number | string) => storiesApi.viewStory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storiesKeys.feed() }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => storiesApi.deleteStory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storiesKeys.feed() });
      toast.success("Story deleted");
      onClose();
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const goNextStory = () => {
    if (!tray) return;
    if (storyIndex < tray.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (trayIndex < trays.length - 1) {
      setTrayIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (trayIndex > 0) {
      setTrayIndex((i) => i - 1);
      setStoryIndex(0);
    }
  };

  useEffect(() => {
    if (!story) return;
    if (!story.isViewedByMe && !story.isOwnStory) {
      viewMutation.mutate(story.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  if (!tray || !story) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 bg-black ring-0 max-w-sm w-full h-[85vh] sm:h-[80vh] overflow-hidden rounded-2xl"
      >
        <DialogTitle className="sr-only">{tray.userName}&apos;s story</DialogTitle>

        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {tray.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              {i < storyIndex ? (
                <div className="h-full w-full bg-white" />
              ) : i === storyIndex ? (
                <div
                  key={`${trayIndex}-${storyIndex}`}
                  className="h-full bg-white"
                  style={{ animation: `story-progress ${STORY_DURATION_MS}ms linear forwards` }}
                  onAnimationEnd={goNextStory}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {tray.userAvatarUrl && (
              <img src={getMediaUrl(tray.userAvatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50" />
            )}
            <span className="text-white text-sm font-semibold truncate">{tray.userName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {story.isOwnStory && (
              <button
                type="button"
                onClick={() => deleteMutation.mutate(story.id)}
                aria-label="Delete story"
                className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {story.mediaType === "video" ? (
            <video src={getMediaUrl(story.mediaUrl)} className="w-full h-full object-contain" autoPlay muted playsInline />
          ) : (
            <img src={getMediaUrl(story.mediaUrl)} alt="" className="w-full h-full object-contain" />
          )}
        </div>

        {story.caption && (
          <p className="absolute bottom-4 left-3 right-3 text-white text-sm text-center bg-black/30 rounded-xl px-3 py-2">
            {story.caption}
          </p>
        )}

        <button
          type="button"
          onClick={goPrevStory}
          aria-label="Previous story"
          className={cn("absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer", "flex items-center justify-start pl-1 opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity")}
        >
          <ChevronLeft className="w-6 h-6 text-white/80" />
        </button>
        <button
          type="button"
          onClick={goNextStory}
          aria-label="Next story"
          className={cn("absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer", "flex items-center justify-end pr-1 opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity")}
        >
          <ChevronRight className="w-6 h-6 text-white/80" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
