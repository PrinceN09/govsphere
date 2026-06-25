"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import {
  AUDIENCE_LABELS,
  fmtDate,
  type AnnouncementAudience,
  type ExecutiveAnnouncement,
} from "@/lib/executive-types";

const AUDIENCES: AnnouncementAudience[] = [
  "ALL_STAFF",
  "MINISTERS",
  "DIRECTORS",
  "CABINET_MEMBERS",
  "PUBLIC",
];

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    audience: "ALL_STAFF" as AnnouncementAudience,
    expiresAt: "",
  });

  const { data, isLoading } = useQuery<ExecutiveAnnouncement[]>({
    queryKey: ["executive-announcements"],
    queryFn: () => apiGet("/v1/executive/announcements"),
    staleTime: 30_000,
  });

  const createMutation = useMutation<ExecutiveAnnouncement, Error>({
    mutationFn: () => apiPost<ExecutiveAnnouncement>("/v1/executive/announcements", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["executive-announcements"] });
      setShowForm(false);
      setForm({ title: "", content: "", audience: "ALL_STAFF", expiresAt: "" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/v1/executive/announcements/${id}/publish`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["executive-announcements"] }),
  });

  const announcements = data ?? [];
  const published = announcements.filter((a) => a.isPublished);
  const drafts = announcements.filter((a) => !a.isPublished);

  return (
    <>
      <AdminTopBar
        title="Annonces officielles"
        subtitle="Annonces du bureau exécutif"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
          >
            + Nouvelle annonce
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            {showForm && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-sm font-semibold text-white">Créer une annonce</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Titre *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Titre de l'annonce..."
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Audience</label>
                      <select
                        value={form.audience}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            audience: e.target.value as AnnouncementAudience,
                          }))
                        }
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      >
                        {AUDIENCES.map((a) => (
                          <option key={a} value={a}>
                            {AUDIENCE_LABELS[a]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Expiration</label>
                      <input
                        type="datetime-local"
                        value={form.expiresAt}
                        onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-navy-400 mb-1">Contenu *</label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                        rows={4}
                        className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => createMutation.mutate()}
                      disabled={!form.title || !form.content || createMutation.isPending}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                    >
                      {createMutation.isPending ? "Création..." : "Créer"}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="rounded border border-navy-700 px-4 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {announcements.length === 0 && !showForm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-navy-300 font-medium mb-1">Aucune annonce</p>
                <p className="text-sm text-navy-500 mb-4">Créez la première annonce officielle.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Créer une annonce
                </button>
              </div>
            ) : (
              <>
                {/* Drafts */}
                {drafts.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3">
                      Brouillons
                    </h2>
                    <div className="space-y-3">
                      {drafts.map((a) => (
                        <AnnouncementCard
                          key={a.id}
                          announcement={a}
                          onPublish={() => publishMutation.mutate(a.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Published */}
                {published.length > 0 && (
                  <div>
                    {drafts.length > 0 && (
                      <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3">
                        Publiées
                      </h2>
                    )}
                    <div className="space-y-3">
                      {published.map((a) => (
                        <AnnouncementCard
                          key={a.id}
                          announcement={a}
                          onPublish={() => publishMutation.mutate(a.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AnnouncementCard({
  announcement: a,
  onPublish,
}: {
  announcement: ExecutiveAnnouncement;
  onPublish: () => void;
}) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800/60 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] rounded bg-navy-700 px-1.5 py-0.5 text-navy-300">
              {AUDIENCE_LABELS[a.audience]}
            </span>
          </div>
          <p className="text-sm font-semibold text-white">{a.title}</p>
          <p className="mt-1 text-xs text-navy-400 line-clamp-2">{a.content}</p>
          <div className="flex flex-wrap items-center gap-x-4 mt-1.5 text-[10px] text-navy-500">
            <span>{a.author.displayName ?? a.author.email}</span>
            {a.publishedAt && <span>Publié: {fmtDate(a.publishedAt)}</span>}
            {a.expiresAt && <span>Expire: {fmtDate(a.expiresAt)}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium",
              a.isPublished ? "bg-emerald-900/40 text-emerald-300" : "bg-navy-700 text-navy-400",
            )}
          >
            {a.isPublished ? "Publié" : "Brouillon"}
          </span>
          {!a.isPublished && (
            <button
              onClick={onPublish}
              className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
            >
              Publier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
