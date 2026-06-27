"use client";

/**
 * NotificationBadge — shows unread notification count
 *
 * Usage:
 *   <NotificationBadge count={unreadCount} />
 */

import { cn } from "@/components/ui/cn";

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function NotificationBadge({ count, max = 99, className }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex items-center justify-center",
        "min-w-[18px] h-[18px] px-1 rounded-full",
        "bg-red-500 text-white text-[10px] font-bold leading-none",
        "ring-2 ring-background",
        className,
      )}
      aria-label={`${count} notifications non lues`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
