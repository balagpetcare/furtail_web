"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * A `div`-shaped click target that stays keyboard-operable (Enter/Space)
 * and screen-reader-visible as a button — used instead of a real `<button>`
 * wherever the content being wrapped (caption text with a nested "See
 * more" button, a media grid cell) already contains its own interactive
 * children, since a `<button>` cannot legally contain another `<button>`.
 * Nested interactive elements are expected to `stopPropagation()` on their
 * own click (CaptionText's "See more" already does), which also
 * suppresses the synthetic click Enter/Space produces on them, so this
 * region's own activation never double-fires.
 */
export function ClickableRegion({
  onActivate,
  ariaLabel,
  className,
  children,
}: {
  onActivate?: () => void;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!onActivate) return <>{children}</>;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn("cursor-pointer focus-visible:outline-2 focus-visible:outline-purple-500 focus-visible:outline-offset-2 rounded-lg", className)}
    >
      {children}
    </div>
  );
}
