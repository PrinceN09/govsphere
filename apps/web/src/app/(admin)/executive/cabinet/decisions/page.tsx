"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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
  fmtDate,
  type CabinetDecision,
  type DecisionPriority,
  type DecisionStatus,
} from "@/lib/executive-types";

const DECISION_PRIORITIES: DecisionPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const DECISION_STATUSES: DecisionStatus[] = [
  "DRAFT",
  "UNDER_REVIEW",
  "ADOPTED",
  "REJECTED",
  "DEFERRED",
  "WITHDRAWN",
];

function DecisionsContent() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "NORMAL" as DecisionPriority,
    dueDate: "",
    ...(sessionId ? { sessionId } : {}),
  });

  const queryParams: Record<string, string> = {};
  if (statusFilter !== "ALL") queryParams["status"] = statusFilter;
  if (sessionId) queryParams["sessionId"] = sessionId;

  const { data, isLoading } = useQuery<CabinetDecision[]>({
    queryKey: ["cabinet-decisions", statusFilter, sessionId],
    queryFn: () => apiGet("/v1/executive/cabinet/decisions", queryParams),
    staleTime: 30_000,
  });

  const mutation = useMutation<CabinetDecision, Error>({
    mutationFn: () => apiPost<CabinetDecision>("/v1/executive/cabinet/decisions", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cabinet-decisions"] });
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        priority: "NORMAL",
        dueDate: "",
        ...(sessionId ? { sessionId } : {}),
      });
    },
  });

  const decisions = data ?? [];

  return (
    <>
      <AdminTopBar
        title="Décisions du Conseil"
        subtitle="Toutes les décisions · Conseil des Ministres — RDC"
        actions={
          <div className="flex gap-2">
            {sessionId && (
              <Link
                href={`/admin/executive/cabinet/${sessionId}`}
                className="rounded border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-300 hover:text-white transition-colors"
              >
                ← Session
              </Link>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
            >
              + Nouvelle décision
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === "ALL"
                ? "bg-primary-600 text-white"
                : "bg-navy-800 border border-navy-700 text-navy-300 hover:border-navy-600",
            )}
          >
            Toutes
          </button>
          {DECISION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-navy-800 border border-navy-700 text-navy-300 hover:border-navy-600",
              )}
            >
              {DECISION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            {/* Create form */}
            {showForm && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-sm font-semibold text-white">Enregistrer une décision</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Titre *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Décision relative à..."
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Priorité</label>
                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, priority: e.target.value as DecisionPriority }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      >
                        {DECISION_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {DECISION_PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Échéance</label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mutation.mutate()}
                      disabled={!form.title || mutation.isPending}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                    >
                      {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="rounded border border-navy-700 px-4 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {decisions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-navy-300 font-medium mb-1">Aucune décision</p>
                <p className="text-sm text-navy-500 mb-4">
                  Enregistrez la première décision du Conseil des Ministres.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Nouvelle décision
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/executive/cabinet/decisions/${d.id}`}
                    className="block rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4 hover:border-navy-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs text-navy-500">
                            {d.decisionNumber}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              DECISION_PRIORITY_COLOR[d.priority],
                            )}
                          >
                            {DECISION_PRIORITY_LABELS[d.priority]}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{d.title}</p>
                        <div className="flex flex-wrap items-center gap-x-4 mt-1 text-xs text-navy-400">
                          {d.responsibleMinistry && <span>{d.responsibleMinistry.name}</span>}
                          {d.dueDate && <span>Échéance: {fmtDate(d.dueDate)}</span>}
                          {d.owner && (
                            <span>Responsable: {d.owner.displayName ?? d.owner.email}</span>
                          )}
                        </div>
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function CabinetDecisionsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DecisionsContent />
    </Suspense>
  );
}
