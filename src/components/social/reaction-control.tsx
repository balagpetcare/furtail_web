"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Heart, ThumbsUp, Smile, Frown, Flame } from "lucide-react"; // Using lucide for base, but we need custom styles.

export type ReactionType = "LIKE" | "LOVE" | "AWW" | "HAHA" | "WOW" | "SAD" | "ANGRY";

const CustomThumbsUp = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm" fill="#1b74e4">
    <path d="M14.6 8.3L13.8 4c-.2-1.3-1.6-1.8-2.6-1.1L8.3 5.4C7.7 5.8 7.2 6.5 7 7.2V17h9.4c1.1 0 2.2-.7 2.5-1.7l1.7-6.8c.4-1.4-.7-2.7-2.1-2.7h-3.9v2.5z" />
    <path d="M3 8a2 2 0 00-2 2v7a2 2 0 002 2h2V8H3z" />
  </svg>
);

const CustomHeart = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm" fill="#f33e58">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const CustomAww = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="#f7b125" />
    <path d="M7 14c1.5 2.5 5 4 8 2.5" stroke="#895311" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M7 8c1.5-1 3.5 1 2 3-1.5-2-3.5-2-2-3z" fill="#f33e58" />
    <path d="M17 8c-1.5-1-3.5 1-2 3 1.5-2 3.5-2 2-3z" fill="#f33e58" />
  </svg>
);

const CustomHaha = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="#f7b125" />
    <path d="M6 14c2.5 3.5 9.5 3.5 12 0-3-1-9-1-12 0z" fill="#895311" />
    <path d="M7 9c.5-1.5 2.5-1.5 3 0" stroke="#895311" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M14 9c.5-1.5 2.5-1.5 3 0" stroke="#895311" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const CustomWow = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="#f7b125" />
    <circle cx="12" cy="16" r="3" fill="#895311" />
    <circle cx="8" cy="9" r="2" fill="#895311" />
    <circle cx="16" cy="9" r="2" fill="#895311" />
  </svg>
);

const CustomSad = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="#f7b125" />
    <path d="M7 16c2.5-2 7.5-2 10 0" stroke="#895311" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M7 9c.5 1 2.5 1 3 0" stroke="#895311" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M14 9c.5 1 2.5 1 3 0" stroke="#895311" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="8.5" cy="13" r="1" fill="#42a5f5" />
  </svg>
);

const CustomAngry = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="#e95c37" />
    <path d="M6 16c2.5-1 9.5-1 12 0" stroke="#682006" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M6 8l4 2" stroke="#682006" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M18 8l-4 2" stroke="#682006" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="9" cy="11" r="1.5" fill="#682006" />
    <circle cx="15" cy="11" r="1.5" fill="#682006" />
  </svg>
);

export const REACTIONS: { type: ReactionType; label: string; icon: React.ReactNode; color: string; animationClass: string }[] = [
  { type: "LIKE", label: "Like", icon: <CustomThumbsUp />, color: "text-blue-600", animationClass: "animate-reaction-like" },
  { type: "LOVE", label: "Love", icon: <CustomHeart />, color: "text-red-500", animationClass: "animate-reaction-love" },
  { type: "AWW", label: "Aww", icon: <CustomAww />, color: "text-amber-500", animationClass: "animate-reaction-aww" },
  { type: "HAHA", label: "Haha", icon: <CustomHaha />, color: "text-yellow-500", animationClass: "animate-reaction-haha" },
  { type: "WOW", label: "Wow", icon: <CustomWow />, color: "text-amber-500", animationClass: "animate-reaction-wow" },
  { type: "SAD", label: "Sad", icon: <CustomSad />, color: "text-amber-600", animationClass: "animate-reaction-sad" },
  { type: "ANGRY", label: "Angry", icon: <CustomAngry />, color: "text-orange-600", animationClass: "animate-reaction-angry" },
];

interface ReactionControlProps {
  viewerReaction: string | null;
  onReact: (reaction: ReactionType) => void;
  onRemoveReaction: () => void;
  disabled?: boolean;
}

export function ReactionControl({ viewerReaction, onReact, onRemoveReaction, disabled }: ReactionControlProps) {
  const [trayOpen, setTrayOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const suppressHoverRef = useRef(false);

  const handleMouseEnter = () => {
    if (disabled || suppressHoverRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTrayOpen(true), 400); // 400ms hover delay
  };

  const handleMouseLeave = () => {
    suppressHoverRef.current = false;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTrayOpen(false), 300);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (viewerReaction) {
      onRemoveReaction();
    } else {
      onReact("LIKE");
    }
    setTrayOpen(false);
  };

  const activeReactionDef = viewerReaction ? REACTIONS.find(r => r.type === viewerReaction) : null;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer outline-none select-none",
          activeReactionDef ? activeReactionDef.color + " font-semibold" : "text-gray-500 hover:text-purple-600"
        )}
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={!!viewerReaction}
        aria-label={activeReactionDef ? `Reacted with ${activeReactionDef.label}` : "Like"}
      >
        {activeReactionDef ? (
          <span className="scale-110">{activeReactionDef.icon}</span>
        ) : (
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-transparent stroke-current transition-transform active:scale-120" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        )}
        <span>{activeReactionDef ? activeReactionDef.label : "Like"}</span>
      </button>

      {trayOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 p-1.5 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              className="relative p-2 rounded-full hover:bg-gray-50 transition-all hover:-translate-y-1 hover:scale-125 focus:scale-125 outline-none group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onReact(reaction.type);
                setTrayOpen(false);
                suppressHoverRef.current = true;
              }}
              aria-label={reaction.label}
            >
              <div className={cn(reaction.color, "transition-transform")}>
                {reaction.icon}
              </div>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {reaction.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
