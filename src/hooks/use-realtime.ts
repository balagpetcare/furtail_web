"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsKeys } from "@/lib/api/notifications";
import { messagesKeys } from "@/lib/api/messages";

/**
 * Backend event names (see furtail_app_api's realtime-hub.ts) — the server
 * always writes a named SSE event (`event: message.created\n`), never a
 * bare/default event, so each of these needs its own
 * `addEventListener(name, ...)`; a generic `source.onmessage` handler only
 * ever fires for unnamed events and would never see any of these.
 */
const REALTIME_EVENT_NAMES = [
  "message.created",
  "message.updated",
  "message.deleted",
  "message.read",
  "conversation.updated",
  "presence.online",
  "presence.offline",
  "notification.created",
] as const;

export function useRealtime() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef(1000);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      if (isConnectingRef.current || eventSourceRef.current?.readyState === EventSource.OPEN) {
        return; // Already connecting or connected
      }

      isConnectingRef.current = true;
      
      // Clear any pending reconnections
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // We use the new dedicated App Router proxy route which properly pipes the Node stream
      const source = new EventSource("/api/realtime/stream", { withCredentials: true });

      source.onopen = () => {
        isConnectingRef.current = false;
        console.log("[Realtime] Connected to SSE stream");
        // Reset exponential backoff after successful connection
        retryDelayRef.current = 1000;
      };

      const handleEvent = (name: string) => (e: MessageEvent) => {
        try {
          if (!e.data) return;
          const data = JSON.parse(e.data);

          switch (name) {
            case "message.created":
            case "message.updated":
            case "message.deleted":
            case "message.read": {
              const conversationId = data?.conversationId;
              if (conversationId != null) {
                queryClient.invalidateQueries({
                  queryKey: messagesKeys.messages(conversationId),
                });
              }
              queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() });
              queryClient.invalidateQueries({ queryKey: messagesKeys.unread() });
              if (name === "message.created") {
                toast("New message", { description: data.body || "You received a new message." });
              }
              break;
            }
            case "conversation.updated":
              queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() });
              break;
            case "presence.online":
            case "presence.offline":
              // No local presence cache yet to patch in place — surfaced for
              // future presence UI to subscribe to without another wiring pass.
              break;
            case "notification.created":
              queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
              queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount });
              toast(data.title || "New notification", { description: data.body });
              break;
          }
        } catch (err) {
          console.error(`[Realtime] Error parsing ${name} event`, err);
        }
      };

      for (const name of REALTIME_EVENT_NAMES) {
        source.addEventListener(name, handleEvent(name) as EventListener);
      }

      source.onmessage = (e) => {
        // Bare/default events aren't used by this backend today, but a
        // heartbeat comment line (`: heartbeat`) never reaches here either
        // way — kept only as a safe no-op for forward compatibility.
        if (!e.data || e.data === "ping") return;
      };

      source.onerror = () => {
        isConnectingRef.current = false;
        // Don't spam console during background reconnection loops
        source.close();
        eventSourceRef.current = null;

        if (!isMounted) return;

        // Exponential backoff with jitter (max 30s)
        const delay = retryDelayRef.current + Math.random() * 500;
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      eventSourceRef.current = source;
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [queryClient]);
}
