import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { postsApi } from "@/lib/api/posts";
import { REACTIONS } from "./reaction-control";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface ReactionListPopoverProps {
  postId: string;
  summary: Record<string, number> | undefined;
  totalCount: number;
  children: React.ReactNode;
}

export function ReactionListPopover({ postId, summary, totalCount, children }: ReactionListPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 300);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["post-reactors", postId, activeTab],
    queryFn: () => postsApi.getPostReactors(postId, activeTab, 50),
    enabled: isOpen,
    staleTime: 60000,
  });

  const availableTabs = ["ALL", ...Object.entries(summary || {}).filter(([_, count]) => count > 0).map(([type]) => type)];

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}

      {isOpen && (
        <div 
          ref={popoverRef}
          className="absolute z-50 bottom-full mb-2 left-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide p-1">
            {availableTabs.map((tab) => {
              const count = tab === "ALL" ? totalCount : (summary?.[tab] ?? 0);
              const def = tab === "ALL" ? null : REACTIONS.find(r => r.type === tab);
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === tab ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {def ? <span className="scale-75 origin-center">{def.icon}</span> : null}
                  <span>{tab === "ALL" ? "All" : count}</span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : data?.items?.length ? (
              <div className="space-y-1">
                {data.items.map((reactor) => {
                  const rDef = REACTIONS.find(r => r.type === reactor.reaction);
                  return (
                    <div key={reactor.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                      <Link href={`/user/${reactor.userId}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden relative">
                          {/* Avatar would go here */}
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100" />
                          {rDef && (
                            <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center bg-white", rDef.color)}>
                              <div className="scale-50 origin-center">{rDef.icon}</div>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-sm text-gray-900 group-hover:underline">{reactor.displayName}</span>
                      </Link>
                      {/* Action button e.g. Add Friend could go here */}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">No reactions yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
