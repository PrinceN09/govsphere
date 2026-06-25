"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ClassificationBadge } from "@/components/documents/ClassificationBadge";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { apiGet, apiPost } from "@/lib/api";

type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";
type DocType =
  | "MEMO"
  | "REPORT"
  | "CIRCULAR"
  | "LETTER"
  | "SPEECH"
  | "DECREE"
  | "DIRECTIVE"
  | "NOTE"
  | "OTHER";

const TYPE_LABELS: Record<DocType, string> = {
  MEMO: "Mémo",
  REPORT: "Rapport",
  CIRCULAR: "Circulaire",
  LETTER: "Lettre",
  SPEECH: "Discours",
  DECREE: "Décret",
  DIRECTIVE: "Directive",
  NOTE: "Note",
  OTHER: "Autre",
};

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: DocType;
  classification: Classification;
  createdAt: string;
  ministry?: { id: string; name: string } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DocType>("MEMO");
  const [classification, setClassification] = useState<Classification>("INTERNAL");

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => apiGet<Template[]>("/v1/documents/templates"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost("/v1/documents/templates", {
        name,
        description: description || undefined,
        type,
        classification,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["templates"] });
      setShowForm(false);
      setName("");
      setDescription("");
    },
  });

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Modèles de documents"
        subtitle="Modèles réutilisables pour créer des documents rapidement"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            {showForm ? "Annuler" : "Nouveau modèle"}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Create form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Créer un modèle</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="Modèle de circulaire…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="Description courte (optionnel)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DocType)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  {(Object.keys(TYPE_LABELS) as DocType[]).map((k) => (
                    <option key={k} value={k}>
                      {TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Classification
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as Classification)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  {(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"] as Classification[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void create.mutate()}
                disabled={!name || create.isPending}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {create.isPending ? "Création…" : "Créer le modèle"}
              </button>
            </div>
          </div>
        )}

        {/* Templates grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : !templates?.length ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500">Aucun modèle disponible.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{TYPE_LABELS[t.type]}</p>
                  </div>
                  <ClassificationBadge classification={t.classification} />
                </div>
                {t.description && (
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2">{t.description}</p>
                )}
                {t.ministry && <p className="mt-2 text-[11px] text-slate-400">{t.ministry.name}</p>}
                <p className="mt-3 text-[11px] text-slate-400">{fmtDate(t.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
