"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { ClassificationBadge } from "@/components/documents/ClassificationBadge";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPatch } from "@/lib/api";

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

interface Document {
  id: string;
  title: string;
  type: DocType;
  classification: Classification;
  content: Record<string, unknown>;
  tags: string[];
}

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const { data: doc, isLoading } = useQuery<Document>({
    queryKey: ["document", id],
    queryFn: () => apiGet<Document>(`/v1/documents/${id}`),
  });

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType>("MEMO");
  const [classification, setClassification] = useState<Classification>("INTERNAL");
  const [content, setContent] = useState<Record<string, unknown>>({ type: "doc", content: [] });
  const [tags, setTags] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setType(doc.type);
      setClassification(doc.classification);
      setContent(doc.content);
      setTags(doc.tags.join(", "));
    }
  }, [doc]);

  const handleContentChange = useCallback((json: Record<string, unknown>) => {
    setContent(json);
    setDirty(true);
  }, []);

  const save = useMutation({
    mutationFn: () =>
      apiPatch(`/v1/documents/${id}`, {
        title,
        type,
        classification,
        content,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["document", id] });
      setDirty(false);
      router.push(`/admin/documents/${id}`);
    },
  });

  if (isLoading || !doc) return <PageSpinner />;

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title={`Modifier — ${title}`}
        actions={
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-600 font-medium">Non sauvegardé</span>}
            <button
              type="button"
              onClick={() => router.push(`/admin/documents/${id}`)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void save.mutate()}
              disabled={save.isPending}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {save.isPending ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
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
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">TYPE</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as DocType);
                  setDirty(true);
                }}
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
                onChange={(e) => {
                  setClassification(e.target.value as Classification);
                  setDirty(true);
                }}
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
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">TAGS</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  setDirty(true);
                }}
                placeholder="tag1, tag2"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto p-6">
          <DocumentEditor
            content={content}
            onChange={handleContentChange}
            className="min-h-[600px]"
          />
        </main>
      </div>
    </div>
  );
}
