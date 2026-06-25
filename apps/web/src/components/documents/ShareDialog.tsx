"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiDelete, apiGet, apiPost } from "@/lib/api";

type ShareScope = "USER" | "MINISTRY" | "DEPARTMENT" | "DIVISION";

interface ShareEntry {
  id: string;
  scope: ShareScope;
  canEdit: boolean;
  canComment: boolean;
  canExport: boolean;
  sharedBy: { id: string; displayName: string };
  targetUser?: { id: string; displayName: string } | null;
  targetMinistry?: { id: string; name: string } | null;
  targetDepartment?: { id: string; name: string } | null;
  targetDivision?: { id: string; name: string } | null;
}

interface Props {
  documentId: string;
  onClose: () => void;
}

const SCOPE_LABELS: Record<ShareScope, string> = {
  USER: "Utilisateur",
  MINISTRY: "Ministère",
  DEPARTMENT: "Département",
  DIVISION: "Division",
};

function shareTargetLabel(s: ShareEntry): string {
  return (
    s.targetUser?.displayName ??
    s.targetMinistry?.name ??
    s.targetDepartment?.name ??
    s.targetDivision?.name ??
    "—"
  );
}

export function ShareDialog({ documentId, onClose }: Props) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<ShareScope>("USER");
  const [targetId, setTargetId] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [canComment, setCanComment] = useState(true);
  const [canExport, setCanExport] = useState(false);

  const { data: shares, isLoading } = useQuery<ShareEntry[]>({
    queryKey: ["document-shares", documentId],
    queryFn: () => apiGet<ShareEntry[]>(`/v1/documents/${documentId}/shares`),
  });

  const addShare = useMutation({
    mutationFn: () =>
      apiPost(`/v1/documents/${documentId}/shares`, {
        scope,
        canEdit,
        canComment,
        canExport,
        ...(scope === "USER" ? { targetUserId: targetId } : {}),
        ...(scope === "MINISTRY" ? { targetMinistryId: targetId } : {}),
        ...(scope === "DEPARTMENT" ? { targetDepartmentId: targetId } : {}),
        ...(scope === "DIVISION" ? { targetDivisionId: targetId } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["document-shares", documentId] });
      setTargetId("");
    },
  });

  const removeShare = useMutation({
    mutationFn: (shareId: string) => apiDelete(`/v1/documents/${documentId}/shares/${shareId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["document-shares", documentId] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Partager le document</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-100 text-slate-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Scope selector */}
          <div className="flex gap-2">
            {(["USER", "MINISTRY", "DEPARTMENT", "DIVISION"] as ShareScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScope(s);
                  setTargetId("");
                }}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${scope === s ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Target ID input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              ID de {SCOPE_LABELS[scope]}
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={`Saisir l'ID du ${SCOPE_LABELS[scope].toLowerCase()}`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Permissions */}
          <div className="flex gap-4">
            {[
              { key: "canEdit", label: "Modifier", value: canEdit, set: setCanEdit },
              { key: "canComment", label: "Commenter", value: canComment, set: setCanComment },
              { key: "canExport", label: "Exporter", value: canExport, set: setCanExport },
            ].map(({ key, label, value, set }) => (
              <label
                key={key}
                className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void addShare.mutate()}
            disabled={!targetId || addShare.isPending}
            className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {addShare.isPending ? "Partage…" : "Partager"}
          </button>
        </div>

        {/* Existing shares */}
        <div className="border-t border-slate-200 px-6 pb-6">
          <p className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Accès actuels
          </p>
          {isLoading ? (
            <div className="py-4 text-center text-sm text-slate-400">Chargement…</div>
          ) : !shares?.length ? (
            <p className="text-sm text-slate-400">Aucun partage pour l&apos;instant.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{shareTargetLabel(s)}</p>
                    <p className="text-xs text-slate-500">
                      {SCOPE_LABELS[s.scope]}
                      {s.canEdit ? " · Modifier" : ""}
                      {s.canComment ? " · Commenter" : ""}
                      {s.canExport ? " · Exporter" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeShare.mutate(s.id)}
                    disabled={removeShare.isPending}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L6.94 8l-1.72 1.72a.75.75 0 1 0 1.06 1.06L8 9.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L9.06 8l1.72-1.72a.75.75 0 0 0-1.06-1.06L8 6.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
