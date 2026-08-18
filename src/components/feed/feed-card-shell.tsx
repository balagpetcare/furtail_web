"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Common visual shell for every feed card kind (social post, adoption
 * listing, fundraising campaign) — header/avatar/name/meta/menu, body
 * (caption + media + kind-specific extra), stats row, actions row, and an
 * optional footer (comment previews — posts only). Each kind owns its own
 * data fetching/mutations and passes rendered slots in; the shell only
 * owns layout, so business logic never lives here and never duplicates
 * across kinds. `rounded-none sm:rounded-2xl border-x-0 sm:border-x` makes
 * cards edge-to-edge on mobile, matching the Home page's own edge-to-edge
 * wrapper.
 */
export interface FeedCardShellProps {
  avatarUrl?: string | null;
  avatarFallback: string;
  avatarHref: string;
  title: React.ReactNode;
  meta: React.ReactNode;
  menu?: React.ReactNode;
  kindBadge?: React.ReactNode;
  body: React.ReactNode;
  statsRow?: React.ReactNode;
  actionsRow?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FeedCardShell({
  avatarUrl,
  avatarFallback,
  avatarHref,
  title,
  meta,
  menu,
  kindBadge,
  body,
  statsRow,
  actionsRow,
  footer,
  className,
}: FeedCardShellProps) {
  return (
    <Card
      className={cn(
        "p-5 mb-5 rounded-none sm:rounded-2xl border-x-0 sm:border-x border-gray-100/90 bg-white hover:border-gray-200/50 hover:shadow-sm transition-all duration-200",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 items-center min-w-0">
          <Link href={avatarHref} className="shrink-0 group">
            <Avatar className="w-10 h-10 border border-gray-100/80 group-hover:opacity-90 transition-opacity">
              <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
              <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={avatarHref}
                className="font-semibold text-gray-950 text-sm hover:underline hover:text-purple-700 transition-colors leading-tight truncate"
              >
                {title}
              </Link>
              {kindBadge}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">{meta}</div>
          </div>
        </div>
        {menu}
      </div>

      <div className="mb-1 pl-1">{body}</div>

      {statsRow && <div className="pl-1">{statsRow}</div>}
      {actionsRow && (
        <div className="flex items-center gap-6 border-t border-gray-100 pt-3.5 text-gray-500 text-sm pl-1">
          {actionsRow}
        </div>
      )}
      {footer}
    </Card>
  );
}
