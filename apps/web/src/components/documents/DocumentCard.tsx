"use client";

import Link from "next/link";

import { ClassificationBadge } from "./ClassificationBadge";

type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";
type DocumentStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
type DocumentType =
  | "MEMO"
  | "REPORT"
  | "CIRCULAR"
  | "LETTER"
  | "SPEECH"
  | "DECREE"
  | "DIRECTIVE"
  | "NOTE"
  | "OTHER";

const TYPE_LABELS: Record<DocumentType, string> = {
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

const STATUS_CONFIG: Record<DocumentStatus, { label: string; dot: string }> = {
  DRAFT: { label: "Brouillon", dot: "bg-slate-400" },
  REVIEW: { label: "En révision", dot: "bg-amber-400" },
  APPROVED: { label: "Approuvé", dot: "bg-blue-500" },
  PUBLISHED: { label: "Publié", dot: "bg-emerald-500" },
  ARCHIVED: { label: "Archivé", dot: "bg-slate-300" },
};

export interface DocumentSummary {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  classification: Classification;
  wordCount: number;
  tags: string[];
  updatedAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  ministry?: { id: string; name: string; code: string } | null;
}

interface Props {
  doc: DocumentSummary;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DocumentCard({ doc }: Props) {
  const status = STATUS_CONFIG[doc.status];
  return (
    <Link
      href={`/admin/documents/${doc.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
            {doc.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{TYPE_LABELS[doc.type]}</p>
        </div>
        <ClassificationBadge classification={doc.classification} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span>·</span>
        <span>{doc.wordCount.toLocaleString()} mots</span>
        <span>·</span>
        <span>{fmtDate(doc.updatedAt)}</span>
      </div>

      {doc.ministry && <p className="mt-1.5 text-[11px] text-slate-400">{doc.ministry.name}</p>}

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">par {doc.author.displayName}</p>
        {doc.tags.length > 0 && (
          <div className="flex gap-1">
            {doc.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
