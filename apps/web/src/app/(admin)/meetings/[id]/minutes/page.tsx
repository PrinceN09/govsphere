"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { fmtDate, type Meeting } from "@/lib/calendar-types";

export default function MeetingMinutesPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [initialised, setInitialised] = useState(false);

  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ["meeting", id],
    queryFn: () => apiGet(`/v1/meetings/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (meeting && !initialised) {
      setContent(meeting.minutes?.content ?? "");
      setInitialised(true);
    }
  }, [meeting, initialised]);

  const createMutation = useMutation({
    mutationFn: () => apiPost(`/v1/meetings/${id}/minutes`, { content }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiPatch(`/v1/meetings/${id}/minutes`, { content }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiPost(`/v1/meetings/${id}/minutes/publish`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  if (isLoading) return <PageSpinner />;
  if (!meeting) return <div className="p-6 text-navy-400">Réunion introuvable</div>;

  const hasMinutes = !!meeting.minutes;
  const isPublished = meeting.minutes ? !meeting.minutes.isDraft : false;

  function handleSave() {
    if (hasMinutes) updateMutation.mutate();
    else createMutation.mutate();
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <AdminTopBar
        title="Compte-rendu"
        subtitle={meeting.title}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isPublished}
              className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
            {hasMinutes && !isPublished && (
              <button
                onClick={() => {
                  if (confirm("Publier le compte-rendu ? Cette action est définitive.")) {
                    publishMutation.mutate();
                  }
                }}
                disabled={publishMutation.isPending}
                className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/30 transition-colors"
              >
                Publier
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Meeting info header */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-white font-medium">{fmtDate(meeting.event.startAt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">
                  Organisateur
                </p>
                <p className="text-white font-medium">
                  {meeting.organizer.displayName ?? meeting.organizer.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">
                  Participants
                </p>
                <p className="text-white font-medium">{meeting._count?.participants ?? 0}</p>
              </div>
              {meeting.minutes && (
                <div className="ml-auto">
                  <span
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium",
                      isPublished
                        ? "bg-emerald-900 text-emerald-200"
                        : "bg-amber-900 text-amber-200",
                    )}
                  >
                    {isPublished ? "Publié" : "Brouillon"}
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Agenda reference */}
        {meeting.agendaItems && meeting.agendaItems.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
                Points abordés
              </h3>
              <ol className="space-y-1">
                {meeting.agendaItems.map((item, i) => (
                  <li key={item.id} className="flex gap-2 text-sm text-navy-300">
                    <span className="text-navy-500 shrink-0">{i + 1}.</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        )}

        {/* Minutes editor */}
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-white mb-3">Rédaction du compte-rendu</h3>
            {isPublished ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-navy-200">{content || "Aucun contenu"}</p>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                placeholder="Rédigez le compte-rendu de la réunion...

Points discutés:
-

Décisions prises:
-

Prochaines étapes:
- "
                className="w-full rounded border border-navy-700 bg-navy-900 px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:border-primary-500 focus:outline-none resize-y font-mono leading-relaxed"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
