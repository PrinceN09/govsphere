"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { ClassificationBadge } from "@/components/documents/ClassificationBadge";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
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
  type: DocType;
  content: Record<string, unknown>;
}

interface NewDocumentResponse {
  id: string;
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Sans titre");
  const [type, setType] = useState<DocType>("MEMO");
  const [classification, setClassification] = useState<Classification>("INTERNAL");
  const [content, setContent] = useState<Record<string, unknown>>({ type: "doc", content: [] });
  const [tags, setTags] = useState("");

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => apiGet<Template[]>("/v1/documents/templates"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<NewDocumentResponse>("/v1/documents", {
        title,
        type,
        classification,
        content,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: (doc) => {
      router.push(`/admin/documents/${doc.id}`);
    },
  });

  const handleTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const tpl = templates?.find((t) => t.id === e.target.value);
      if (tpl) {
        setType(tpl.type);
        setContent(tpl.content ?? { type: "doc", content: [] });
      }
    },
    [templates],
  );

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Nouveau document"
        actions={
          <button
            type="button"
            onClick={() => void create.mutate()}
            disabled={!title.trim() || create.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {create.isPending ? "Création…" : "Créer le document"}
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">TITRE</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">TYPE</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocType)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                {(Object.keys(TYPE_LABELS) as DocType[]).map((k) => (
                  <option key={k} value={k}>
                    {TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                CLASSIFICATION
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as Classification)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                {(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"] as Classification[]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="mt-1.5">
                <ClassificationBadge classification={classification} size="md" />
              </div>
            </div>

            {templates && templates.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">MODÈLE</label>
                <select
                  defaultValue=""
                  onChange={handleTemplateChange}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">— Aucun modèle —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                TAGS (virgule)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="urgence, budget, 2026"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto p-6">
          <DocumentEditor
            content={content}
            onChange={setContent}
            placeholder="Commencez à rédiger votre document…"
            className="min-h-[600px]"
          />
        </main>
      </div>
    </div>
  );
}
