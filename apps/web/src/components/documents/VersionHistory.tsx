"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api";

interface Version {
  id: string;
  version: number;
  title: string;
  wordCount: number;
  changeNote: string | null;
  createdAt: string;
  savedBy: { id: string; displayName: string; avatarUrl: string | null };
}

interface Props {
  documentId: string;
  currentVersionNumber?: number;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionHistory({ documentId, currentVersionNumber }: Props) {
  const qc = useQueryClient();

  const { data: versions, isLoading } = useQuery<Version[]>({
    queryKey: ["document-versions", documentId],
    queryFn: () => apiGet<Version[]>(`/v1/documents/${documentId}/versions`),
  });

  const restore = useMutation({
    mutationFn: (version: number) =>
      apiPost<{ ok: boolean }>(`/v1/documents/${documentId}/versions/${String(version)}/restore`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["document", documentId] });
      void qc.invalidateQueries({ queryKey: ["document-versions", documentId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!versions?.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Aucune version sauvegardée.
        <br />
        <span className="text-xs text-slate-400">
          Les versions sont créées manuellement ou automatiquement lors de l&apos;enregistrement.
        </span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {versions.map((v) => {
        const isCurrent = v.version === currentVersionNumber;
        return (
          <div key={v.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">v{v.version}</span>
                {isCurrent && (
                  <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                    Actuelle
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-slate-700">{v.title}</p>
              {v.changeNote && (
                <p className="mt-0.5 text-xs text-slate-500 italic">{v.changeNote}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-400">
                {fmtDate(v.createdAt)} · {v.wordCount.toLocaleString()} mots ·{" "}
                {v.savedBy.displayName}
              </p>
            </div>
            {!isCurrent && (
              <button
                type="button"
                onClick={() => void restore.mutate(v.version)}
                disabled={restore.isPending}
                className="flex-shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Restaurer
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
