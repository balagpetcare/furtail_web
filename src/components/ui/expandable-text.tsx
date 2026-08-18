"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared clamp/expand text block used by both Single Post and Comment
 * Modal comment rendering (see comments.tsx). Uses a real layout
 * measurement (scrollHeight vs clientHeight) rather than a character-count
 * heuristic, so it clamps correctly regardless of script/font (Bangla,
 * English, mixed, long unbroken tokens) — a fixed char count doesn't
 * correlate to line count across scripts. Never slices the stored text;
 * expand/collapse is local UI state only.
 */
export function ExpandableText({
  text,
  clampLines = 3,
  className,
}: {
  text: string;
  clampLines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setNeedsClamp(el.scrollHeight > el.clientHeight + 1);
  }, [text, clampLines]);

  if (!text) return null;

  return (
    <div>
      <p
        ref={ref}
        className={cn(className, "break-words whitespace-pre-wrap")}
        style={
          !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      {needsClamp && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-0.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
