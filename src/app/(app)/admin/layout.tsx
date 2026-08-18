"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Palette, SmileIcon, Zap, Grid3x3, Hash } from "lucide-react";
import { authApi, authKeys } from "@/lib/api/auth";

/**
 * Client-side guard only — a UX convenience so a non-admin never sees the
 * admin shell render, not the actual security boundary. Every admin
 * mutation is independently enforced server-side via requireRole('admin')
 * on /api/v1/admin/taxonomies/* (see furtail_app_api's social.routes.ts) —
 * this check cannot be relied on alone, since client-side JS is trivially
 * bypassable.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
  });

  const isAdmin = user?.roles?.some((role) => role.toLowerCase() === "admin") ?? false;

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="container flex items-center h-16 gap-8">
          <h1 className="text-lg font-bold text-gray-900">Furtail Admin</h1>
          <nav className="flex gap-4">
            <Link
              href="/admin/feelings"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <SmileIcon className="w-4 h-4" />
              Feelings
            </Link>
            <Link
              href="/admin/activities"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Activities
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Grid3x3 className="w-4 h-4" />
              Categories
            </Link>
            <Link
              href="/admin/tags"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Hash className="w-4 h-4" />
              Tags
            </Link>
            <Link
              href="/admin/background-styles"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4" />
              Background Styles
            </Link>
          </nav>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
