"use client";

/**
 * usePresence — subscribe to a specific user's presence status
 *
 * Usage:
 *   const status = usePresence(userId);
 *   // Returns "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | ...
 */

import { useState, useEffect } from "react";
import type { PresenceStatus, PresenceUpdateEvent } from "@prinodia/realtime";
import { useRealtimeContext } from "../realtime-context";

export function usePresence(userId: string): PresenceStatus | null {
  const { client } = useRealtimeContext();
  const [status, setStatus] = useState<PresenceStatus | null>(null);

  useEffect(() => {
    if (!client) return;

    const unsub = client.presence((event: PresenceUpdateEvent) => {
      if (event.userId === userId) {
        setStatus(event.status);
      }
    });

    return unsub;
  }, [client, userId]);

  return status;
}
