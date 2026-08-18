"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taxonomyApi, taxonomyKeys } from "@/lib/api/taxonomies";

const CLAMP_LENGTH = 220;

interface CaptionTextProps {
  text: string | null | undefined;
  className?: string;
  backgroundStyle?: string | null;
}

/** Shared "See more" caption clamp reused by post/adoption/fundraising cards. */
export function CaptionText({ text, className, backgroundStyle }: CaptionTextProps) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  // Load background style colors if provided
  const backgroundStylesQuery = useQuery({
    queryKey: taxonomyKeys.backgroundStyles(),
    queryFn: () => taxonomyApi.getBackgroundStyles(),
    enabled: !!backgroundStyle,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const selectedStyle = backgroundStyle
    ? backgroundStylesQuery.data?.data?.find((s) => s.key === backgroundStyle)
    : null;

  const isLong = text.length > CLAMP_LENGTH;
  const shown = expanded || !isLong ? text : `${text.slice(0, CLAMP_LENGTH).trimEnd()}…`;

  // If has background style, render with background
  if (selectedStyle) {
    return (
      <div
        className="p-4 rounded-lg text-center break-words whitespace-pre-wrap text-sm leading-relaxed"
        style={{
          backgroundColor: selectedStyle.colorValue || "#f3f4f6",
          color: selectedStyle.textColor || "#1f2937",
        }}
      >
        <span>
          {shown}
          {isLong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="ml-1.5 font-semibold opacity-80 hover:opacity-100 cursor-pointer"
            >
              {expanded ? "See less" : "See more"}
            </button>
          )}
        </span>
      </div>
    );
  }

  // Default rendering without background
  return (
    <p className={className ?? "text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap"}>
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="ml-1.5 text-gray-500 font-semibold hover:text-purple-700 cursor-pointer"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
}
