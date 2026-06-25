"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ClassificationBadge } from "@/components/documents/ClassificationBadge";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { ExportMenu } from "@/components/documents/ExportMenu";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { VersionHistory } from "@/components/documents/VersionHistory";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";
type DocStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
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

interface Document {
  id: string;
  title: string;
  slug: string;
  type: DocType;
  status: DocStatus;
  classification: Classification;
  wordCount: number;
  tags: string[];
  content: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  ministry?: { id: string; name: string; code: string } | null;
  department?: { id: string; name: string; code: string } | null;
}

type Tab = "content" | "versions" | "comments";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentViewPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("content");
  const [showShare, setShowShare] = useState(false);

  const { data: doc, isLoading } = useQuery<Document>({
    queryKey: ["document", id],
    queryFn: () => apiGet<Document>(`/v1/documents/${id}`),
  });

  const saveVersion = useMutation({
    mutationFn: () => apiPost(`/v1/documents/${id}/versions`, { changeNote: "" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["document-versions", id] }),
  });

  const publish = useMutation({
    mutationFn: () => apiPost(`/v1/documents/${id}/publish`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["document", id] }),
  });

  if (isLoading || !doc) return <PageSpinner />;

  const canPublish = doc.status === "DRAFT" || doc.status === "APPROVED";

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title={doc.title}
        subtitle={`${TYPE_LABELS[doc.type]} · ${fmtDate(doc.updatedAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <ClassificationBadge classification={doc.classification} size="md" />
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ShareIcon />
              Partager
            </button>
            <ExportMenu documentId={id} />
            <Link
              href={`/admin/documents/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              <EditIcon />
              Modifier
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-white px-6">
            {(
              [
                ["content", "Contenu"],
                ["versions", "Versions"],
                ["comments", "Commentaires"],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`mr-4 border-b-2 py-3 text-sm font-medium transition-colors ${tab === k ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === "content" && (
              <DocumentEditor content={doc.content} readOnly className="max-w-4xl mx-auto" />
            )}
            {tab === "versions" && (
              <div className="max-w-2xl mx-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Historique des versions</h3>
                  <button
                    type="button"
                    onClick={() => void saveVersion.mutate()}
                    disabled={saveVersion.isPending}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {saveVersion.isPending ? "Sauvegarde…" : "Sauvegarder version"}
                  </button>
                </div>
                <VersionHistory documentId={id} />
              </div>
            )}
            {tab === "comments" && (
              <div className="max-w-2xl mx-auto text-sm text-slate-500 py-8 text-center">
                Commentaires — prochainement
              </div>
            )}
          </div>
        </main>

        {/* Info sidebar */}
        <aside className="w-56 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4">
          <div className="space-y-4 text-xs">
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Statut</p>
              <StatusBadge status={doc.status} />
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Auteur</p>
              <p className="text-slate-700">{doc.author.displayName}</p>
            </div>
            {doc.ministry && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                  Ministère
                </p>
                <p className="text-slate-700">{doc.ministry.name}</p>
              </div>
            )}
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Mots</p>
              <p className="text-slate-700">{doc.wordCount.toLocaleString()}</p>
            </div>
            {doc.tags.length > 0 && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Créé le</p>
              <p className="text-slate-700">
                {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {canPublish && (
              <button
                type="button"
                onClick={() => void publish.mutate()}
                disabled={publish.isPending}
                className="w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {publish.isPending ? "Publication…" : "Publier"}
              </button>
            )}
          </div>
        </aside>
      </div>

      {showShare && <ShareDialog documentId={id} onClose={() => setShowShare(false)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg: Record<DocStatus, { label: string; className: string }> = {
    DRAFT: { label: "Brouillon", className: "bg-slate-100 text-slate-600" },
    REVIEW: { label: "En révision", className: "bg-amber-100 text-amber-700" },
    APPROVED: { label: "Approuvé", className: "bg-blue-100 text-blue-700" },
    PUBLISHED: { label: "Publié", className: "bg-emerald-100 text-emerald-700" },
    ARCHIVED: { label: "Archivé", className: "bg-slate-100 text-slate-500" },
  };
  const c = cfg[status];
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>
  );
}

function ShareIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M5.5 7.1 10.5 4.9M5.5 8.9l5-2.2" strokeLinecap="round" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M11.5 2.5 13.5 4.5l-8 8L3 13l.5-2.5 8-8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
