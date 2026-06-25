"use client";

import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { fmtTime, MEETING_STATUS_COLOR, type CalendarEvent } from "@/lib/calendar-types";

// ─── Month Grid ───────────────────────────────────────────────────────────────

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventsForDay(events: CalendarEvent[], date: Date) {
  return events.filter((e) => isSameDay(new Date(e.startAt), date));
}

export function MonthGrid({ year, month, events, onDayClick }: MonthGridProps) {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-navy-700">
        {DAYS_FR.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-navy-400 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-navy-800 last:border-b-0">
            {week.map((date, di) => {
              if (!date)
                return (
                  <div
                    key={di}
                    className="border-r border-navy-800 last:border-r-0 bg-navy-900/30 min-h-[80px]"
                  />
                );
              const isToday = isSameDay(date, today);
              const dayEvents = eventsForDay(events, date);

              return (
                <div
                  key={di}
                  className={cn(
                    "border-r border-navy-800 last:border-r-0 min-h-[80px] p-1 cursor-pointer hover:bg-navy-800/40 transition-colors",
                    isToday ? "bg-primary-950/40" : "",
                  )}
                  onClick={() => onDayClick?.(date)}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-primary-600 text-white" : "text-navy-300",
                    )}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <Link
                        key={ev.id}
                        href={ev.meeting ? `/admin/meetings/${ev.meeting.id}` : `/admin/calendar`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
                          ev.meeting
                            ? MEETING_STATUS_COLOR[ev.meeting.status]
                            : "bg-navy-700 text-navy-200",
                        )}
                      >
                        {!ev.allDay && <span className="opacity-70">{fmtTime(ev.startAt)} </span>}
                        {ev.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-navy-400 px-1">
                        +{dayEvents.length - 3} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Week Grid ────────────────────────────────────────────────────────────────

interface WeekGridProps {
  weekStart: Date; // Monday of the week
  events: CalendarEvent[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function positionEvent(event: CalendarEvent) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const topPct = ((start.getHours() * 60 + start.getMinutes()) / (24 * 60)) * 100;
  const heightPct = ((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) * 100;
  return { top: `${topPct}%`, height: `${Math.max(heightPct, 2)}%` };
}

export function WeekGrid({ weekStart, events }: WeekGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div className="flex h-full overflow-auto">
      {/* Time column */}
      <div className="w-14 flex-shrink-0 border-r border-navy-700">
        <div className="h-10" /> {/* header spacer */}
        {HOURS.map((h) => (
          <div key={h} className="relative h-14 border-b border-navy-800/50">
            <span className="absolute -top-2 right-2 text-[10px] text-navy-500">
              {h.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((day, di) => {
        const isToday = isSameDay(day, today);
        const dayEvents = events.filter((e) => isSameDay(new Date(e.startAt), day) && !e.allDay);

        return (
          <div key={di} className="flex-1 min-w-0 border-r border-navy-800 last:border-r-0">
            {/* Day header */}
            <div
              className={cn(
                "h-10 flex flex-col items-center justify-center border-b border-navy-700 text-xs",
                isToday ? "bg-primary-950/50" : "",
              )}
            >
              <span className="text-navy-400 font-medium">{DAYS_FR[di]}</span>
              <span className={cn("font-semibold", isToday ? "text-primary-400" : "text-navy-200")}>
                {day.getDate()}
              </span>
            </div>

            {/* Hour grid + events */}
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="h-14 border-b border-navy-800/50" />
              ))}

              {dayEvents.map((ev) => {
                const pos = positionEvent(ev);
                return (
                  <Link
                    key={ev.id}
                    href={ev.meeting ? `/admin/meetings/${ev.meeting.id}` : `/admin/calendar`}
                    className={cn(
                      "absolute inset-x-0.5 rounded px-1 py-0.5 text-[10px] font-medium overflow-hidden",
                      ev.meeting
                        ? MEETING_STATUS_COLOR[ev.meeting.status]
                        : "bg-primary-800 text-primary-100",
                    )}
                    style={pos}
                  >
                    <div className="truncate">{ev.title}</div>
                    <div className="opacity-70">{fmtTime(ev.startAt)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── View header nav ──────────────────────────────────────────────────────────

interface CalendarNavProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: "month" | "week" | "day";
}

export function CalendarNav({ label, onPrev, onNext, onToday, view }: CalendarNavProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToday}
        className="rounded border border-navy-700 px-3 py-1 text-xs font-medium text-navy-300 hover:border-navy-600 hover:text-white transition-colors"
      >
        Aujourd'hui
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          className="p-1.5 rounded hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="min-w-[160px] text-center text-sm font-semibold text-white">{label}</span>
        <button
          onClick={onNext}
          className="p-1.5 rounded hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="flex rounded border border-navy-700 overflow-hidden text-xs">
        {(["month", "week", "day"] as const).map((v) => (
          <Link
            key={v}
            href={`/admin/calendar/${v === "month" ? "month" : v}`}
            className={cn(
              "px-3 py-1.5 font-medium transition-colors",
              view === v
                ? "bg-primary-600 text-white"
                : "text-navy-300 hover:bg-navy-700 hover:text-white",
            )}
          >
            {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Export all labels ─────────────────────────────────────────────────────────

export { MONTHS_FR };
