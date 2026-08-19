import { useState, useEffect } from "react";

/**
 * Formats a timestamp into a compact relative time string.
 * - < 1m: "Just now"
 * - < 1h: "Xm"
 * - < 24h: "Xh"
 * - < 7d: "Xd"
 * - >= 7d: "MMM D" or "MMM D, YYYY"
 */
export function formatPostTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    // Older than 7 days, use absolute date
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    // If it's a different year, include the year
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = "numeric";
    }
    return date.toLocaleDateString("en-US", options);
  }
}

/**
 * Returns exact timestamp tooltip formatted in user's local timezone.
 * e.g. "Aug 19, 2026, 1:04 PM"
 */
export function formatExactTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Global subscriber pattern for relative time updates
const subscribers = new Set<() => void>();
let timerId: NodeJS.Timeout | null = null;

function tick() {
  subscribers.forEach((cb) => cb());
}

export function useRelativeTime(dateStr: string | Date | undefined): string {
  const [formatted, setFormatted] = useState(() => (dateStr ? formatPostTime(dateStr) : ""));

  useEffect(() => {
    if (!dateStr) return;



    const update = () => {
      setFormatted(formatPostTime(dateStr));
    };

    subscribers.add(update);

    if (subscribers.size > 0 && !timerId) {
      // Update once a minute to keep UI lightweight
      timerId = setInterval(tick, 60000);
    }

    return () => {
      subscribers.delete(update);
      if (subscribers.size === 0 && timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };
  }, [dateStr]);

  return formatted;
}