"use client";

/**
 * ActivityPanel — live activity feed panel
 *
 * Shows a scrollable list of org-scoped activity events received via WebSocket.
 *
 * Usage:
 *   <ActivityPanel orgId={orgId} />
 */

import { useState, useEffect } from "react";
import type { ActivityEvent } from "@prinodia/realtime";
import { useRealtimeContext } from "@/lib/realtime/realtime-context";

interface ActivityPanelProps {
  maxItems?: number;
  className?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "à l'instant";
  if (secs < 3600) return `il y a ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `il y a ${Math.floor(secs / 3600)} h`;
  return `il y a ${Math.floor(secs / 86400)} j`;
}

export function ActivityPanel({ maxItems = 30, className }: ActivityPanelProps) {
  const { client } = useRealtimeContext();
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!client) return;
    return client.activity((event: ActivityEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, maxItems));
    });
  }, [client, maxItems]);

  if (!events.length) {
    return (
      <div className={`flex items-center justify-center h-24 text-sm text-muted-foreground ${className ?? ""}`}>
        Aucune activité récente
      </div>
    );
  }

  return (
    <div className={`space-y-2 overflow-y-auto ${className ?? ""}`}>
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 text-sm">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary uppercase">
            {event.actorName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground leading-snug">
              <span className="font-medium">{event.actorName}</span>{" "}
              {event.summary}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">{timeAgo(event.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
