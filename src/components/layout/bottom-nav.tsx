"use client";

import React from "react";
import Link from "next/link";
import { Home, Compass, Bell, MessageCircle, User } from "lucide-react";
import { MessagesBadge, NotificationsBadge } from "./nav-badge";

export function BottomNav() {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: MessagesBadge },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: NotificationsBadge },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between pb-safe">
      {links.map((link) => {
        const Icon = link.icon;
        const Badge = link.badge;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-purple-600"
          >
            <span className="relative">
              <Icon className="w-6 h-6" />
              {Badge && <Badge />}
            </span>
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
