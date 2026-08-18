"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Shared author row (avatar/name/username/timestamp/menu) — used by both
 * the Single Post page and the Comment modal so the two surfaces render
 * identical author info instead of duplicating this markup.
 */
export function PostHeader({
  avatarUrl,
  avatarFallback,
  avatarHref,
  title,
  meta,
  menu,
}: {
  avatarUrl?: string | null;
  avatarFallback: string;
  avatarHref: string;
  title: React.ReactNode;
  meta: React.ReactNode;
  menu?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={avatarHref} className="flex items-center gap-3 min-w-0 group">
        <Avatar className="w-10 h-10 border border-gray-100 shrink-0 group-hover:opacity-90 transition-opacity">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold">{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-950 truncate group-hover:underline leading-tight">{title}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">{meta}</div>
        </div>
      </Link>
      {menu && <div className="shrink-0">{menu}</div>}
    </div>
  );
}
