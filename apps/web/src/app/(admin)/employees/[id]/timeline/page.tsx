"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  action: string;
  category: string;
  label: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface EmployeeStub {
  id: string;
  displayName: string;
  email: string;
  matriculeNumber: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  lifecycle: {
    color: "bg-blue-50 border-blue-100 text-blue-700",
    dot: "bg-blue-500",
    label: "Cycle de vie",
  },
  roles: {
    color: "bg-purple-50 border-purple-100 text-purple-700",
    dot: "bg-purple-500",
    label: "Rôles",
  },
  workforce: {
    color: "bg-amber-50 border-amber-100 text-amber-700",
    dot: "bg-amber-500",
    label: "Effectif",
  },
  security: {
    color: "bg-red-50 border-red-100 text-red-700",
    dot: "bg-red-500",
    label: "Sécurité",
  },
  session: {
    color: "bg-slate-50 border-slate-200 text-slate-600",
    dot: "bg-slate-400",
    label: "Session",
  },
  other: {
    color: "bg-slate-50 border-slate-200 text-slate-600",
    dot: "bg-slate-300",
    label: "Autre",
  },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDayHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDay(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const groups: Map<string, TimelineEvent[]> = new Map();
  for (const ev of events) {
    const key = new Date(ev.createdAt).toDateString();
    const group = groups.get(key) ?? [];
    group.push(ev);
    groups.set(key, group);
  }
  return Array.from(groups.entries()).map(([, evs]) => [evs[0]!.createdAt, evs]);
}

function metadataSnippet(meta: Record<string, unknown>): string | null {
  const entries = Object.entries(meta).filter(([k]) => !["userId", "sessionId"].includes(k));
  if (entries.length === 0) return null;
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG["other"]!;
  const snippet = metadataSnippet(event.metadata);
  const hasMore = Object.keys(event.metadata).length > 0;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <span
        className={`absolute left-0 top-3 h-3 w-3 rounded-full ring-2 ring-white ${config.dot}`}
        aria-hidden="true"
      />

      <div className={`rounded border px-4 py-3 text-sm ${config.color} transition-all`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{event.label}</p>
            {snippet && !expanded && (
              <p className="mt-0.5 truncate text-xs opacity-70">{snippet}</p>
            )}
            {expanded && hasMore && (
              <div className="mt-2 rounded bg-white/60 px-3 py-2 font-mono text-xs leading-relaxed">
                {Object.entries(event.metadata).map(([k, v]) => (
                  <div key={k}>
                    <span className="font-semibold">{k}:</span>{" "}
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            <span className="text-xs opacity-60">
              {new Date(event.createdAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {hasMore && (
              <button
                onClick={() => setExpanded((x) => !x)}
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                {expanded ? "Réduire" : "Détails"}
              </button>
            )}
          </div>
        </div>
        {event.ipAddress && <p className="mt-1 text-xs opacity-50">{event.ipAddress}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);

  const { data: employee } = useQuery({
    queryKey: ["employee-stub", id],
    queryFn: () =>
      apiGet<EmployeeStub>(`/v1/users/${id}`).then((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        matriculeNumber: u.matriculeNumber,
      })),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["employee-timeline", id, limit],
    queryFn: () => apiGet<TimelineEvent[]>(`/v1/users/${id}/timeline?limit=${limit}`),
  });

  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  const grouped = groupByDay(filtered);

  const categoryCounts = ALL_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = events.filter((e) => e.category === cat).length;
    return acc;
  }, {});

  return (
    <div>
      <AdminTopBar
        title={employee ? `Chronologie — ${employee.displayName}` : "Chronologie"}
        {...(employee ? { subtitle: employee.matriculeNumber ?? employee.email } : {})}
        actions={
          <Link href={`/employees/${id}`}>
            <Button variant="secondary" size="sm">
              ← Retour au profil
            </Button>
          </Link>
        }
      />

      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
        <Link href="/employees" className="hover:text-slate-700">
          Agents
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/employees/${id}`} className="hover:text-slate-700">
          {employee?.displayName ?? id}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">Chronologie</span>
      </div>

      <div className="p-6">
        {/* Summary strip */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "all"
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            Tous
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
              {events.length}
            </span>
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat]!;
            const count = categoryCounts[cat] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === cat
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg
              className="mb-3 h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">
              Aucun événement{filter !== "all" ? " dans cette catégorie" : ""}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-8">
            {grouped.map(([dayIso, dayEvents]) => (
              <div key={dayIso}>
                {/* Day header */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {fmtDayHeader(dayIso)}
                  </span>
                  <div className="flex-1 border-t border-slate-100" />
                  <Badge variant="gray">{dayEvents.length}</Badge>
                </div>

                {/* Events for this day */}
                <div className="relative border-l-2 border-slate-100 pl-2 space-y-3">
                  {dayEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {events.length >= limit && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + 100)}>
                  Charger 100 événements de plus
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
