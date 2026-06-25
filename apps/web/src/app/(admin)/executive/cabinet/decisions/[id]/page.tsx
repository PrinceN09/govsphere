"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  fmtDate,
  IMPLEMENTATION_STATUS_COLOR,
  IMPLEMENTATION_STATUS_LABELS,
  type CabinetDecision,
} from "@/lib/executive-types";

type Tab = "overview" | "implementation";

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [showImplForm, setShowImplForm] = useState(false);
  const [implForm, setImplForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  const { data, isLoading } = useQuery<CabinetDecision>({
    queryKey: ["cabinet-decision", id],
    queryFn: () => apiGet(`/v1/executive/cabinet/decisions/${id}`),
    enabled: !!id,
  });

  const adoptMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/decisions/${id}/adopt`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-decision", id] }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/decisions/${id}/reject`, { reason: "" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-decision", id] }),
  });

  const deferMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/decisions/${id}/defer`, { reason: "" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cabinet-decision", id] }),
  });

  const addImplMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/cabinet/decisions/${id}/implementations`, implForm),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cabinet-decision", id] });
      setShowImplForm(false);
      setImplForm({ title: "", description: "", dueDate: "" });
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return <div className="p-6 text-navy-400">Décision introuvable</div>;

  const canAct = ["DRAFT", "PROPOSED", "UNDER_REVIEW"].includes(data.status);

  return (
    <>
      <AdminTopBar
        title={data.title}
        subtitle={`${data.decisionNumber} · ${DECISION_STATUS_LABELS[data.status]}`}
        actions={
          <div className="flex items-center gap-2">
            {canAct && (
              <>
                <button
                  onClick={() => adoptMutation.mutate()}
                  className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/30 transition-colors"
                >
                  Adopter
                </button>
                <button
                  onClick={() => deferMutation.mutate()}
                  className="rounded border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-900/30 transition-colors"
                >
                  Reporter
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
                >
                  Rejeter
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              DECISION_STATUS_COLOR[data.status],
            )}
          >
            {DECISION_STATUS_LABELS[data.status]}
          </span>
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              DECISION_PRIORITY_COLOR[data.priority],
            )}
          >
            Priorité : {DECISION_PRIORITY_LABELS[data.priority]}
          </span>
          {data.session && (
            <Link
              href={`/admin/executive/cabinet/${data.session.id}`}
              className="rounded px-2 py-1 text-xs bg-navy-800 border border-navy-700 text-navy-300 hover:text-white transition-colors"
            >
              Session N° {data.session.sessionNumber}
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-navy-800">
          <div className="flex gap-0">
            {(["overview", "implementation"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-navy-400 hover:text-navy-200",
                )}
              >
                {t === "overview" ? "Aperçu" : "Mise en œuvre"}
                {t === "implementation" && data.implementations && (
                  <span className="ml-1.5 rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px]">
                    {data.implementations.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Overview */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "N° décision", value: data.decisionNumber },
                {
                  label: "Responsable",
                  value: data.owner ? (data.owner.displayName ?? data.owner.email) : "—",
                },
                {
                  label: "Ministère responsable",
                  value: data.responsibleMinistry?.name ?? "—",
                },
                { label: "Échéance", value: data.dueDate ? fmtDate(data.dueDate) : "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-navy-700 bg-navy-800 px-4 py-3"
                >
                  <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-white">{value}</p>
                </div>
              ))}
            </div>

            {data.content && (
              <Card>
                <CardBody>
                  <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
                    Contenu
                  </h3>
                  <p className="text-sm text-navy-200 whitespace-pre-wrap">{data.content}</p>
                </CardBody>
              </Card>
            )}

            {data.adoptedAt && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-900/10 px-4 py-3">
                <p className="text-xs text-emerald-400">
                  Adoptée le {fmtDate(data.adoptedAt)}
                  {data.adoptedBy && ` par ${data.adoptedBy.displayName ?? data.adoptedBy.email}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Implementation */}
        {tab === "implementation" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-navy-400">
                {data.implementations?.length ?? 0} action
                {(data.implementations?.length ?? 0) !== 1 ? "s" : ""} de mise en œuvre
              </p>
              {data.status === "ADOPTED" && (
                <button
                  onClick={() => setShowImplForm(true)}
                  className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  + Ajouter une action
                </button>
              )}
            </div>

            {showImplForm && (
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Nouvelle action</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Titre *</label>
                      <input
                        value={implForm.title}
                        onChange={(e) => setImplForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Échéance</label>
                      <input
                        type="date"
                        value={implForm.dueDate}
                        onChange={(e) => setImplForm((f) => ({ ...f, dueDate: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Description</label>
                      <input
                        value={implForm.description}
                        onChange={(e) =>
                          setImplForm((f) => ({ ...f, description: e.target.value }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addImplMutation.mutate()}
                      disabled={!implForm.title || addImplMutation.isPending}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                    >
                      {addImplMutation.isPending ? "..." : "Ajouter"}
                    </button>
                    <button
                      onClick={() => setShowImplForm(false)}
                      className="rounded border border-navy-700 px-4 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {!data.implementations?.length ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-navy-500 italic">
                    {data.status === "ADOPTED"
                      ? "Aucune action de mise en œuvre enregistrée."
                      : "La décision doit être adoptée avant d'enregistrer les actions de mise en œuvre."}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.implementations.map((impl) => (
                  <div
                    key={impl.id}
                    className="rounded-lg border border-navy-700 bg-navy-800/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-white">{impl.title}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          IMPLEMENTATION_STATUS_COLOR[impl.status],
                        )}
                      >
                        {IMPLEMENTATION_STATUS_LABELS[impl.status]}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] text-navy-500 mb-1">
                        <span>Avancement</span>
                        <span>{impl.progressPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-navy-700">
                        <div
                          className="h-1.5 rounded-full bg-primary-500 transition-all"
                          style={{ width: `${impl.progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 text-xs text-navy-400">
                      {impl.assignedTo && (
                        <span>{impl.assignedTo.displayName ?? impl.assignedTo.email}</span>
                      )}
                      {impl.dueDate && <span>Échéance: {fmtDate(impl.dueDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
