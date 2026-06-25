"use client";

import { cn } from "@/components/ui/cn";

export type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "DO_NOT_DISTURB" | "OFFLINE";

interface PresenceBadgeProps {
  status: PresenceStatus;
  className?: string;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<PresenceStatus, { color: string; label: string }> = {
  ONLINE: { color: "bg-emerald-500", label: "En ligne" },
  AWAY: { color: "bg-yellow-400", label: "Absent" },
  BUSY: { color: "bg-red-500", label: "Occupé" },
  DO_NOT_DISTURB: { color: "bg-red-600", label: "Ne pas déranger" },
  OFFLINE: { color: "bg-slate-400", label: "Hors ligne" },
};

export function PresenceBadge({ status, className, showLabel = false }: PresenceBadgeProps) {
  const { color, label } = STATUS_CONFIG[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-white", color)}
        aria-label={label}
        title={label}
      />
      {showLabel && (
        <span className="text-xs text-slate-500">{label}</span>
      )}
    </span>
  );
}
