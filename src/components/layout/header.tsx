"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authKeys, authApi } from "@/lib/api/auth";
import { getMediaUrl } from "@/lib/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { MessagesBadge, NotificationsBadge } from "./nav-badge";
import { 
  Home, 
  Compass, 
  Users, 
  MessageCircle, 
  Bell, 
  Plus, 
  Search, 
  Settings, 
  User, 
  LogOut 
} from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const { data: user } = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe(),
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/people", icon: Users, label: "People" },
  ];

  const displayName = user?.profile?.displayName || "Furtail Member";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-14 sticky top-0 z-30 w-full px-6 flex items-center justify-between shadow-sm/5">
      {/* Left Area: Logo & Global Search */}
      <div className="flex items-center gap-4 md:w-80">
        <Link href="/" className="font-extrabold text-xl text-purple-600 tracking-tight flex items-center gap-1.5 select-none hover:opacity-90 active:scale-98 transition-all">
          <span>Furtail</span>
        </Link>
        
        {/* Search input for desktop */}
        <form action="/search" method="GET" className="relative hidden md:block w-48 lg:w-60">
          <SearchInput
            name="q"
            placeholder="Search Furtail..."
            className="py-1.5 pl-9 text-xs"
          />
        </form>

        {/* Collapsed Search button for mobile */}
        <Link href="/search" className="md:hidden w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200/80 active:scale-95 transition-all">
          <Search className="w-4 h-4" />
        </Link>
      </div>

      {/* Center Area: Primary Social Shortcuts (Desktop only) */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2 h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center px-6 lg:px-8 h-full relative transition-colors ${
                isActive 
                  ? "text-purple-600" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/50"
              }`}
            >
              <Icon className="w-5 h-5 stroke-[2]" />
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-purple-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Area: Actions & Avatar */}
      <div className="flex items-center gap-2.5 md:w-80 justify-end">
        {/* Create Shortcut (Links to pet registration) */}
        <Link 
          href="/pet/new" 
          title="Add a pet"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200/80 text-gray-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
        </Link>

        {/* Messages Shortcut */}
        <Link 
          href="/messages" 
          title="Messages"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200/80 text-gray-700 flex items-center justify-center relative transition-colors cursor-pointer active:scale-95"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <MessagesBadge />
        </Link>

        {/* Notifications Shortcut */}
        <Link 
          href="/notifications" 
          title="Notifications"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200/80 text-gray-700 flex items-center justify-center relative transition-colors cursor-pointer active:scale-95"
        >
          <Bell className="w-4.5 h-4.5" />
          <NotificationsBadge />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none cursor-pointer active:scale-95 transition-transform">
            <Avatar className="w-9 h-9 border border-gray-100 hover:opacity-90 transition-opacity">
              <AvatarImage src={getMediaUrl(user?.profile?.avatarMedia?.url ?? null)} alt="Avatar" />
              <AvatarFallback className="bg-purple-50 text-purple-700 text-[11px] font-bold">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-lg border border-gray-100">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-gray-900 truncate">{displayName}</span>
                  {user?.profile?.username && (
                    <span className="text-xs text-gray-500 truncate">@{user.profile.username}</span>
                  )}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-gray-100" />
            
            <DropdownMenuItem className="cursor-pointer gap-2 py-2">
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <User className="w-4 h-4 text-gray-500" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer gap-2 py-2">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-100" />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 focus:text-red-700 cursor-pointer gap-2 py-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
