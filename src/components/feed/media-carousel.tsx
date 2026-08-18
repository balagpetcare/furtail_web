"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Download } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { isVideoMedia, type FeedMediaItem } from "@/components/feed/media-grid";
import { MediaViewerControls } from "@/components/feed/media-viewer-controls";

const SWIPE_THRESHOLD_PX = 50;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;

/**
 * Two rendering modes, one implementation (no duplicated
 * swipe/keyboard-nav/dot-indicator logic between them):
 *  - "viewer" (default): the immersive Single Post black-stage lightbox —
 *    zoom/pan/fullscreen toolbar, black background, object-contain against
 *    a fixed-height stage.
 *  - "inline": the Facebook-style Post Detail modal's white post body —
 *    no black background, no zoom/pan/fullscreen (none of that state is
 *    even constructed), media sizes naturally in normal document flow. A
 *    small Download action replaces the toolbar for image-only items,
 *    never for video.
 * Arrow keys, on-screen arrows (desktop), and touch swipe (mobile) drive
 * the same `index` state in both modes.
 */
export function MediaCarousel({
  media,
  initialIndex = 0,
  className,
  showViewerControls = true,
  variant = "viewer",
}: {
  media: FeedMediaItem[];
  initialIndex?: number;
  className?: string;
  showViewerControls?: boolean;
  variant?: "viewer" | "inline";
}) {
  // Pure dispatcher — no hooks of its own, so branching on `variant` here
  // can never violate rules-of-hooks regardless of which branch's hooks run.
  if (variant === "inline") {
    return <InlineMediaGallery media={media} initialIndex={initialIndex} className={className} />;
  }
  return (
    <ViewerMediaCarousel
      media={media}
      initialIndex={initialIndex}
      className={className}
      showViewerControls={showViewerControls}
    />
  );
}

function ViewerMediaCarousel({
  media,
  initialIndex = 0,
  className,
  showViewerControls = true,
}: {
  media: FeedMediaItem[];
  initialIndex?: number;
  className?: string;
  showViewerControls?: boolean;
}) {
  const clamp = (i: number) => Math.min(Math.max(i, 0), Math.max(media.length - 1, 0));
  // Callers remount this component with `key={initialIndex}` whenever they
  // want the start index to change (e.g. clicking a different thumbnail in
  // the feed-card grid) — so `initialIndex` only ever needs to seed state
  // once, no effect-based reset required.
  const [index, setIndex] = useState(clamp(initialIndex));
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));
  const goNext = () => setIndex((i) => Math.min(i + 1, media.length - 1));

  // Zoom/pan is per-slide — jumping to a different image at a stale zoom
  // level would be disorienting, so every slide change resets to fit. Reset
  // during render (React's recommended "adjusting state when a prop
  // changes" pattern) rather than in an effect, to avoid an extra render pass.
  const [zoomedForIndex, setZoomedForIndex] = useState(index);
  if (zoomedForIndex !== index) {
    setZoomedForIndex(index);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Don't hijack keys while the user is typing in the comment composer.
      if (tag === "TEXTAREA" || tag === "INPUT" || target?.isContentEditable) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, media.length - 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z * ZOOM_STEP, MAX_ZOOM));
      if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(z / ZOOM_STEP, 1));
      if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media.length]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (media.length === 0) return null;
  const current = media[index];
  const currentIsVideo = isVideoMedia(current);

  const zoomIn = () => setZoom((z) => Math.min(z * ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () =>
    setZoom((z) => {
      const next = Math.max(z / ZOOM_STEP, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1 || currentIsVideo) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.startPanX + dx, y: dragRef.current.startPanY + dy });
  };
  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full select-none touch-pan-y bg-black", className)}
      onTouchStart={(e) => {
        if (zoom > 1) return;
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (delta > SWIPE_THRESHOLD_PX) goPrev();
        else if (delta < -SWIPE_THRESHOLD_PX) goNext();
        touchStartX.current = null;
      }}
    >
      <div
        className={cn("w-full h-full flex items-center justify-center overflow-hidden", zoom > 1 && !currentIsVideo && "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 150ms ease-out",
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <CarouselItem item={current} />
        </div>
      </div>

      {showViewerControls && (
        <MediaViewerControls
          showZoom={!currentIsVideo}
          zoom={zoom}
          maxZoom={MAX_ZOOM}
          isFullscreen={isFullscreen}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetZoom}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {media.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous media"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next media"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Go to media ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  i === index ? "bg-white w-4" : "bg-white/40 w-1.5 hover:bg-white/60"
                )}
              />
            ))}
          </div>

          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-semibold px-2 py-0.5 rounded-full pointer-events-none">
            {index + 1}/{media.length}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * "inline" MediaCarousel variant — see the doc comment above MediaCarousel.
 * Deliberately its own small component rather than threading a variant
 * flag through every zoom/pan/fullscreen line above: there is no zoom/pan/
 * fullscreen state here at all, not just hidden UI for it.
 */
function InlineMediaGallery({
  media,
  initialIndex = 0,
  className,
}: {
  media: FeedMediaItem[];
  initialIndex?: number;
  className?: string;
}) {
  const clamp = (i: number) => Math.min(Math.max(i, 0), Math.max(media.length - 1, 0));
  const [index, setIndex] = useState(clamp(initialIndex));
  const touchStartX = useRef<number | null>(null);

  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));
  const goNext = () => setIndex((i) => Math.min(i + 1, media.length - 1));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || target?.isContentEditable) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, media.length - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media.length]);

  if (media.length === 0) return null;
  const current = media[index];
  const currentIsVideo = isVideoMedia(current);
  const currentUrl = current.url ? getMediaUrl(current.url) : undefined;

  return (
    <div
      className={cn("relative w-full select-none", className)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (delta > SWIPE_THRESHOLD_PX) goPrev();
        else if (delta < -SWIPE_THRESHOLD_PX) goNext();
        touchStartX.current = null;
      }}
    >
      <div className="w-full flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden max-h-[70vh]">
        <CarouselItem item={current} naturalSize />
      </div>

      {!currentIsVideo && currentUrl && (
        <a
          href={currentUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download image"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200 flex items-center justify-center text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <Download className="w-4 h-4" />
        </a>
      )}

      {media.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous media"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200 items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next media"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200 items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          )}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Go to media ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  i === index ? "bg-purple-600 w-4" : "bg-gray-300 w-1.5 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CarouselItem({ item, naturalSize = false }: { item: FeedMediaItem; naturalSize?: boolean }) {
  const [error, setError] = useState(false);
  const url = item.url ? getMediaUrl(item.url) : undefined;

  if (error || !url) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
        <ImageOff className="w-10 h-10 mb-2 stroke-[1.5]" />
        <span className="text-sm">Media unavailable</span>
      </div>
    );
  }

  const sizeClassName = naturalSize
    ? "max-w-full max-h-[70vh] w-auto h-auto object-contain"
    : "max-w-full max-h-full w-auto h-auto object-contain";

  if (isVideoMedia(item)) {
    return (
      <video
        key={item.id}
        src={url}
        controls
        playsInline
        preload="metadata"
        className={sizeClassName}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      key={item.id}
      src={url}
      alt="Post media"
      className={sizeClassName}
      onError={() => setError(true)}
    />
  );
}
