"use client";

/**
 * OnlineIndicator — colored dot showing a user's presence status
 *
 * Usage:
 *   <OnlineIndicator status="ONLINE" />
 *   <OnlineIndicator userId={userId} />   ← auto-subscribes via usePresence
 */

import { usePresence } from "@/lib/realtime/hooks/use-presence";
import type { PresenceStatus } from "@prinodia/realtime";
import { cn } from "@/components/ui/cn";

const STATUS_COLORS: Record<PresenceStatus, string> = {
  ONLINE:         "bg-green-500",
  AWAY:           "bg-yellow-400",
  BUSY:           "bg-red-500",
  DO_NOT_DISTURB: "bg-red-600",
  IN_MEETING:     "bg-purple-500",
  ON_CALL:        "bg-blue-500",
  OFFLINE:        "bg-gray-400",
};

const STATUS_LABELS: Record<PresenceStatus, string> = {
  ONLINE:         "En ligne",
  AWAY:           "Absent",
  BUSY:           "Occupé",
  DO_NOT_DISTURB: "Ne pas déranger",
  IN_MEETING:     "En réunion",
  ON_CALL:        "En appel",
  OFFLINE:        "Hors ligne",
};

interface OnlineIndicatorProps {
  /** Static status — use when you already know it */
  status?: PresenceStatus;
  /** User ID — auto-subscribes to live presence updates */
  userId?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  showTooltip?: boolean;
}

export function OnlineIndicator({
  status: staticStatus,
  userId,
  size = "sm",
  className,
  showTooltip = true,
}: OnlineIndicatorProps) {
  const liveStatus = usePresence(userId ?? "");
  const status: PresenceStatus = liveStatus ?? staticStatus ?? "OFFLINE";

  const sizes = {
    xs: "w-1.5 h-1.5",
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
  };

  const dot = (
    <span
      className={cn(
        "inline-block rounded-full flex-shrink-0 ring-2 ring-background",
        STATUS_COLORS[status],
        sizes[size],
        className,
      )}
      aria-label={STATUS_LABELS[status]}
      title={showTooltip ? STATUS_LABELS[status] : undefined}
    />
  );

  return dot;
}
