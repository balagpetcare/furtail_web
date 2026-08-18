"use client";

import React from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pure presentational toolbar for MediaCarousel's viewer chrome (Single
 * Post + Comment Modal both render the same carousel, so this stays a
 * separate component rather than being duplicated inline). Zoom controls
 * are omitted entirely for video items — native video controls (seek,
 * play, volume) must never be fought over with a zoom/pan layer.
 */
export function MediaViewerControls({
  showZoom,
  zoom,
  maxZoom,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFullscreen,
  className,
}: {
  showZoom: boolean;
  zoom: number;
  maxZoom: number;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
  className?: string;
}) {
  const btnClass =
    "w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className={cn("absolute top-2 right-2 z-10 flex items-center gap-1.5", className)}>
      {showZoom && (
        <>
          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className={btnClass}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={zoom === 1}
            aria-label="Reset zoom"
            className={btnClass}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoom >= maxZoom}
            aria-label="Zoom in"
            className={btnClass}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className={btnClass}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>
    </div>
  );
}
