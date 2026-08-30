"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { RightSidebar } from "./right-sidebar";
import { markAppVisited } from "@/lib/return-navigation";
import { GlobalUploadIndicator } from "./global-upload-indicator";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Lets `/post/[id]`'s Close button tell "reached via a real in-app
  // navigation" apart from "landed directly on this URL" — see
  // return-navigation.ts. AppShell is exactly the boundary for that: it's
  // what every normal in-app page renders through, and `/post/[id]`
  // deliberately does not (see its own route-group layout).
  useEffect(() => {
    markAppVisited();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 w-full flex flex-col text-gray-900 font-sans antialiased">
      {/* Sticky Global Top Header */}
      <Header />
      
      {/* Global Upload Progress Indicator */}
      <GlobalUploadIndicator />

      <div className="w-full max-w-7xl mx-auto flex flex-row relative flex-1 px-0 sm:px-6 lg:px-8 gap-6">
        {/* Desktop/Tablet Left Sidebar */}
        <aside className="hidden md:flex flex-col w-20 xl:w-64 shrink-0 sticky top-14 h-[calc(100vh-56px)] py-4">
          <Sidebar />
        </aside>

        {/* Main Content Workspace — edge-to-edge on mobile (no shell gutter below sm; pages that want their own mobile inset already add `px-4 sm:px-0` themselves), inset with borders from sm up. */}
        <main className="flex-1 min-w-0 max-w-2xl bg-white min-h-[calc(100vh-56px)] border-x-0 sm:border-x border-gray-100/70 pb-16 md:pb-8 shadow-sm">
          {children}
        </main>

        {/* Desktop Right Sidebar */}
        <aside className="hidden lg:block w-76 xl:w-80 shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-4">
          <RightSidebar />
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 w-full z-30">
        <BottomNav />
      </div>
    </div>
  );
}
