"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CalendarEvent } from "@/lib/calendar-types";

import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarNav, MonthGrid, MONTHS_FR } from "@/components/calendar/CalendarGrid";
import { MiniCalendarWidget } from "@/components/calendar/MiniCalendarWidget";
import { UpcomingMeetingsWidget } from "@/components/calendar/UpcomingMeetingsWidget";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { apiGet } from "@/lib/api";

export default function CalendarMonthPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"grid" | "agenda">("grid");

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", year, month],
    queryFn: () => apiGet("/v1/calendar/my", { from, to }),
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }
  function toToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <>
      <AdminTopBar
        title="Calendrier"
        subtitle={`${MONTHS_FR[month]} ${year}`}
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
        {/* Left sidebar */}
        <aside className="w-64 shrink-0 border-r border-navy-800 p-4 flex flex-col gap-6 overflow-y-auto">
          <MiniCalendarWidget
            selected={new Date(year, month, 1)}
            onSelect={(d) => {
              setYear(d.getFullYear());
              setMonth(d.getMonth());
            }}
            highlightedDates={events.map((e) => new Date(e.startAt))}
          />
          <div>
            <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2">
              Réunions à venir
            </h3>
            <UpcomingMeetingsWidget />
          </div>
        </aside>

        {/* Main calendar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-navy-800 px-4 py-2">
            <CalendarNav
              label={`${MONTHS_FR[month]} ${year}`}
              onPrev={prevMonth}
              onNext={nextMonth}
              onToday={toToday}
              view="month"
            />
            <div className="flex rounded border border-navy-700 overflow-hidden text-xs">
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 font-medium transition-colors ${view === "grid" ? "bg-navy-700 text-white" : "text-navy-400 hover:text-white"}`}
              >
                Grille
              </button>
              <button
                onClick={() => setView("agenda")}
                className={`px-3 py-1.5 font-medium transition-colors ${view === "agenda" ? "bg-navy-700 text-white" : "text-navy-400 hover:text-white"}`}
              >
                Agenda
              </button>
            </div>
          </div>

          {/* Calendar content */}
          <div className="flex-1 overflow-auto">
            {view === "grid" ? (
              <MonthGrid
                year={year}
                month={month}
                events={events}
                onDayClick={(date) =>
                  router.push(`/admin/calendar/day?date=${date.toISOString().slice(0, 10)}`)
                }
              />
            ) : (
              <AgendaView events={events} groupByDay />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
