"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CalendarNav, WeekGrid } from "@/components/calendar/CalendarGrid";
import { MiniCalendarWidget } from "@/components/calendar/MiniCalendarWidget";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { apiGet } from "@/lib/api";

import type { CalendarEvent } from "@/lib/calendar-types";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const mo = monday.toLocaleDateString("fr-CD", { day: "2-digit", month: "short" });
  const su = sunday.toLocaleDateString("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${mo} – ${su}`;
}

export default function CalendarWeekPage() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => getMondayOf(today));

  const from = weekStart.toISOString();
  const to = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events-week", weekStart.toISOString()],
    queryFn: () => apiGet("/v1/calendar/my", { from, to }),
  });

  function prevWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() - 7);
      return n;
    });
  }
  function nextWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() + 7);
      return n;
    });
  }
  function toToday() {
    setWeekStart(getMondayOf(today));
  }

  return (
    <>
      <AdminTopBar
        title="Calendrier — Semaine"
        subtitle={fmtWeekLabel(weekStart)}
        actions={
          <Link
            href="/admin/meetings/new"
            className="inline-flex items-center gap-1.5 rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Nouvelle réunion
          </Link>
        }
      />

      <div className="flex h-[calc(100vh-64px)]">
        <aside className="w-64 shrink-0 border-r border-navy-800 p-4">
          <MiniCalendarWidget
            selected={weekStart}
            onSelect={(d) => setWeekStart(getMondayOf(d))}
            highlightedDates={events.map((e) => new Date(e.startAt))}
          />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 border-b border-navy-800 px-4 py-2">
            <CalendarNav
              label={fmtWeekLabel(weekStart)}
              onPrev={prevWeek}
              onNext={nextWeek}
              onToday={toToday}
              view="week"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <WeekGrid weekStart={weekStart} events={events} />
          </div>
        </div>
      </div>
    </>
  );
}
