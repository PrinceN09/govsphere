"use client";

import Link from "next/link";

import { cn } from "@/components/ui/cn";
import {
  fmtDuration,
  fmtTime,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABELS,
  type CalendarEvent,
} from "@/lib/calendar-types";

interface Props {
  events: CalendarEvent[];
  groupByDay?: boolean;
}

function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.startAt.slice(0, 10); // YYYY-MM-DD
    const arr = map.get(key) ?? [];
    arr.push(ev);
    map.set(key, arr);
  }
  return map;
}

export function AgendaView({ events, groupByDay = true }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="h-12 w-12 text-navy-600 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <p className="text-navy-400 text-sm">Aucun événement pour cette période</p>
      </div>
    );
  }

  if (!groupByDay) {
    return (
      <div className="space-y-2 p-4">
        {events.map((ev) => (
          <AgendaEventRow key={ev.id} event={ev} />
        ))}
      </div>
    );
  }

  const grouped = groupEventsByDay(events);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="divide-y divide-navy-800">
      {[...grouped.entries()].map(([day, dayEvents]) => {
        const isToday = day === today;
        const isPast = day < today;
        return (
          <div key={day} className="flex gap-4 py-4 px-4">
            {/* Day label */}
            <div
              className={cn(
                "w-16 shrink-0 pt-0.5",
                isToday ? "text-primary-400" : isPast ? "text-navy-600" : "text-navy-300",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide">
                {new Date(day + "T12:00:00").toLocaleDateString("fr-CD", { weekday: "short" })}
              </p>
              <p className="text-lg font-bold leading-none mt-0.5">
                {new Date(day + "T12:00:00").getDate()}
              </p>
              <p className="text-[10px] text-navy-500">
                {new Date(day + "T12:00:00").toLocaleDateString("fr-CD", { month: "short" })}
              </p>
            </div>

            {/* Events */}
            <div className="flex-1 space-y-1.5">
              {dayEvents.map((ev) => (
                <AgendaEventRow key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaEventRow({ event }: { event: CalendarEvent }) {
  const href = event.meeting ? `/admin/meetings/${event.meeting.id}` : `/admin/calendar`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-navy-800 bg-navy-800/50 px-3 py-2.5 hover:border-navy-600 hover:bg-navy-800 transition-all group"
    >
      {/* Color dot */}
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: event.color ?? (event.meeting ? "#3b82f6" : "#6366f1") }}
      />

      {/* Time */}
      <div className="w-24 shrink-0 text-xs text-navy-400">
        {event.allDay ? (
          <span className="italic">Journée entière</span>
        ) : (
          <>
            {fmtTime(event.startAt)} – {fmtTime(event.endAt)}
          </>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {!event.allDay && (
            <span className="text-[10px] text-navy-500">
              {fmtDuration(event.startAt, event.endAt)}
            </span>
          )}
          {event.location && (
            <span className="text-[10px] text-navy-500 truncate">{event.location}</span>
          )}
        </div>
      </div>

      {/* Meeting status */}
      {event.meeting && (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            MEETING_STATUS_COLOR[event.meeting.status],
          )}
        >
          {MEETING_STATUS_LABELS[event.meeting.status]}
        </span>
      )}
    </Link>
  );
}
