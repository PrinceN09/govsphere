"use client";

/**
 * useTyping — typing indicator infrastructure
 *
 * Usage:
 *   const { typingUsers, startTyping, stopTyping } = useTyping(channelId);
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { TypingEvent } from "@prinodia/realtime";
import { useRealtimeContext } from "../realtime-context";

export interface TypingUser {
  userId: string;
  displayName: string;
}

const TYPING_TIMEOUT = 3_000; // 3 seconds without signal → remove from list

export function useTyping(roomId: string) {
  const { client } = useRealtimeContext();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!client) return;

    const onStart = (event: TypingEvent) => {
      if (event.roomId !== roomId) return;

      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === event.userId)) return prev;
        return [...prev, { userId: event.userId, displayName: event.displayName ?? event.userId }];
      });

      // Auto-remove if stop never arrives
      const existingTimer = timers.current.get(event.userId);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== event.userId));
        timers.current.delete(event.userId);
      }, TYPING_TIMEOUT);
      timers.current.set(event.userId, timer);
    };

    const onStop = (event: TypingEvent) => {
      if (event.roomId !== roomId) return;
      const existingTimer = timers.current.get(event.userId);
      if (existingTimer) clearTimeout(existingTimer);
      timers.current.delete(event.userId);
      setTypingUsers((prev) => prev.filter((u) => u.userId !== event.userId));
    };

    const unsubStart = client.subscribe("typing_start", onStart);
    const unsubStop  = client.subscribe("typing_stop",  onStop);

    return () => {
      unsubStart();
      unsubStop();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, [client, roomId]);

  const startTyping = useCallback(() => {
    if (!client) return;
    if (!typingRef.current) {
      client.startTyping(roomId);
      typingRef.current = true;
    }
    // Debounce stop: reset stop timer on each keystroke
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      client.stopTyping(roomId);
      typingRef.current = false;
    }, TYPING_TIMEOUT);
  }, [client, roomId]);

  const stopTyping = useCallback(() => {
    if (!client) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    client.stopTyping(roomId);
    typingRef.current = false;
  }, [client, roomId]);

  return { typingUsers, startTyping, stopTyping };
}
