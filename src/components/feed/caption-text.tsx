"use client";

import React, { useState } from "react";

const CLAMP_LENGTH = 220;

/** Shared "See more" caption clamp reused by post/adoption/fundraising cards. */
export function CaptionText({ text, className }: { text: string | null | undefined; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > CLAMP_LENGTH;
  const shown = expanded || !isLong ? text : `${text.slice(0, CLAMP_LENGTH).trimEnd()}…`;

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
