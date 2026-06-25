"use client";

interface TypingIndicatorProps {
  /** Names of users currently typing */
  names: string[];
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  let label: string;
  if (names.length === 1) {
    label = `${names[0]} est en train d'écrire…`;
  } else if (names.length === 2) {
    label = `${names[0]} et ${names[1]} écrivent…`;
  } else {
    label = `${names.length} personnes écrivent…`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1">
      {/* Animated dots */}
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500 italic">{label}</span>
    </div>
  );
}
