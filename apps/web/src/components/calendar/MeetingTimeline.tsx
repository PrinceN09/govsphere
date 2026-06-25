"use client";

import Link from "next/link";

import { cn } from "@/components/ui/cn";
import {
  fmtDate,
  fmtDuration,
  fmtTime,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABELS,
  type Meeting,
} from "@/lib/calendar-types";

interface Props {
  meetings: Meeting[];
}

export function MeetingTimeline({ meetings }: Props) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="h-10 w-10 text-navy-600 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 10.5c0 7.142-7.5 11.25-9.5 11.25S.5 17.642.5 10.5a9.5 9.5 0 0119 0z"
          />
        </svg>
        <p className="text-navy-500 text-sm">Aucune réunion</p>
      </div>
    );
  }

  // Group by month
  const byMonth = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = m.event.startAt.slice(0, 7); // YYYY-MM
    const arr = byMonth.get(key) ?? [];
    arr.push(m);
    byMonth.set(key, arr);
  }

  return (
    <div className="space-y-6">
      {[...byMonth.entries()].map(([monthKey, monthMeetings]) => {
        const [y, mo] = monthKey.split("-");
        const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("fr-CD", {
          month: "long",
          year: "numeric",
        });

        return (
          <div key={monthKey}>
            <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3 px-1">
              {label}
            </h3>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-navy-700" />

              <div className="space-y-3 pl-10">
                {monthMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/meetings/${m.id}`}
                    className="relative block group"
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "absolute -left-[26px] top-3 h-3 w-3 rounded-full border-2 border-navy-900",
                        m.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : m.status === "CANCELLED"
                            ? "bg-red-500"
                            : m.status === "IN_PROGRESS"
                              ? "bg-amber-400"
                              : "bg-primary-500",
                      )}
                    />

                    <div className="rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 hover:border-navy-600 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                MEETING_STATUS_COLOR[m.status],
                              )}
                            >
                              {MEETING_STATUS_LABELS[m.status]}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                            {m.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-navy-400">
                            <span>{fmtDate(m.event.startAt)}</span>
                            <span>
                              {fmtTime(m.event.startAt)} – {fmtTime(m.event.endAt)}
                            </span>
                            <span>{fmtDuration(m.event.startAt, m.event.endAt)}</span>
                            {m.location && <span>📍 {m.location}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-navy-500">
                          {m._count?.participants ?? 0} part.
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
