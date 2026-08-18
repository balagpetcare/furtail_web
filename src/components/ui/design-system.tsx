import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, RefreshCw, type LucideIcon } from "lucide-react";

// PageContainer Component
export function PageContainer({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("w-full max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6", className)} {...props}>
      {children}
    </div>
  );
}

// Surface Component (Clean elevated card container)
export function Surface({ className, children, elevated = false, ...props }: React.ComponentProps<"div"> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-100 rounded-2xl p-4 md:p-5",
        elevated ? "shadow-sm" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// AvatarWithPresence Component
export interface AvatarWithPresenceProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "default" | "sm" | "lg";
  isOnline?: boolean;
  className?: string;
}

export function AvatarWithPresence({
  src,
  alt = "Avatar",
  fallback = "U",
  size = "default",
  isOnline = false,
  className,
}: AvatarWithPresenceProps) {
  return (
    <div className="relative inline-block shrink-0">
      <Avatar size={size} className={className}>
        <AvatarImage src={src || undefined} alt={alt} />
        <AvatarFallback className="font-bold text-xs bg-purple-50 text-purple-700">
          {fallback}
        </AvatarFallback>
      </Avatar>
      {isOnline && (
        <span className={cn(
          "absolute rounded-full bg-emerald-500 ring-2 ring-white z-10",
          size === "sm" ? "size-2 right-0 bottom-0" :
          size === "lg" ? "size-3 right-0.5 bottom-0.5" :
          "size-2.5 right-0 bottom-0"
        )} />
      )}
    </div>
  );
}

// IconButton Component
export interface IconButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  children: React.ReactNode;
}

export function IconButton({ variant = "ghost", size = "icon", className, children, ...props }: IconButtonProps) {
  return (
    // @ts-ignore
    <Button variant={variant} size={size} className={cn("rounded-full cursor-pointer", className)} {...props}>
      {children}
    </Button>
  );
}

// Button Wrappers
export function PrimaryButton({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="default"
      className={cn("rounded-full font-semibold px-5 h-9 active:scale-95 transition-all cursor-pointer", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="secondary"
      className={cn("rounded-full font-semibold px-5 h-9 active:scale-95 transition-all cursor-pointer", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function GhostButton({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      className={cn("rounded-full font-semibold px-4 h-9 active:scale-95 transition-all cursor-pointer", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

// SearchInput Component
export interface SearchInputProps extends React.ComponentProps<"input"> {
  onSearch?: (value: string) => void;
}

export function SearchInput({ className, onSearch, ...props }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <input
        type="search"
        className={cn(
          "w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-white border-2 border-transparent focus:border-purple-200 rounded-full py-2 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-200",
          className
        )}
        {...props}
      />
      <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

// SectionHeader Component
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 pb-2 border-b border-gray-50", className)}>
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// TabBar Component
export interface TabBarProps {
  tabs: { id: string; label: string; disabled?: boolean }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onChange, className }: TabBarProps) {
  return (
    <div className={cn("border-b border-gray-100 bg-white sticky top-14 z-10", className)}>
      <div className="flex gap-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer",
              activeTab === tab.id
                ? "bg-purple-50 text-purple-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// EmptyState Component
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl max-w-md mx-auto my-6 space-y-4", className)}>
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div>
        <h3 className="font-semibold text-gray-950 text-[15px]">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

// ErrorState Component
export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "There was a problem loading this content. Please try again.",
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("p-8 border border-red-100 bg-red-50/50 rounded-2xl text-center max-w-md mx-auto my-6 space-y-3.5", className)}>
      <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-[15px]">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {onRetry && (
        <PrimaryButton
          onClick={onRetry}
          disabled={isRetrying}
          className="mx-auto bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying..." : "Try Again"}
        </PrimaryButton>
      )}
    </div>
  );
}

// LoadingSkeleton Component
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-2xl border border-gray-100 bg-white space-y-4 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
          <div className="h-2.5 w-1/4 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-gray-100 rounded" />
        <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
        <div className="h-3.5 w-2/3 bg-gray-100 rounded" />
      </div>
      <div className="h-48 w-full bg-gray-50 rounded-xl" />
    </div>
  );
}

// UserRow Component
export interface UserRowProps {
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string | null;
  action?: React.ReactNode;
  className?: string;
}

export function UserRow({
  userId,
  displayName,
  username,
  avatarUrl,
  action,
  className,
}: UserRowProps) {
  const fallback = displayName.charAt(0).toUpperCase();
  return (
    <div className={cn("flex items-center gap-3 justify-between py-2", className)}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="w-9 h-9 border border-gray-100/60">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs bg-purple-50 text-purple-700 font-bold">{fallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
            {displayName}
          </p>
          {username && (
            <p className="text-xs text-gray-500 truncate mt-0.5">@{username}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// HorizontalScroller Component — shared snap-scroll rail for Home's
// People You May Know / Reels / Stories sections (Phase 2), kept generic
// here so all three reuse one scroll/gutter/scrollbar-hiding behavior.
export interface HorizontalScrollerProps extends React.ComponentProps<"div"> {
  itemClassName?: string;
}

export function HorizontalScroller({ className, children, ...props }: HorizontalScrollerProps) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// CountBadge Component
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <Badge className={cn("bg-purple-600 text-white hover:bg-purple-700 rounded-full h-4.5 min-w-4.5 flex items-center justify-center text-[10px] font-bold px-1 select-none border-none", className)}>
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
