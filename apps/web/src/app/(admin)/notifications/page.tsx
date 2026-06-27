"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

type FilterKey = "ALL" | "UNREAD" | "MENTIONS" | "SYSTEM" | "TASK";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UnreadCounts {
  notifications: number;
  mentions: number;
  total: number;
}

const TYPE_BADGE: Record<string, "blue" | "yellow" | "red" | "green" | "gray"> = {
  MENTION: "yellow",
  MESSAGE: "blue",
  REACTION: "green",
  CHANNEL_INVITE: "blue",
  TASK_ASSIGNED: "red",
  SYSTEM: "gray",
};
const TYPE_LABEL: Record<string, string> = {
  MENTION: "Mention",
  MESSAGE: "Message",
  REACTION: "Réaction",
  CHANNEL_INVITE: "Invitation",
  TASK_ASSIGNED: "Tâche",
  SYSTEM: "Système",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Resolve entity URL from notification data field */
function getEntityLink(n: Notification): string | null {
  const d = n.data;
  if (!d) return null;
  if (typeof d["meetingId"] === "string") return `/admin/meetings/${d["meetingId"]}`;
  if (typeof d["documentId"] === "string") return `/admin/documents/${d["documentId"]}`;
  if (typeof d["taskId"] === "string") return `/admin/tasks/${d["taskId"]}`;
  if (typeof d["workflowId"] === "string") return `/admin/workflows/${d["workflowId"]}`;
  if (typeof d["channelId"] === "string") return `/admin/channels/${d["channelId"]}`;
  if (typeof d["userId"] === "string") return `/admin/employees/${d["userId"]}`;
  return null;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const qc = useQueryClient();

  const { data: counts } = useQuery({
    queryKey: ["unread-counts"],
    queryFn: () => apiGet<UnreadCounts>("/v1/notifications/unread-counts"),
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => apiGet<NotificationsResponse>(`/v1/notifications?filter=${filter}&limit=50`),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/v1/notifications/${id}/read`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiPost("/v1/notifications/read-all", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });

  const notifications = data?.data ?? [];

  // exactOptionalPropertyTypes: omit `count` when undefined, don't pass undefined
  type FilterDef = { key: FilterKey; label: string; count?: number };
  const FILTERS: FilterDef[] = [
    { key: "ALL", label: "Toutes" },
    {
      key: "UNREAD",
      label: "Non lues",
      ...(counts?.notifications !== undefined ? { count: counts.notifications } : {}),
    },
    {
      key: "MENTIONS",
      label: "Mentions",
      ...(counts?.mentions !== undefined ? { count: counts.mentions } : {}),
    },
    { key: "TASK", label: "Tâches" },
    { key: "SYSTEM", label: "Système" },
  ];

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Notifications"
        actions={
          (counts?.total ?? 0) > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-200 bg-white px-6">
          <div className="flex gap-0">
            {FILTERS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  filter === key
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {label}
                {(count ?? 0) > 0 && (
                  <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-2xl p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <PageSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-7 w-7 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                {filter === "ALL"
                  ? "Aucune notification pour l'instant"
                  : `Aucune notification dans cette catégorie`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {filter === "UNREAD"
                  ? "Vous avez lu toutes vos notifications."
                  : "Les nouvelles notifications apparaîtront ici."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={[
                    "flex items-start gap-4 rounded-xl border p-4 transition-colors",
                    n.isRead ? "border-slate-100 bg-white" : "border-primary-100 bg-primary-50",
                  ].join(" ")}
                >
                  <div className="mt-1 flex-shrink-0">
                    {!n.isRead && (
                      <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">{n.title}</span>
                          <Badge variant={TYPE_BADGE[n.type] ?? "gray"} className="text-[10px]">
                            {TYPE_LABEL[n.type] ?? n.type}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                        {getEntityLink(n) && (
                          <Link
                            href={getEntityLink(n)!}
                            className="mt-1 text-xs font-medium text-primary-600 hover:underline"
                          >
                            Voir le détail →
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400">{fmtDate(n.createdAt)}</span>
                        {!n.isRead && (
                          <button
                            onClick={() => markRead.mutate(n.id)}
                            className="text-[10px] text-primary-600 hover:text-primary-700 underline"
                          >
                            Marquer lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
