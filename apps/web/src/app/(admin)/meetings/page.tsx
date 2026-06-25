"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { MeetingCard } from "@/components/calendar/MeetingCard";
import { MeetingTimeline } from "@/components/calendar/MeetingTimeline";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

import type { Meeting, MeetingStatus } from "@/lib/calendar-types";

const STATUS_FILTERS: { value: MeetingStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "SCHEDULED", label: "Planifiées" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default function MeetingsPage() {
  const [status, setStatus] = useState<MeetingStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [search, setSearch] = useState("");

  const params: Record<string, string> = {};
  if (status !== "ALL") params["status"] = status;
  if (search) params["search"] = search;

  const { data, isLoading } = useQuery<{ meetings: Meeting[] }>({
    queryKey: ["meetings", status, search],
    queryFn: () => apiGet("/v1/meetings", params),
    staleTime: 30_000,
  });

  const meetings = data?.meetings ?? [];

  return (
    <>
      <AdminTopBar
        title="Réunions"
        subtitle="Gestion des réunions gouvernementales"
        actions={
          <Link
            href="/admin/meetings/new"
            className="inline-flex items-center gap-1.5 rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Planifier une réunion
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded border border-navy-700 bg-navy-800 pl-9 pr-3 py-1.5 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none w-56"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === f.value
                    ? "bg-primary-600 text-white"
                    : "bg-navy-800 text-navy-300 border border-navy-700 hover:border-navy-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="ml-auto flex rounded border border-navy-700 overflow-hidden">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-navy-700 text-white" : "text-navy-400 hover:text-white"}`}
            >
              Cartes
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "timeline" ? "bg-navy-700 text-white" : "text-navy-400 hover:text-white"}`}
            >
              Chronologie
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <PageSpinner />
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-navy-300 font-medium mb-1">Aucune réunion</p>
            <p className="text-sm text-navy-500 mb-4">
              {search
                ? "Aucune réunion correspond à votre recherche."
                : "Commencez par planifier une réunion."}
            </p>
            <Link
              href="/admin/meetings/new"
              className="inline-flex items-center gap-1.5 rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
            >
              Planifier une réunion
            </Link>
          </div>
        ) : viewMode === "cards" ? (
          <div className="space-y-3">
            {meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        ) : (
          <MeetingTimeline meetings={meetings} />
        )}
      </div>
    </>
  );
}
