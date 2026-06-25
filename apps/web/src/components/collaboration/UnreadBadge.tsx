"use client";

import { cn } from "@/components/ui/cn";

interface UnreadBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function UnreadBadge({ count, max = 99, className }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        "inline-flex min-w-[1.125rem] items-center justify-center rounded-full",
        "bg-primary-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white",
        className,
      )}
      aria-label={`${count} non lu${count > 1 ? "s" : ""}`}
    >
      {label}
    </span>
  );
}
