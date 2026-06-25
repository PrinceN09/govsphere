"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { ParticipantList, RsvpActions } from "@/components/calendar/ParticipantList";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  CLASSIFICATION_COLOR,
  CLASSIFICATION_LABELS,
  fmtDate,
  fmtDuration,
  fmtTime,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  RSVP_STATUS_COLOR,
  RSVP_STATUS_LABELS,
  type Meeting,
  type RsvpStatus,
} from "@/lib/calendar-types";
import { hasPermission, PERMS } from "@/lib/permissions";

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

type Tab = "details" | "agenda" | "minutes" | "actions" | "attachments";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Détails" },
  { id: "agenda", label: "Ordre du jour" },
  { id: "minutes", label: "Compte-rendu" },
  { id: "actions", label: "Actions" },
  { id: "attachments", label: "Pièces jointes" },
];

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("details");

  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ["meeting", id],
    queryFn: () => apiGet(`/v1/meetings/${id}`),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiPost(`/v1/meetings/${id}/cancel`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiPost(`/v1/meetings/${id}/complete`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) => apiPatch(`/v1/meetings/${id}/rsvp`, { rsvpStatus: status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  if (isLoading) return <PageSpinner />;
  if (!meeting) return <div className="p-6 text-navy-400">Réunion introuvable</div>;

  const userId = (session?.user as { id?: string })?.id ?? "";
  const permissions = (session?.user as { permissions?: string[] })?.permissions ?? [];
  const isOrganizer = meeting.organizerId === userId;
  const myParticipation = meeting.participants.find((p) => p.userId === userId);
  const canManage = isOrganizer || hasPermission(permissions, PERMS.MEETING_MANAGE);

  return (
    <>
      <AdminTopBar
        title={meeting.title}
        subtitle={`${MEETING_TYPE_LABELS[meeting.meetingType]} · ${fmtDate(meeting.event.startAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {myParticipation && meeting.status === "SCHEDULED" && (
              <RsvpActions
                current={myParticipation.rsvpStatus}
                onAccept={() => rsvpMutation.mutate("ACCEPTED")}
                onDecline={() => rsvpMutation.mutate("DECLINED")}
                onTentative={() => rsvpMutation.mutate("TENTATIVE")}
                loading={rsvpMutation.isPending}
              />
            )}
            {canManage && meeting.status === "SCHEDULED" && (
              <button
                onClick={() => completeMutation.mutate()}
                className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/30 transition-colors"
              >
                Terminer
              </button>
            )}
            {canManage && (meeting.status === "SCHEDULED" || meeting.status === "DRAFT") && (
              <button
                onClick={() => {
                  if (confirm("Annuler cette réunion ?")) cancelMutation.mutate();
                }}
                className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
              >
                Annuler
              </button>
            )}
            <Link
              href={`/admin/meetings/${id}/attendance`}
              className="rounded border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-300 hover:border-navy-600 hover:text-white transition-colors"
            >
              Présences
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Header info */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              MEETING_STATUS_COLOR[meeting.status],
            )}
          >
            {MEETING_STATUS_LABELS[meeting.status]}
          </span>
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              CLASSIFICATION_COLOR[meeting.classification],
            )}
          >
            {CLASSIFICATION_LABELS[meeting.classification]}
          </span>
          {myParticipation && (
            <span
              className={cn(
                "rounded px-2 py-1 text-xs font-medium",
                RSVP_STATUS_COLOR[myParticipation.rsvpStatus],
              )}
            >
              Mon RSVP: {RSVP_STATUS_LABELS[myParticipation.rsvpStatus]}
            </span>
          )}
        </div>

        {/* Key metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Date", value: fmtDate(meeting.event.startAt) },
            {
              label: "Horaire",
              value: `${fmtTime(meeting.event.startAt)} – ${fmtTime(meeting.event.endAt)} (${fmtDuration(meeting.event.startAt, meeting.event.endAt)})`,
            },
            { label: "Lieu", value: meeting.location ?? "—" },
            {
              label: "Organisateur",
              value: meeting.organizer.displayName ?? meeting.organizer.email,
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-navy-800 border border-navy-700 px-4 py-3">
              <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-medium text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        {meeting.onlineMeetingUrl && (
          <a
            href={meeting.onlineMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-700 bg-primary-900/20 px-4 py-2 text-sm font-medium text-primary-300 hover:border-primary-500 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
            </svg>
            Rejoindre la visioconférence
          </a>
        )}

        {/* Tabs */}
        <div className="border-b border-navy-800">
          <div className="flex gap-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-navy-400 hover:text-navy-200",
                )}
              >
                {t.label}
                {t.id === "agenda" && meeting.agendaItems && (
                  <span className="ml-1.5 rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px]">
                    {meeting.agendaItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "details" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {meeting.description && (
                <Card>
                  <CardBody>
                    <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-navy-200 whitespace-pre-wrap">
                      {meeting.description}
                    </p>
                  </CardBody>
                </Card>
              )}
              {meeting.room && (
                <Card>
                  <CardBody>
                    <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
                      Salle
                    </h3>
                    <p className="text-sm font-medium text-white">{meeting.room.name}</p>
                    {meeting.room.location && (
                      <p className="text-xs text-navy-400">{meeting.room.location}</p>
                    )}
                    {meeting.room.capacity && (
                      <p className="text-xs text-navy-500">
                        Capacité: {meeting.room.capacity} personnes
                      </p>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>
            <div>
              <Card>
                <CardBody>
                  <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3">
                    Participants ({meeting._count?.participants ?? meeting.participants.length})
                  </h3>
                  <ParticipantList participants={meeting.participants} isOrganizer={isOrganizer} />
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {tab === "agenda" && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Ordre du jour</h3>
                {isOrganizer && (
                  <Link
                    href={`/admin/meetings/${id}/agenda`}
                    className="rounded border border-navy-700 px-3 py-1 text-xs font-medium text-navy-300 hover:border-navy-600 hover:text-white transition-colors"
                  >
                    Gérer l'ordre du jour
                  </Link>
                )}
              </div>
              {!meeting.agendaItems?.length ? (
                <p className="text-sm text-navy-500 italic">Aucun point à l'ordre du jour</p>
              ) : (
                <div className="space-y-3">
                  {meeting.agendaItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-lg bg-navy-800 border border-navy-700 p-3"
                    >
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary-900 border border-primary-700 flex items-center justify-center text-xs font-bold text-primary-300">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              item.completed ? "line-through text-navy-500" : "text-white",
                            )}
                          >
                            {item.title}
                          </p>
                          {item.durationMinutes && (
                            <span className="text-xs text-navy-500 shrink-0">
                              {item.durationMinutes} min
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-navy-400 mt-0.5">{item.description}</p>
                        )}
                        {item.presenter && (
                          <p className="text-xs text-navy-500 mt-0.5">
                            Présentateur: {item.presenter.displayName ?? item.presenter.email}
                          </p>
                        )}
                        {item.expectedDecision && (
                          <p className="text-xs text-amber-400 mt-0.5">→ {item.expectedDecision}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "minutes" && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Compte-rendu</h3>
                <Link
                  href={`/admin/meetings/${id}/minutes`}
                  className="rounded bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  {meeting.minutes ? "Voir / modifier" : "Rédiger"}
                </Link>
              </div>
              {meeting.minutes ? (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs text-navy-400">
                    <span>
                      Par {meeting.minutes.author.displayName ?? meeting.minutes.author.email}
                    </span>
                    {meeting.minutes.isDraft && (
                      <span className="rounded bg-amber-900 text-amber-200 px-1.5 py-0.5 text-[10px]">
                        Brouillon
                      </span>
                    )}
                    {!meeting.minutes.isDraft && (
                      <span className="rounded bg-emerald-900 text-emerald-200 px-1.5 py-0.5 text-[10px]">
                        Publié
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-navy-300 line-clamp-5 whitespace-pre-wrap">
                    {meeting.minutes.content ?? "Compte-rendu sans contenu"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-navy-500 italic">Aucun compte-rendu rédigé</p>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "actions" && (
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-white mb-4">Points d'action</h3>
              {!meeting.actionItems?.length ? (
                <p className="text-sm text-navy-500 italic">Aucun point d'action</p>
              ) : (
                <div className="space-y-2">
                  {meeting.actionItems.map((ai) => (
                    <Link
                      key={ai.id}
                      href={`/admin/tasks/${ai.task.id}`}
                      className="flex items-start gap-3 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 hover:border-navy-600 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{ai.task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-navy-400">
                          <span>{ai.task.status}</span>
                          {ai.task.dueAt && <span>· Échéance: {fmtDate(ai.task.dueAt)}</span>}
                          {ai.task.assignee && (
                            <span>· {ai.task.assignee.displayName ?? ai.task.assignee.email}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "attachments" && (
          <Card>
            <CardBody>
              <p className="text-sm text-navy-500 italic">Aucune pièce jointe</p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
