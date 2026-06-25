"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";
import {
  BRIEFING_STATUS_COLOR,
  BRIEFING_STATUS_LABELS,
  BRIEFING_TYPE_LABELS,
  fmtDate,
  type BriefingStatus,
  type ExecutiveBriefing,
} from "@/lib/executive-types";

const STATUS_FILTERS: { value: BriefingStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "REVIEW", label: "En révision" },
  { value: "APPROVED", label: "Approuvés" },
  { value: "DISTRIBUTED", label: "Distribués" },
];

export default function BriefingsPage() {
  const [status, setStatus] = useState<BriefingStatus | "ALL">("ALL");

  const params: Record<string, string> = {};
  if (status !== "ALL") params["status"] = status;

  const { data, isLoading } = useQuery<ExecutiveBriefing[]>({
    queryKey: ["executive-briefings", status],
    queryFn: () => apiGet("/v1/executive/briefings", params),
    staleTime: 30_000,
  });

  const briefings = data ?? [];

  return (
    <>
      <AdminTopBar
        title="Briefings exécutifs"
        subtitle="Briefings quotidiens, hebdomadaires et de cabinet"
        actions={
          <Link
            href="/admin/executive/briefings/new"
            className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
          >
            + Nouveau briefing
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-navy-800 border border-navy-700 text-navy-300 hover:border-navy-600",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : briefings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-navy-300 font-medium mb-1">Aucun briefing</p>
            <p className="text-sm text-navy-500 mb-4">Créez le premier briefing exécutif.</p>
            <Link
              href="/admin/executive/briefings/new"
              className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
            >
              Créer un briefing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {briefings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/executive/briefings/${b.id}`}
                className="block rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4 hover:border-navy-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] rounded bg-navy-700 px-1.5 py-0.5 text-navy-300">
                        {BRIEFING_TYPE_LABELS[b.briefingType]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{b.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 mt-1 text-xs text-navy-400">
                      <span>{b.author.displayName ?? b.author.email}</span>
                      {b.scheduledFor && <span>Prévu: {fmtDate(b.scheduledFor)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-medium",
                        BRIEFING_STATUS_COLOR[b.status],
                      )}
                    >
                      {BRIEFING_STATUS_LABELS[b.status]}
                    </span>
                    {b.versionHistory.length > 0 && (
                      <span className="text-[10px] text-navy-500">
                        v{b.versionHistory.length + 1}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
