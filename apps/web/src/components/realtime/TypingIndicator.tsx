"use client";

/**
 * TypingIndicator — "Alice et Bob écrivent…" indicator
 *
 * Usage:
 *   const { typingUsers } = useTyping(channelId);
 *   <TypingIndicator users={typingUsers} />
 */

import type { TypingUser } from "@/lib/realtime/hooks/use-typing";

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (!users.length) return null;

  const names = users.map((u) => u.displayName);
  let label: string;

  if (names.length === 1) {
    label = `${names[0]} écrit…`;
  } else if (names.length === 2) {
    label = `${names[0]} et ${names[1]} écrivent…`;
  } else {
    label = `${names[0]} et ${names.length - 1} autre${names.length > 2 ? "s" : ""} écrivent…`;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
