"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { Post } from "@/lib/api/posts";
import { toVideoMedia } from "@/lib/video/types";
import { getMediaUrl } from "@/lib/media";
import { FurtailVideoPlayer } from "@/components/video/furtail-video-player";
import { VideoSocialOverlay } from "@/components/video/video-social-overlay";
import { pauseActiveFeedPlayer } from "@/lib/video/feed-activity";
import { cn } from "@/lib/utils";

/**
 * Immersive, full-viewport Reels-style scroller for `/videos` and
 * `/videos/[id]`.
 *
 * Behavior:
 *  - Native vertical scroll-snap: each slide is exactly one viewport tall.
 *  - An IntersectionObserver (rooted to the scroller, with a centered band
 *    rootMargin) determines the "active" slide. That slide autoplays; every
 *    other slide's player gets `active=false` and pauses.
 *  - Only the active slide and its immediate neighbors mount a real
 *    <video>; all others render a lightweight poster image — we never
 *    create/load dozens of active video elements.
 *  - Mouse wheel / touch swipe work via native scroll + snap. ArrowUp/
 *    ArrowDown scroll to the previous/next slide. On-screen chevrons are
 *    also provided.
 *  - When the active index nears the end of the loaded list, `onFetchMore`
 *    is invoked (cursor pagination) so the feed extends before the user
 *    reaches the last item.
 *  - `onIndexChange` fires on every active-slide change so the page can
 *    sync the URL (router.replace) — keeping Back returning to Home.
 */
export function VideosScroller({
  videos,
  initialIndex = 0,
  onIndexChange,
  onFetchMore,
  hasNextPage = false,
  isFetchingNextPage = false,
  meId,
}: {
  videos: Post[];
  initialIndex?: number;
  onIndexChange?: (id: string | number) => void;
  onFetchMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  meId?: number;
}) {
  const router = useRouter();
  const clamp = (i: number) => Math.min(Math.max(i, 0), Math.max(videos.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(() => clamp(initialIndex));
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);

  // Keep the ref in sync with the active index for event-handler reads
  // (keyboard nav), without touching a ref during render.
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Entering the immersive viewer pauses any Home-feed player that is still
  // registered (belt-and-suspenders: the Home route group normally unmounts,
  // but there is a small window during the transition where a feed video
  // could otherwise keep playing behind the scroller).
  useEffect(() => {
    pauseActiveFeedPlayer();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      const target = el.querySelector(`[data-video-slide="${index}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [],
  );

  // Notify the page when the active slide changes (URL sync).
  useEffect(() => {
    const post = videos[activeIndex];
    if (post) onIndexChange?.(post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, videos]);

  // Cursor-fetch before the end.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (videos.length - activeIndex <= 3) {
      onFetchMore?.();
    }
  }, [activeIndex, hasNextPage, isFetchingNextPage, videos.length, onFetchMore]);

  // Active-slide detection via IntersectionObserver with a centered band.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (Number.isFinite(idx) && idx !== activeIndexRef.current) {
              setActiveIndex(idx);
            }
          }
        }
      },
      {
        root: el,
        rootMargin: "-40% 0px -40% 0px",
        threshold: 0,
      },
    );
    videos.forEach((_, i) => {
      const slide = el.querySelector(`[data-video-slide="${i}"]`);
      if (slide) observer.observe(slide);
    });
    return () => observer.disconnect();
  }, [videos]);

  // Keyboard navigation (ArrowUp/ArrowDown). Ignore while typing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || target?.isContentEditable) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goTo(activeIndexRef.current + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goTo(activeIndexRef.current - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, videos.length]);

  return (
    <div className="relative h-dvh w-full bg-black overflow-hidden">
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-none scroll-smooth">
        {videos.map((post, i) => (
          <VideoSlide
            key={post.id}
            post={post}
            index={i}
            isActive={i === activeIndex}
            mountPlayer={Math.abs(i - activeIndex) <= 1}
            meId={meId}
          />
        ))}
      </div>

      {/* Prev / Next chevrons */}
      {activeIndex > 0 && (
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous video"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-purple-400"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
      {activeIndex < videos.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next video"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-purple-400"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      )}

      {/* Top-left brand + back */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <Link
          href="/videos"
          aria-label="Furtail Videos"
          className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 flex items-center justify-center font-extrabold text-lg text-white tracking-tight select-none transition-colors cursor-pointer"
        >
          Furtail
        </Link>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          aria-label="Close viewer"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5">
        {videos.slice(0, Math.min(videos.length, 40)).map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to video ${i + 1}`}
            aria-current={i === activeIndex}
            className={cn(
              "h-1.5 rounded-full transition-all cursor-pointer",
              i === activeIndex ? "bg-white w-4" : "bg-white/30 hover:bg-white/60 w-1.5",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function VideoSlide({
  post,
  index,
  isActive,
  mountPlayer,
  meId,
}: {
  post: Post;
  index: number;
  isActive: boolean;
  mountPlayer: boolean;
  meId?: number;
}) {
  const videoMediaItem = post.media.find(
    (m) => m.type?.startsWith("video") || m.url.endsWith(".mp4"),
  );
  const videoMedia = videoMediaItem
    ? toVideoMedia(videoMediaItem, post.publicId ?? post.id)
    : null;
  const posterUrl = videoMediaItem?.posterUrl ? getMediaUrl(videoMediaItem.posterUrl) : undefined;

  return (
    <section
      data-video-slide={index}
      aria-label={`Video ${index + 1}`}
      aria-current={isActive ? "true" : undefined}
      className="relative h-screen snap-start snap-always w-full flex items-center justify-center overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="absolute inset-0">
        {mountPlayer && videoMedia ? (
          <FurtailVideoPlayer
            video={videoMedia}
            mode="videos"
            active={isActive}
            className="w-full h-full"
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={post.caption || "Video"}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )}
      </div>

      {/* Social overlay — only on the active slide to keep it inert elsewhere */}
      {isActive && <VideoSocialOverlay post={post} meId={meId} />}
    </section>
  );
}
