"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import {
  OFFICE_TYPE_LABELS,
  type ExecutiveOffice,
  type ExecutiveOfficeType,
} from "@/lib/executive-types";

const OFFICE_TYPES: ExecutiveOfficeType[] = [
  "PRESIDENCY",
  "PRIME_MINISTER_OFFICE",
  "CABINET_SECRETARIAT",
  "MINISTERIAL",
  "DEPUTY_MINISTERIAL",
  "PERMANENT_SECRETARY_OFFICE",
  "CHIEF_OF_STAFF_OFFICE",
  "EXECUTIVE_ASSISTANT_OFFICE",
];

const OFFICE_TYPE_ICONS: Record<ExecutiveOfficeType, string> = {
  PRESIDENCY: "🏛️",
  PRIME_MINISTER_OFFICE: "🏢",
  CABINET_SECRETARIAT: "📋",
  MINISTERIAL: "🎖️",
  DEPUTY_MINISTERIAL: "🎗️",
  PERMANENT_SECRETARY_OFFICE: "📂",
  CHIEF_OF_STAFF_OFFICE: "🗂️",
  EXECUTIVE_ASSISTANT_OFFICE: "📁",
};

export default function ExecutiveOfficesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    officeType: "MINISTERIAL" as ExecutiveOfficeType,
    code: "",
    description: "",
    location: "",
  });

  const { data, isLoading } = useQuery<ExecutiveOffice[]>({
    queryKey: ["executive-offices"],
    queryFn: () => apiGet("/v1/executive/offices"),
    staleTime: 30_000,
  });

  const mutation = useMutation<ExecutiveOffice, Error>({
    mutationFn: () => apiPost<ExecutiveOffice>("/v1/executive/offices", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["executive-offices"] });
      setShowForm(false);
      setForm({ name: "", officeType: "MINISTERIAL", code: "", description: "", location: "" });
    },
  });

  const offices = data ?? [];

  // Group by type
  const grouped = OFFICE_TYPES.reduce<Record<string, ExecutiveOffice[]>>((acc, type) => {
    acc[type] = offices.filter((o) => o.officeType === type);
    return acc;
  }, {});

  return (
    <>
      <AdminTopBar
        title="Bureaux exécutifs"
        subtitle="Présidence, Premier Ministre, Ministres & Secrétariats"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
          >
            + Nouveau bureau
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            {/* Create form */}
            {showForm && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-sm font-semibold text-white">Créer un bureau exécutif</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Nom *</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Cabinet du Ministre de..."
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Code *</label>
                      <input
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                        placeholder="PRES-001"
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Type *</label>
                      <select
                        value={form.officeType}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            officeType: e.target.value as ExecutiveOfficeType,
                          }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      >
                        {OFFICE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {OFFICE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Localisation</label>
                      <input
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="Kinshasa, RDC"
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mutation.mutate()}
                      disabled={!form.name || !form.code || mutation.isPending}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                    >
                      {mutation.isPending ? "Création..." : "Créer"}
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

            {/* Offices by type */}
            {OFFICE_TYPES.filter((t) => (grouped[t]?.length ?? 0) > 0).map((type) => (
              <div key={type}>
                <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span>{OFFICE_TYPE_ICONS[type]}</span>
                  {OFFICE_TYPE_LABELS[type]}
                  <span className="rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px]">
                    {grouped[type]?.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(grouped[type] ?? []).map((office) => (
                    <div
                      key={office.id}
                      className="rounded-lg border border-navy-700 bg-navy-800/60 p-4 hover:border-navy-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{office.name}</p>
                          <p className="text-[10px] font-mono text-navy-500 mt-0.5">
                            {office.code}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            office.isActive
                              ? "bg-emerald-900/40 text-emerald-300"
                              : "bg-navy-700 text-navy-400"
                          }`}
                        >
                          {office.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      {office.head && (
                        <p className="text-xs text-navy-300 mb-1">
                          Chef:{" "}
                          <span className="text-white">
                            {office.head.displayName ?? office.head.email}
                          </span>
                        </p>
                      )}
                      {office.location && (
                        <p className="text-xs text-navy-500">{office.location}</p>
                      )}
                      {office.ministry && (
                        <p className="text-xs text-navy-500 mt-1">
                          Ministère: {office.ministry.name}
                        </p>
                      )}
                      {office._count && (
                        <p className="text-xs text-navy-500 mt-1">
                          {office._count.staff} agent{office._count.staff !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {offices.length === 0 && !showForm && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-navy-300 font-medium mb-1">Aucun bureau exécutif</p>
                <p className="text-sm text-navy-500 mb-4">Créez le premier bureau exécutif.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Créer un bureau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
