"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useUploadManager } from "@/hooks/use-upload-manager";
import { Loader, CheckCircle, AlertCircle, X } from "lucide-react";

const READY_DISMISS_MS = 4000;

export function GlobalUploadIndicator() {
  const { sessions, removeSession } = useUploadManager();
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Derive the visible list directly from source state — never mirror it in
  // React state. `activeSessions` is memoized so it only changes when the
  // underlying session snapshot actually changes.
  const activeSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.mimeType.startsWith("video/") &&
          (session.status === "UPLOADING" ||
            session.status === "PROCESSING" ||
            session.status === "PLAYABLE" ||
            session.status === "READY" ||
            session.status === "FAILED")
      ),
    [sessions]
  );

  const readyIds = useMemo(
    () =>
      new Set(
        activeSessions
          .filter((s) => s.status === "PLAYABLE" || s.status === "READY")
          .map((s) => s.localUploadId)
      ),
    [activeSessions]
  );

  // Schedule exactly ONE dismiss timer per READY session. Timers are keyed by
  // localUploadId; a timer is only created the first time a session turns
  // READY, and is cleared as soon as the session leaves the ready set.
  useEffect(() => {
    for (const id of readyIds) {
      if (dismissTimers.current.has(id)) continue;
      dismissTimers.current.set(
        id,
        setTimeout(() => {
          dismissTimers.current.delete(id);
          removeSession(id);
        }, READY_DISMISS_MS)
      );
    }

    for (const [id, timer] of dismissTimers.current) {
      if (!readyIds.has(id)) {
        clearTimeout(timer);
        dismissTimers.current.delete(id);
      }
    }
  }, [readyIds, removeSession]);

  // Clear every timer on unmount (route changes / Fast Refresh).
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = (localUploadId: string) => {
    const timer = dismissTimers.current.get(localUploadId);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(localUploadId);
    }
    removeSession(localUploadId);
  };

  if (activeSessions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-32px)]">
      {activeSessions.map((session) => {
        let icon = <Loader className="w-4 h-4 text-purple-600 animate-spin" />;
        let text = "";

        if (session.status === "UPLOADING") {
          text = `Uploading video · ${session.progress}%`;
        } else if (session.status === "PROCESSING") {
          text = "Processing video...";
        } else if (session.status === "PLAYABLE" || session.status === "READY") {
          icon = <CheckCircle className="w-4 h-4 text-green-500" />;
          text = "Video ready";
        } else if (session.status === "FAILED") {
          icon = <AlertCircle className="w-4 h-4 text-red-500" />;
          text = session.mediaId ? "Processing failed" : "Upload failed";
        }

        return (
          <div
            key={session.localUploadId}
            className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {session.filename}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">
                {text}
              </p>
            </div>
            <button
              onClick={() => dismiss(session.localUploadId)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Dismiss indicator"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}