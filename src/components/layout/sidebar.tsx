"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, User, Bell, MessageCircle, Settings, Heart, Gift } from "lucide-react";
import { MessagesBadge, NotificationsBadge } from "./nav-badge";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/people", label: "People", icon: Users },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: MessagesBadge },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: NotificationsBadge },
    { href: "/fundraising", label: "Fundraising", icon: Heart },
    { href: "/adoption", label: "Adoption", icon: Gift },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100/70 p-4 shadow-sm">
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const Badge = link.badge;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all group duration-200 outline-none focus-visible:ring-2 focus-visible:ring-purple-200 ${
                isActive
                  ? "bg-purple-50 text-purple-700 font-semibold shadow-sm/5"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-purple-600" : "text-gray-500 group-hover:text-gray-900"
                }`} />
                {Badge && <Badge />}
              </span>
              <span className="hidden xl:block text-[14px]">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
