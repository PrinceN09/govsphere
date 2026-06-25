"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserCount {
  meta: { total: number };
}

interface Ministry {
  id: string;
  name: string;
  code: string;
  _count?: { users: number };
}

interface MinistriesResponse {
  data: Ministry[];
  meta: { total: number };
}

interface AuditEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; displayName: string; email: string; matriculeNumber: string | null } | null;
}

interface AuditResponse {
  data: AuditEntry[];
  meta: { total: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  href,
}: {
  label: string;
  value: number | null;
  sub?: string;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`flex flex-col gap-1 rounded border p-5 transition-colors ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-current opacity-60">
        {label}
      </p>
      <p className="text-3xl font-bold tracking-tight">
        {value === null ? (
          <span className="inline-block h-8 w-16 animate-pulse rounded bg-current opacity-10" />
        ) : (
          value.toLocaleString("fr-FR")
        )}
      </p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function BarChart({ items, total }: { items: BarItem[]; total: number }) {
  if (total === 0) {
    return <p className="text-sm text-slate-400">Aucune donnée</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium text-slate-900">
                {item.value.toLocaleString("fr-FR")}{" "}
                <span className="text-slate-400">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ministry bar chart ───────────────────────────────────────────────────────

function MinistryChart({ ministries }: { ministries: Ministry[] }) {
  const withUsers = ministries
    .filter((m) => (m._count?.users ?? 0) > 0)
    .sort((a, b) => (b._count?.users ?? 0) - (a._count?.users ?? 0))
    .slice(0, 10);

  const maxUsers = Math.max(...withUsers.map((m) => m._count?.users ?? 0), 1);

  if (withUsers.length === 0) {
    return <p className="text-sm text-slate-400">Aucune donnée</p>;
  }

  return (
    <div className="space-y-2">
      {withUsers.map((m) => {
        const count = m._count?.users ?? 0;
        const pct = (count / maxUsers) * 100;
        return (
          <div key={m.id} className="flex items-center gap-3">
            <span
              className="w-44 flex-shrink-0 truncate text-right text-xs text-slate-600"
              title={m.name}
            >
              {m.name}
            </span>
            <div className="flex-1">
              <div className="h-5 overflow-hidden rounded-sm bg-slate-100">
                <div
                  className="h-full rounded-sm bg-primary-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="w-10 flex-shrink-0 text-xs font-medium text-slate-700">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkforceDashboardPage() {
  const { data: totalData } = useQuery({
    queryKey: ["wf-total"],
    queryFn: () => apiGet<UserCount>("/v1/users?limit=1"),
  });

  const { data: activeData } = useQuery({
    queryKey: ["wf-active"],
    queryFn: () => apiGet<UserCount>("/v1/users?status=ACTIVE&limit=1"),
  });

  const { data: pendingData } = useQuery({
    queryKey: ["wf-pending"],
    queryFn: () => apiGet<UserCount>("/v1/users?status=PENDING&limit=1"),
  });

  const { data: suspendedData } = useQuery({
    queryKey: ["wf-suspended"],
    queryFn: () => apiGet<UserCount>("/v1/users?status=SUSPENDED&limit=1"),
  });

  const { data: lockedData } = useQuery({
    queryKey: ["wf-locked"],
    queryFn: () => apiGet<UserCount>("/v1/users?status=LOCKED&limit=1"),
  });

  const { data: archivedData } = useQuery({
    queryKey: ["wf-archived"],
    queryFn: () => apiGet<UserCount>("/v1/users?status=ARCHIVED&limit=1"),
  });

  const { data: ministriesData, isLoading: ministriesLoading } = useQuery({
    queryKey: ["wf-ministries"],
    queryFn: () => apiGet<MinistriesResponse>("/v1/ministries?limit=100"),
  });

  const { data: transfersData } = useQuery({
    queryKey: ["wf-transfers"],
    queryFn: () => apiGet<AuditResponse>("/v1/audit-logs?action=EMPLOYEE_TRANSFERRED&limit=10"),
  });

  const { data: positionChangesData } = useQuery({
    queryKey: ["wf-position-changes"],
    queryFn: () => apiGet<AuditResponse>("/v1/audit-logs?action=EMPLOYEE_POSITION_CHANGED&limit=5"),
  });

  const total = totalData?.meta.total ?? null;
  const active = activeData?.meta.total ?? null;
  const pending = pendingData?.meta.total ?? null;
  const suspended = suspendedData?.meta.total ?? null;
  const locked = lockedData?.meta.total ?? null;
  const archived = archivedData?.meta.total ?? null;

  const inactive = suspended !== null && locked !== null ? suspended + locked : null;

  const statusBars: BarItem[] = [
    { label: "Actifs", value: active ?? 0, color: "bg-success-500" },
    { label: "En attente", value: pending ?? 0, color: "bg-primary-400" },
    { label: "Suspendus", value: suspended ?? 0, color: "bg-amber-400" },
    { label: "Verrouillés", value: locked ?? 0, color: "bg-danger-400" },
    { label: "Archivés", value: archived ?? 0, color: "bg-slate-400" },
  ];

  const recentTransfers = transfersData?.data ?? [];
  const recentPositionChanges = positionChangesData?.data ?? [];

  return (
    <div>
      <AdminTopBar
        title="Tableau de bord — Effectif"
        subtitle="Vue d'ensemble des ressources humaines"
        actions={
          <div className="flex gap-2">
            <Link href="/org-chart">
              <Button variant="secondary" size="sm">
                Organigramme
              </Button>
            </Link>
            <Link href="/employees">
              <Button variant="secondary" size="sm">
                Agents
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total agents"
            value={total}
            color="border-slate-200 bg-white text-slate-900"
            href="/employees"
          />
          <StatCard
            label="Actifs"
            value={active}
            {...(total && active
              ? { sub: `${((active / total) * 100).toFixed(1)}% du total` }
              : {})}
            color="border-success-100 bg-success-50 text-success-800"
            href="/employees?status=ACTIVE"
          />
          <StatCard
            label="En attente"
            value={pending}
            color="border-primary-100 bg-primary-50 text-primary-800"
            href="/employees?status=PENDING"
          />
          <StatCard
            label="Suspendus / Verrouillés"
            value={inactive}
            color="border-amber-100 bg-amber-50 text-amber-800"
          />
          <StatCard
            label="Archivés"
            value={archived}
            color="border-slate-200 bg-slate-50 text-slate-600"
            href="/employees?status=ARCHIVED"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Status breakdown */}
          <Card>
            <CardHeader title="Répartition par statut" subtitle="Agents par état de compte" />
            <CardBody>
              <BarChart items={statusBars} total={total ?? 0} />
            </CardBody>
          </Card>

          {/* Ministry breakdown */}
          <Card>
            <CardHeader title="Agents par ministère" subtitle="Top 10 ministères" />
            <CardBody>
              {ministriesLoading ? (
                <PageSpinner />
              ) : (
                <MinistryChart ministries={ministriesData?.data ?? []} />
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent transfers */}
          <Card>
            <CardHeader
              title="Mutations récentes"
              subtitle="Derniers transferts organisationnels"
              actions={
                <Link href="/employees">
                  <Button variant="ghost" size="sm">
                    Voir tout
                  </Button>
                </Link>
              }
            />
            <CardBody className="p-0">
              {recentTransfers.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">Aucune mutation enregistrée</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentTransfers.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        {entry.user ? (
                          <Link
                            href={`/employees/${entry.user.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-primary-700"
                          >
                            {entry.user.displayName}
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-400">Agent supprimé</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {(entry.metadata["reason"] as string | undefined) ?? "Transfert"}
                        </p>
                      </div>
                      <span className="ml-4 flex-shrink-0 text-xs text-slate-400">
                        {fmtShort(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent position changes */}
          <Card>
            <CardHeader title="Changements de poste récents" subtitle="Dernières affectations" />
            <CardBody className="p-0">
              {recentPositionChanges.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">Aucun changement enregistré</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentPositionChanges.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        {entry.user ? (
                          <Link
                            href={`/employees/${entry.user.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-primary-700"
                          >
                            {entry.user.displayName}
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-400">Agent supprimé</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {(entry.metadata["reason"] as string | undefined) ??
                            "Changement de poste"}
                        </p>
                      </div>
                      <span className="ml-4 flex-shrink-0 text-xs text-slate-400">
                        {fmtShort(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/org-chart">
            <div className="group flex items-center gap-4 rounded border border-slate-200 bg-white p-4 transition-colors hover:border-primary-200 hover:bg-primary-50/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 group-hover:bg-primary-200">
                <svg className="h-5 w-5 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Organigramme</p>
                <p className="text-xs text-slate-500">Structure hiérarchique</p>
              </div>
            </div>
          </Link>

          <Link href="/employees">
            <div className="group flex items-center gap-4 rounded border border-slate-200 bg-white p-4 transition-colors hover:border-primary-200 hover:bg-primary-50/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 group-hover:bg-violet-200">
                <svg className="h-5 w-5 text-violet-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Tous les agents</p>
                <p className="text-xs text-slate-500">
                  {total?.toLocaleString("fr-FR") ?? "…"} enregistrés
                </p>
              </div>
            </div>
          </Link>

          <Link href="/employees?status=PENDING">
            <div className="group flex items-center gap-4 rounded border border-slate-200 bg-white p-4 transition-colors hover:border-amber-200 hover:bg-amber-50/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 group-hover:bg-amber-200">
                <svg className="h-5 w-5 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">En attente d'activation</p>
                <p className="text-xs text-slate-500">
                  {pending?.toLocaleString("fr-FR") ?? "…"} compte(s)
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
