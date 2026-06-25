"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import {
  DECISION_PRIORITY_COLOR,
  DECISION_PRIORITY_LABELS,
  DECISION_STATUS_COLOR,
  DECISION_STATUS_LABELS,
  fmtDateTime,
  SESSION_STATUS_COLOR,
  SESSION_STATUS_LABELS,
  type CabinetDecision,
  type CabinetSession,
} from "@/lib/executive-types";
import { hasPermission, PERMS } from "@/lib/permissions";

type Tab = "overview" | "agenda" | "decisions";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Aperçu" },
  { id: "agenda", label: "Ordre du jour" },
  { id: "decisions", label: "Décisions" },
];

export default function CabinetSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: nextSession } = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const permissions = (nextSession?.user as { permissions?: string[] })?.permissions ?? [];

  const { data, isLoading } = useQuery<CabinetSession>({
    queryKey: ["cabinet-session", id],
    queryFn: () => apiGet(`/v1/executive/cabinet/sessions/${id}`),
    enabled: !!id,
  });

  const startMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/sessions/${id}/start`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-session", id] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/sessions/${id}/complete`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-session", id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/sessions/${id}/cancel`, { reason: "Annulé" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-session", id] }),
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return <div className="p-6 text-navy-400">Session introuvable</div>;

  const canManage = hasPermission(permissions, PERMS.CABINET_MANAGE);
  const canDecide = hasPermission(permissions, PERMS.CABINET_DECISION_ADOPT);

  return (
    <>
      <AdminTopBar
        title={data.title}
        subtitle={`Session N° ${data.sessionNumber} · ${fmtDateTime(data.scheduledAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {canManage && data.status === "SCHEDULED" && (
              <button
                onClick={() => startMutation.mutate()}
                className="rounded border border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-900/30 transition-colors"
              >
                Démarrer
              </button>
            )}
            {canManage && data.status === "IN_PROGRESS" && (
              <button
                onClick={() => completeMutation.mutate()}
                className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/30 transition-colors"
              >
                Clôturer
              </button>
            )}
            {canManage && ["SCHEDULED", "IN_PROGRESS"].includes(data.status) && (
              <button
                onClick={() => {
                  if (confirm("Annuler cette session ?")) cancelMutation.mutate();
                }}
                className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Status + meta */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              SESSION_STATUS_COLOR[data.status],
            )}
          >
            {SESSION_STATUS_LABELS[data.status]}
          </span>
          {data.location && (
            <span className="rounded px-2 py-1 text-xs text-navy-300 bg-navy-800 border border-navy-700">
              📍 {data.location}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-navy-800">
          <div className="flex gap-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-navy-400 hover:text-navy-200",
                )}
              >
                {t.label}
                {t.id === "agenda" && data.agendaItems && (
                  <span className="ml-1.5 rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px]">
                    {data.agendaItems.length}
                  </span>
                )}
                {t.id === "decisions" && data.decisions && (
                  <span className="ml-1.5 rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px]">
                    {data.decisions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Date & heure", value: fmtDateTime(data.scheduledAt) },
              { label: "Président de séance", value: data.chair.displayName ?? data.chair.email },
              {
                label: "Secrétaire",
                value: data.secretary ? (data.secretary.displayName ?? data.secretary.email) : "—",
              },
              { label: "Lieu", value: data.location ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-navy-700 bg-navy-800 px-4 py-3">
                <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-medium text-white">{value}</p>
              </div>
            ))}
            {data.description && (
              <div className="col-span-2">
                <Card>
                  <CardBody>
                    <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-navy-200 whitespace-pre-wrap">{data.description}</p>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Tab: Agenda */}
        {tab === "agenda" && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Ordre du jour</h3>
              </div>
              {!data.agendaItems?.length ? (
                <p className="text-sm text-navy-500 italic">Aucun point à l'ordre du jour</p>
              ) : (
                <div className="space-y-3">
                  {data.agendaItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-lg bg-navy-800 border border-navy-700 p-3"
                    >
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary-900 border border-primary-700 flex items-center justify-center text-xs font-bold text-primary-300">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              item.completed ? "line-through text-navy-500" : "text-white",
                            )}
                          >
                            {item.title}
                          </p>
                          {item.durationMinutes && (
                            <span className="text-xs text-navy-500 shrink-0">
                              {item.durationMinutes} min
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-navy-400 mt-0.5">{item.description}</p>
                        )}
                        {item.presentedBy && (
                          <p className="text-xs text-navy-500 mt-0.5">
                            Présenté par: {item.presentedBy.displayName ?? item.presentedBy.email}
                          </p>
                        )}
                        {item.decisions && item.decisions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.decisions.map((d) => (
                              <Link
                                key={d.id}
                                href={`/admin/executive/cabinet/decisions/${d.id}`}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  DECISION_STATUS_COLOR[d.status],
                                )}
                              >
                                {d.decisionNumber}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Tab: Decisions */}
        {tab === "decisions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-navy-400">
                {data.decisions?.length ?? 0} décision
                {(data.decisions?.length ?? 0) !== 1 ? "s" : ""}
              </p>
              {canDecide && data.status === "IN_PROGRESS" && (
                <Link
                  href={`/admin/executive/cabinet/decisions?session=${id}`}
                  className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  + Nouvelle décision
                </Link>
              )}
            </div>

            {!data.decisions?.length ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-navy-500 italic">
                    Aucune décision enregistrée pour cette session
                  </p>
                </CardBody>
              </Card>
            ) : (
              data.decisions.map((d: CabinetDecision) => (
                <Link
                  key={d.id}
                  href={`/admin/executive/cabinet/decisions/${d.id}`}
                  className="block rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4 hover:border-navy-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-navy-500">{d.decisionNumber}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            DECISION_PRIORITY_COLOR[d.priority],
                          )}
                        >
                          {DECISION_PRIORITY_LABELS[d.priority]}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{d.title}</p>
                      {d.responsibleMinistry && (
                        <p className="text-xs text-navy-400 mt-0.5">{d.responsibleMinistry.name}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium",
                        DECISION_STATUS_COLOR[d.status],
                      )}
                    >
                      {DECISION_STATUS_LABELS[d.status]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
