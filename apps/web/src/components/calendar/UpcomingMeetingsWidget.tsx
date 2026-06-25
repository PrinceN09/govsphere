"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { apiGet } from "@/lib/api";
import {
  fmtTime,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABELS,
  type Meeting,
} from "@/lib/calendar-types";

export function UpcomingMeetingsWidget() {
  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, isLoading } = useQuery<{ meetings: Meeting[] }>({
    queryKey: ["meetings", "upcoming"],
    queryFn: () =>
      apiGet("/v1/meetings", { from: now, to: twoWeeks, status: "SCHEDULED", limit: 5 }),
  });

  const meetings = data?.meetings ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-navy-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return <p className="py-4 text-center text-sm text-navy-500">Aucune réunion à venir</p>;
  }

  return (
    <div className="space-y-1.5">
      {meetings.map((m) => (
        <Link
          key={m.id}
          href={`/admin/meetings/${m.id}`}
          className="flex items-start gap-3 rounded-lg bg-navy-800 border border-navy-700 px-3 py-2.5 hover:border-navy-600 transition-colors group"
        >
          {/* Date block */}
          <div className="w-10 shrink-0 text-center">
            <p className="text-[10px] text-navy-500 uppercase">
              {new Date(m.event.startAt).toLocaleDateString("fr-CD", { month: "short" })}
            </p>
            <p className="text-lg font-bold text-white leading-none">
              {new Date(m.event.startAt).getDate()}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
              {m.title}
            </p>
            <p className="text-xs text-navy-400">
              {fmtTime(m.event.startAt)} · {m._count?.participants ?? 0} participant(s)
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
              MEETING_STATUS_COLOR[m.status],
            )}
          >
            {MEETING_STATUS_LABELS[m.status]}
          </span>
        </Link>
      ))}
      <Link
        href="/admin/meetings"
        className="block text-center text-xs text-primary-400 hover:text-primary-300 transition-colors pt-1"
      >
        Voir toutes les réunions →
      </Link>
    </div>
  );
}
