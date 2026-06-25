"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import {
  CLASSIFICATION_COLOR,
  CLASSIFICATION_LABELS,
  CORRESPONDENCE_TYPE_LABELS,
  fmtDate,
  type CorrespondenceClassification,
  type CorrespondenceType,
  type ExecutiveCorrespondence,
} from "@/lib/executive-types";

const CORRESPONDENCE_TYPES: CorrespondenceType[] = [
  "OFFICIAL_LETTER",
  "PRESIDENTIAL_DIRECTIVE",
  "MINISTERIAL_MEMO",
  "CABINET_CIRCULAR",
  "EXECUTIVE_NOTE",
  "COMMUNIQUE",
];

const CLASSIFICATION_OPTIONS: CorrespondenceClassification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "TOP_SECRET",
];

export default function CorrespondencePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    correspondenceType: "OFFICIAL_LETTER" as CorrespondenceType,
    classification: "INTERNAL" as CorrespondenceClassification,
    body: "",
    dueDate: "",
  });

  const { data, isLoading } = useQuery<ExecutiveCorrespondence[]>({
    queryKey: ["executive-correspondence"],
    queryFn: () => apiGet("/v1/executive/correspondence"),
    staleTime: 30_000,
  });

  const mutation = useMutation<ExecutiveCorrespondence, Error>({
    mutationFn: () => apiPost<ExecutiveCorrespondence>("/v1/executive/correspondence", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["executive-correspondence"] });
      setShowForm(false);
      setForm({
        subject: "",
        correspondenceType: "OFFICIAL_LETTER",
        classification: "INTERNAL",
        body: "",
        dueDate: "",
      });
    },
  });

  const items = data ?? [];

  return (
    <>
      <AdminTopBar
        title="Correspondances"
        subtitle="Courriers officiels, directives et circulaires"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
          >
            + Nouvelle correspondance
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            {showForm && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-sm font-semibold text-white">Nouvelle correspondance</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Objet *</label>
                      <input
                        value={form.subject}
                        onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                        placeholder="Objet de la correspondance..."
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Type *</label>
                      <select
                        value={form.correspondenceType}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            correspondenceType: e.target.value as CorrespondenceType,
                          }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      >
                        {CORRESPONDENCE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {CORRESPONDENCE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Classification</label>
                      <select
                        value={form.classification}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            classification: e.target.value as CorrespondenceClassification,
                          }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      >
                        {CLASSIFICATION_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {CLASSIFICATION_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Corps *</label>
                      <textarea
                        value={form.body}
                        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                        rows={5}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mutation.mutate()}
                      disabled={!form.subject || !form.body || mutation.isPending}
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

            {items.length === 0 && !showForm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-navy-300 font-medium mb-1">Aucune correspondance</p>
                <p className="text-sm text-navy-500 mb-4">
                  Créez la première correspondance officielle.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Nouvelle correspondance
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs text-navy-500">
                            {c.referenceNumber}
                          </span>
                          <span className="text-[10px] rounded bg-navy-700 px-1.5 py-0.5 text-navy-300">
                            {CORRESPONDENCE_TYPE_LABELS[c.correspondenceType]}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{c.subject}</p>
                        <div className="flex flex-wrap items-center gap-x-4 mt-1 text-xs text-navy-400">
                          <span>De: {c.fromUser.displayName ?? c.fromUser.email}</span>
                          {c.sentAt && <span>Envoyé: {fmtDate(c.sentAt)}</span>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium",
                          CLASSIFICATION_COLOR[c.classification],
                        )}
                      >
                        {CLASSIFICATION_LABELS[c.classification]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
