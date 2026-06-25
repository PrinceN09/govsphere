"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ClassificationBadge } from "@/components/documents/ClassificationBadge";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

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

interface SharedEntry {
  id: string;
  canEdit: boolean;
  canExport: boolean;
  canComment: boolean;
  createdAt: string;
  sharedBy: { id: string; displayName: string };
  document: {
    id: string;
    title: string;
    type: DocType;
    classification: Classification;
    wordCount: number;
    updatedAt: string;
    author: { id: string; displayName: string };
    ministry?: { id: string; name: string } | null;
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SharedWithMePage() {
  const { data: shares, isLoading } = useQuery<SharedEntry[]>({
    queryKey: ["shared-with-me"],
    queryFn: () => apiGet<SharedEntry[]>("/v1/documents/shared-with-me"),
  });

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Partagés avec moi"
        subtitle="Documents que d'autres agents vous ont partagé"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <PageSpinner />
        ) : !shares?.length ? (
          <div className="py-24 text-center">
            <p className="text-base font-medium text-slate-700">Aucun document partagé</p>
            <p className="mt-1 text-sm text-slate-500">
              Les documents partagés avec vous apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {shares.map((s) => (
              <Link
                key={s.id}
                href={`/admin/documents/${s.document.id}`}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors truncate">
                      {s.document.title}
                    </p>
                    <ClassificationBadge classification={s.document.classification} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {TYPE_LABELS[s.document.type]}
                    {s.document.ministry ? ` · ${s.document.ministry.name}` : ""}
                    {" · "}par {s.document.author.displayName}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <p>Partagé par {s.sharedBy.displayName}</p>
                  <p className="text-slate-400">{fmtDate(s.createdAt)}</p>
                  <div className="mt-1 flex justify-end gap-1">
                    {s.canEdit && (
                      <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700">
                        modifier
                      </span>
                    )}
                    {s.canComment && (
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">
                        commenter
                      </span>
                    )}
                    {s.canExport && (
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">
                        exporter
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
