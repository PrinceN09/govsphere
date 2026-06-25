"use client";

import { cn } from "@/components/ui/cn";
import {
  PARTICIPANT_ROLE_LABELS,
  RSVP_STATUS_COLOR,
  RSVP_STATUS_LABELS,
  type MeetingParticipant,
  type ParticipantRole,
} from "@/lib/calendar-types";

interface Props {
  participants: MeetingParticipant[];
  isOrganizer?: boolean;
  onRemove?: (id: string) => void;
  onUpdateRsvp?: (id: string, status: string) => void;
}

const ROLE_ORDER: Record<ParticipantRole, number> = {
  ORGANIZER: 0,
  SECRETARY: 1,
  PRESENTER: 2,
  REQUIRED: 3,
  OPTIONAL: 4,
  OBSERVER: 5,
};

function Avatar({ name }: { name?: string | null }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  return (
    <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-white">{initials}</span>
    </div>
  );
}

export function ParticipantList({ participants, isOrganizer, onRemove }: Props) {
  const sorted = [...participants].sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 99;
    const rb = ROLE_ORDER[b.role] ?? 99;
    return ra - rb;
  });

  if (sorted.length === 0) {
    return <p className="py-4 text-center text-sm text-navy-400">Aucun participant</p>;
  }

  return (
    <div className="space-y-1">
      {sorted.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-navy-800/60 transition-colors"
        >
          <Avatar name={p.user.displayName} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-white truncate">
                {p.user.displayName ?? p.user.email}
              </span>
              <span className="text-[10px] text-navy-500 font-medium">
                {PARTICIPANT_ROLE_LABELS[p.role]}
              </span>
            </div>
            <p className="text-xs text-navy-500 truncate">{p.user.email}</p>
            {p.note && <p className="text-xs text-navy-400 italic mt-0.5">{p.note}</p>}
            {p.delegatedTo && (
              <p className="text-xs text-navy-400 mt-0.5">
                Délégué à:{" "}
                <span className="text-navy-300">
                  {p.delegatedTo.displayName ?? p.delegatedTo.email}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                RSVP_STATUS_COLOR[p.rsvpStatus],
              )}
            >
              {RSVP_STATUS_LABELS[p.rsvpStatus]}
            </span>
            {isOrganizer && p.role !== "ORGANIZER" && onRemove && (
              <button
                onClick={() => onRemove(p.id)}
                className="rounded p-1 text-navy-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                aria-label="Retirer le participant"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── RSVP action buttons ──────────────────────────────────────────────────────

interface RsvpActionsProps {
  current: string;
  onAccept: () => void;
  onDecline: () => void;
  onTentative: () => void;
  loading?: boolean;
}

export function RsvpActions({
  current,
  onAccept,
  onDecline,
  onTentative,
  loading,
}: RsvpActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAccept}
        disabled={loading === true || current === "ACCEPTED"}
        className={cn(
          "rounded px-3 py-1.5 text-xs font-medium transition-colors",
          current === "ACCEPTED"
            ? "bg-emerald-800 text-emerald-200 cursor-default"
            : "bg-navy-700 text-navy-200 hover:bg-emerald-800 hover:text-emerald-200",
        )}
      >
        ✓ Accepter
      </button>
      <button
        onClick={onTentative}
        disabled={loading === true || current === "TENTATIVE"}
        className={cn(
          "rounded px-3 py-1.5 text-xs font-medium transition-colors",
          current === "TENTATIVE"
            ? "bg-amber-800 text-amber-200 cursor-default"
            : "bg-navy-700 text-navy-200 hover:bg-amber-800 hover:text-amber-200",
        )}
      >
        ? Peut-être
      </button>
      <button
        onClick={onDecline}
        disabled={loading === true || current === "DECLINED"}
        className={cn(
          "rounded px-3 py-1.5 text-xs font-medium transition-colors",
          current === "DECLINED"
            ? "bg-red-900 text-red-200 cursor-default"
            : "bg-navy-700 text-navy-200 hover:bg-red-900 hover:text-red-200",
        )}
      >
        ✗ Refuser
      </button>
    </div>
  );
}
