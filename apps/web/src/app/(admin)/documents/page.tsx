"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DocumentCard } from "@/components/documents/DocumentCard";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

import type { DocumentSummary } from "@/components/documents/DocumentCard";

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

interface ListResponse {
  data: DocumentSummary[];
  hasMore: boolean;
  nextCursor: string | null;
}

const STATUSES: { key: DocStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tous" },
  { key: "DRAFT", label: "Brouillons" },
  { key: "REVIEW", label: "En révision" },
  { key: "APPROVED", label: "Approuvés" },
  { key: "PUBLISHED", label: "Publiés" },
  { key: "ARCHIVED", label: "Archivés" },
];

const TYPES: { key: DocType | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tous types" },
  { key: "MEMO", label: "Mémo" },
  { key: "REPORT", label: "Rapport" },
  { key: "CIRCULAR", label: "Circulaire" },
  { key: "LETTER", label: "Lettre" },
  { key: "SPEECH", label: "Discours" },
  { key: "DECREE", label: "Décret" },
  { key: "DIRECTIVE", label: "Directive" },
];

export default function DocumentsPage() {
  const [status, setStatus] = useState<DocStatus | "ALL">("ALL");
  const [type, setType] = useState<DocType | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["documents", status, type, search],
    queryFn: () =>
      apiGet<ListResponse>("/v1/documents", {
        ...(status !== "ALL" ? { status } : {}),
        ...(type !== "ALL" ? { type } : {}),
        ...(search ? { search } : {}),
        limit: 50,
      }),
  });

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Documents"
        subtitle="Bibliothèque de documents officiels"
        actions={
          <Link
            href="/admin/documents/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            Nouveau document
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-52"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DocStatus | "ALL")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocType | "ALL")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            <Link
              href="/admin/documents/shared-with-me"
              className="text-primary-600 hover:underline"
            >
              Partagés avec moi
            </Link>
            <span>·</span>
            <Link href="/admin/documents/templates" className="text-primary-600 hover:underline">
              Modèles
            </Link>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <PageSpinner />
        ) : !data?.data.length ? (
          <div className="flex flex-1 items-center justify-center py-24 text-center">
            <div>
              <DocumentsIcon />
              <p className="mt-3 text-base font-medium text-slate-700">Aucun document</p>
              <p className="mt-1 text-sm text-slate-500">Créez votre premier document officiel.</p>
              <Link
                href="/admin/documents/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Nouveau document
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-slate-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
