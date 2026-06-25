"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import type { CalendarEvent } from "@/lib/calendar-types";

import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarNav } from "@/components/calendar/CalendarGrid";
import { MiniCalendarWidget } from "@/components/calendar/MiniCalendarWidget";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { apiGet } from "@/lib/api";

function DayPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const dateParam = params.get("date");
  const today = new Date();
  const [date, setDate] = useState(() => (dateParam ? new Date(dateParam + "T12:00:00") : today));

  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events-day", date.toISOString().slice(0, 10)],
    queryFn: () => apiGet("/v1/calendar/my", { from: from.toISOString(), to: to.toISOString() }),
  });

  const label = date.toLocaleDateString("fr-CD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function prev() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
    router.push(`/admin/calendar/day?date=${d.toISOString().slice(0, 10)}`);
  }
  function next() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
    router.push(`/admin/calendar/day?date=${d.toISOString().slice(0, 10)}`);
  }
  function toToday() {
    setDate(today);
    router.push(`/admin/calendar/day?date=${today.toISOString().slice(0, 10)}`);
  }

  return (
    <>
      <AdminTopBar
        title="Calendrier — Jour"
        subtitle={label}
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
            selected={date}
            onSelect={(d) => {
              setDate(d);
              router.push(`/admin/calendar/day?date=${d.toISOString().slice(0, 10)}`);
            }}
            highlightedDates={events.map((e) => new Date(e.startAt))}
          />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 border-b border-navy-800 px-4 py-2">
            <CalendarNav label={label} onPrev={prev} onNext={next} onToday={toToday} view="day" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-navy-500 text-sm">Aucun événement ce jour</p>
                <Link
                  href="/admin/meetings/new"
                  className="mt-3 text-xs text-primary-400 hover:text-primary-300"
                >
                  Planifier une réunion
                </Link>
              </div>
            ) : (
              <AgendaView events={events} groupByDay={false} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CalendarDayPage() {
  return (
    <Suspense>
      <DayPageInner />
    </Suspense>
  );
}
