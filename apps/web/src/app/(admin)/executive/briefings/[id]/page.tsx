"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  BRIEFING_STATUS_COLOR,
  BRIEFING_STATUS_LABELS,
  BRIEFING_TYPE_LABELS,
  fmtDate,
  fmtDateTime,
  type ExecutiveBriefing,
} from "@/lib/executive-types";

export default function BriefingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");

  function contentToString(c: unknown): string {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") {
      const obj = c as Record<string, unknown>;
      if (typeof obj["text"] === "string") return obj["text"];
    }
    return JSON.stringify(c, null, 2);
  }

  const { data, isLoading } = useQuery<ExecutiveBriefing>({
    queryKey: ["executive-briefing", id],
    queryFn: () => apiGet(`/v1/executive/briefings/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiPatch(`/v1/executive/briefings/${id}`, { title: editTitle, content: editContent }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["executive-briefing", id] });
      setEditing(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/briefings/${id}/submit`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["executive-briefing", id] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/briefings/${id}/approve`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["executive-briefing", id] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiPost(`/v1/executive/briefings/${id}/publish`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["executive-briefing", id] }),
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return <div className="p-6 text-navy-400">Briefing introuvable</div>;

  const isDraft = data.status === "DRAFT";
  const isUnderReview = data.status === "REVIEW";
  const isApproved = data.status === "APPROVED";

  const startEditing = () => {
    setEditTitle(data.title);
    setEditContent(contentToString(data.content));
    setEditing(true);
  };

  return (
    <>
      <AdminTopBar
        title={editing ? "Modifier le briefing" : data.title}
        subtitle={`${BRIEFING_TYPE_LABELS[data.briefingType]} · v${data.versionHistory.length + 1}`}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && !editing && (
              <button
                onClick={startEditing}
                className="rounded border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-300 hover:text-white transition-colors"
              >
                Modifier
              </button>
            )}
            {isDraft && (
              <button
                onClick={() => submitMutation.mutate()}
                className="rounded border border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-900/30 transition-colors"
              >
                Soumettre pour révision
              </button>
            )}
            {isUnderReview && (
              <button
                onClick={() => approveMutation.mutate()}
                className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/30 transition-colors"
              >
                Approuver
              </button>
            )}
            {isApproved && (
              <button
                onClick={() => publishMutation.mutate()}
                className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
              >
                Publier
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-3xl">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              BRIEFING_STATUS_COLOR[data.status],
            )}
          >
            {BRIEFING_STATUS_LABELS[data.status]}
          </span>
          {data.scheduledFor && (
            <span className="rounded px-2 py-1 text-xs bg-navy-800 border border-navy-700 text-navy-300">
              Prévu: {fmtDate(data.scheduledFor)}
            </span>
          )}
        </div>

        {/* Meta info row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-navy-400">
          <span>
            Auteur:{" "}
            <span className="text-navy-200">{data.author.displayName ?? data.author.email}</span>
          </span>
          <span>
            Créé: <span className="text-navy-200">{fmtDateTime(data.createdAt)}</span>
          </span>
          {data.approvedBy && (
            <span>
              Approuvé par:{" "}
              <span className="text-navy-200">
                {data.approvedBy.displayName ?? data.approvedBy.email}
              </span>
            </span>
          )}
          {data.publishedAt && (
            <span>
              Publié: <span className="text-navy-200">{fmtDateTime(data.publishedAt)}</span>
            </span>
          )}
        </div>

        {/* Content */}
        {editing ? (
          <Card>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs text-navy-400 mb-1">Titre</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Contenu</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none resize-y font-mono leading-relaxed"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded border border-navy-700 px-4 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
                >
                  Annuler
                </button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="prose prose-sm prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-navy-200 leading-relaxed">
                  {contentToString(data.content)}
                </pre>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Version history */}
        {data.versionHistory && data.versionHistory.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3">
                Historique des versions
              </h3>
              <div className="space-y-2">
                {(data.versionHistory as Array<{ version?: number; savedAt?: string }>).map(
                  (v, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-navy-400">
                      <span className="font-mono text-navy-500">v{v.version ?? i + 1}</span>
                      {v.savedAt && <span>{fmtDateTime(v.savedAt)}</span>}
                    </div>
                  ),
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
