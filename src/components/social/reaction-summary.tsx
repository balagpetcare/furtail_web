import React from "react";
import { REACTIONS, type ReactionType } from "./reaction-control";
import { ReactionListPopover } from "./reaction-list-popover";
import { cn } from "@/lib/utils";

interface ReactionSummaryProps {
  postId: string;
  summary: Record<string, number> | undefined;
  totalCount: number;
  topReactors?: Array<{
    id: string;
    userId: string;
    displayName: string;
    reaction: string;
  }>;
}

export function ReactionSummary({ postId, summary, totalCount, topReactors }: ReactionSummaryProps) {
  if (totalCount === 0 && !summary) return null;
  
  // Sort by count descending, pick top 3
  const topReactions = summary
    ? Object.entries(summary)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type as ReactionType)
    : [];

  // Generate text summary
  let textSummary = "";
  if (topReactors && topReactors.length > 0) {
    const names = topReactors.slice(0, 2).map((r) => r.displayName.split(" ")[0]); // just first names for brevity
    const remaining = totalCount - names.length;
    
    if (names.length === 1) {
      textSummary = remaining > 0 ? `${names[0]} and ${remaining} other${remaining > 1 ? "s" : ""}` : names[0];
    } else if (names.length === 2) {
      textSummary = remaining > 0 ? `${names[0]}, ${names[1]} and ${remaining} other${remaining > 1 ? "s" : ""}` : `${names[0]} and ${names[1]}`;
    }
  } else {
    textSummary = `${totalCount} like${totalCount !== 1 ? "s" : ""}`;
  }

  // Fallback to generic text if no specific breakdown
  if (topReactions.length === 0) {
    if (totalCount === 0) return null;
    return <div className="text-gray-500">{textSummary}</div>;
  }

  const content = (
    <div className="flex items-center gap-1.5 text-gray-500 cursor-pointer hover:underline">
      <div className="flex -space-x-1">
        {topReactions.map((type, i) => {
          const reactionDef = REACTIONS.find((r) => r.type === type);
          if (!reactionDef) return null;
          return (
            <div 
              key={type}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center bg-white border border-white z-" + (10 - i),
                reactionDef.color
              )}
              title={reactionDef.label}
            >
              {/* Scaled down icon for the summary */}
              <div className="scale-75 origin-center -ml-[2px] -mt-[2px]">
                {reactionDef.icon}
              </div>
            </div>
          );
        })}
      </div>
      <span>{textSummary}</span>
    </div>
  );

  return (
    <ReactionListPopover postId={postId} summary={summary} totalCount={totalCount}>
      {content}
    </ReactionListPopover>
  );
}
