"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import {
  fmtDateTime,
  SESSION_STATUS_COLOR,
  SESSION_STATUS_LABELS,
  type CabinetSession,
  type CabinetSessionStatus,
} from "@/lib/executive-types";

const STATUS_FILTERS: { value: CabinetSessionStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "SCHEDULED", label: "Planifiées" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default function CabinetSessionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<CabinetSessionStatus | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sessionNumber: "",
    title: "",
    description: "",
    scheduledAt: "",
    location: "Palais de la Nation, Kinshasa",
  });
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (status !== "ALL") params["status"] = status;

  const { data, isLoading } = useQuery<CabinetSession[]>({
    queryKey: ["cabinet-sessions", status],
    queryFn: () => apiGet("/v1/executive/cabinet/sessions", params),
    staleTime: 30_000,
  });

  const mutation = useMutation<CabinetSession, Error>({
    mutationFn: () =>
      apiPost<CabinetSession>("/v1/executive/cabinet/sessions", {
        ...form,
        sessionNumber: parseInt(form.sessionNumber, 10),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cabinet-sessions"] });
      setShowForm(false);
      setForm({
        sessionNumber: "",
        title: "",
        description: "",
        scheduledAt: "",
        location: "Palais de la Nation, Kinshasa",
      });
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const sessions = data ?? [];

  return (
    <>
      <AdminTopBar
        title="Conseil des Ministres"
        subtitle="Sessions du Cabinet — République Démocratique du Congo"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
          >
            + Nouvelle session
          </button>
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
        ) : (
          <>
            {/* New session form */}
            {showForm && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-sm font-semibold text-white">Planifier une session</h2>
                  {error && (
                    <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">N° de session *</label>
                      <input
                        type="number"
                        value={form.sessionNumber}
                        onChange={(e) => setForm((f) => ({ ...f, sessionNumber: e.target.value }))}
                        placeholder="42"
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Date et heure *</label>
                      <input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Titre *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Session ordinaire du Conseil des Ministres..."
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Lieu</label>
                      <input
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Description</label>
                      <input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mutation.mutate()}
                      disabled={
                        !form.title ||
                        !form.scheduledAt ||
                        !form.sessionNumber ||
                        mutation.isPending
                      }
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                    >
                      {mutation.isPending ? "Planification..." : "Planifier"}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setError(null);
                      }}
                      className="rounded border border-navy-700 px-4 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Sessions list */}
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-navy-300 font-medium mb-1">Aucune session du Conseil</p>
                <p className="text-sm text-navy-500 mb-4">
                  Planifiez la première session du Conseil des Ministres.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Planifier une session
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/executive/cabinet/${s.id}`}
                    className="block rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4 hover:border-navy-600 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Session number badge */}
                      <div className="shrink-0 h-12 w-12 rounded-lg bg-navy-900 border border-navy-700 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-navy-500 leading-none">N°</span>
                        <span className="text-lg font-black text-white leading-tight">
                          {s.sessionNumber}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                          <span
                            className={cn(
                              "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium",
                              SESSION_STATUS_COLOR[s.status],
                            )}
                          >
                            {SESSION_STATUS_LABELS[s.status]}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-navy-400">
                          <span>{fmtDateTime(s.scheduledAt)}</span>
                          {s.location && <span>📍 {s.location}</span>}
                          <span>Présidé par: {s.chair.displayName ?? s.chair.email}</span>
                        </div>

                        {s._count && (
                          <div className="flex gap-3 mt-2 text-[10px] text-navy-500">
                            <span>{s._count.agendaItems} points de l'ordre du jour</span>
                            <span>·</span>
                            <span>
                              {s._count.decisions} décision{s._count.decisions !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
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
