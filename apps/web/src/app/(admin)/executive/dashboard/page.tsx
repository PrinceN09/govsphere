"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";
import {
  DECISION_STATUS_COLOR,
  DECISION_STATUS_LABELS,
  fmtDate,
  fmtDateTime,
  SESSION_STATUS_LABELS,
  type CabinetSession,
  type DecisionStatus,
  type ExecutiveAnnouncement,
  type ExecutiveBriefing,
} from "@/lib/executive-types";

interface DashboardData {
  summary: {
    activeOffices: number;
    pendingDecisions: number;
    upcomingSessionsCount: number;
  };
  decisionsByStatus: { status: DecisionStatus; count: number }[];
  upcomingSessions: CabinetSession[];
  recentBriefings: ExecutiveBriefing[];
  recentAnnouncements: ExecutiveAnnouncement[];
}

function StatCard({
  label,
  value,
  href,
  color = "text-white",
}: {
  label: string;
  value: number | string;
  href?: string;
  color?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-navy-700 bg-navy-800 px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function ExecutiveDashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["executive-dashboard"],
    queryFn: () => apiGet("/v1/executive/dashboard"),
    staleTime: 60_000,
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return null;

  const { summary, decisionsByStatus, upcomingSessions, recentBriefings, recentAnnouncements } =
    data;

  return (
    <>
      <AdminTopBar
        title="Tableau de bord exécutif"
        subtitle="Bureau Exécutif & Cabinet des Ministres · RDC"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/executive/cabinet"
              className="rounded border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-300 hover:border-navy-600 hover:text-white transition-colors"
            >
              Conseil des ministres
            </Link>
            <Link
              href="/admin/executive/briefings/new"
              className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 transition-colors"
            >
              + Nouveau briefing
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Bureaux actifs"
            value={summary.activeOffices}
            href="/admin/executive/offices"
          />
          <StatCard
            label="Décisions en attente"
            value={summary.pendingDecisions}
            href="/admin/executive/cabinet/decisions"
            color={summary.pendingDecisions > 0 ? "text-amber-300" : "text-white"}
          />
          <StatCard
            label="Sessions prévues"
            value={summary.upcomingSessionsCount}
            href="/admin/executive/cabinet"
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left column */}
          <div className="col-span-2 space-y-5">
            {/* Upcoming sessions */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Prochaines sessions</h2>
                  <Link
                    href="/admin/executive/cabinet"
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Voir tout →
                  </Link>
                </div>
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-navy-500 italic">Aucune session planifiée</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingSessions.map((s) => (
                      <Link
                        key={s.id}
                        href={`/admin/executive/cabinet/${s.id}`}
                        className="flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-3 py-2.5 hover:border-navy-600 transition-colors"
                      >
                        <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-primary-900 border border-primary-800 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-300">
                            #{s.sessionNumber}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{s.title}</p>
                          <p className="text-xs text-navy-400">
                            {fmtDateTime(s.scheduledAt)} · {SESSION_STATUS_LABELS[s.status]}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Decisions by status */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Décisions par statut</h2>
                  <Link
                    href="/admin/executive/cabinet/decisions"
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Voir tout →
                  </Link>
                </div>
                {decisionsByStatus.length === 0 ? (
                  <p className="text-sm text-navy-500 italic">Aucune décision enregistrée</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {decisionsByStatus.map((d) => (
                      <div
                        key={d.status}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${DECISION_STATUS_COLOR[d.status]}`}
                      >
                        {DECISION_STATUS_LABELS[d.status]}
                        <span className="ml-2 text-base font-bold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Recent briefings */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Briefings récents</h2>
                  <Link
                    href="/admin/executive/briefings"
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Voir tout →
                  </Link>
                </div>
                {recentBriefings.length === 0 ? (
                  <p className="text-sm text-navy-500 italic">Aucun briefing récent</p>
                ) : (
                  <div className="space-y-2">
                    {recentBriefings.map((b) => (
                      <Link
                        key={b.id}
                        href={`/admin/executive/briefings/${b.id}`}
                        className="flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-3 py-2.5 hover:border-navy-600 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{b.title}</p>
                          <p className="text-xs text-navy-400">
                            {b.author.displayName ?? b.author.email}
                            {b.scheduledFor ? ` · ${fmtDate(b.scheduledFor)}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] rounded px-1.5 py-0.5 bg-navy-700 text-navy-300">
                          {b.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right column — announcements */}
          <div>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Annonces</h2>
                  <Link
                    href="/admin/executive/announcements"
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Voir tout →
                  </Link>
                </div>
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-navy-500 italic">Aucune annonce</p>
                ) : (
                  <div className="space-y-3">
                    {recentAnnouncements.map((a) => (
                      <Link
                        key={a.id}
                        href={`/admin/executive/announcements`}
                        className="block rounded-lg border border-navy-700 bg-navy-800/50 px-3 py-2.5 hover:border-navy-600 transition-colors"
                      >
                        <p className="text-sm font-medium text-white line-clamp-2">{a.title}</p>
                        {a.publishedAt && (
                          <p className="mt-1 text-[10px] text-navy-500">{fmtDate(a.publishedAt)}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
