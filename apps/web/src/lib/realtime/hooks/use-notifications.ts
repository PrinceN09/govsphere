"use client";

/**
 * useNotifications — receive live notifications from the WebSocket
 *
 * Usage:
 *   const { notifications, unreadCount, markRead } = useNotifications();
 */

import { useState, useEffect, useCallback } from "react";
import type { NotificationEvent } from "@prinodia/realtime";
import { useRealtimeContext } from "../realtime-context";

export interface LiveNotification extends NotificationEvent {
  read: boolean;
}

export function useNotifications(maxStored = 50) {
  const { client } = useRealtimeContext();
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  useEffect(() => {
    if (!client) return;

    const unsub = client.notifications((event: NotificationEvent) => {
      setNotifications((prev) => {
        const entry: LiveNotification = { ...event, read: false };
        return [entry, ...prev].slice(0, maxStored);
      });
    });

    return unsub;
  }, [client, maxStored]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead,
    markAllRead,
  };
}
