"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableEmpty } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrganizationType =
  | "GOVERNMENT"
  | "ENTERPRISE"
  | "EDUCATION"
  | "HEALTHCARE"
  | "NGO"
  | "CHURCH"
  | "NON_PROFIT"
  | "OTHER";
type OrganizationStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";

interface OrgDetail {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  status: OrganizationStatus;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  isDemo: boolean;
  createdAt: string;
  _count: { ministries: number; departments: number; users: number };
  ministries: Array<{ id: string; name: string; code: string; isActive: boolean }>;
}

interface DashboardData {
  userCount: number;
  deptCount: number;
  ministryCount: number;
  meetingCount: number;
  docCount: number;
  workflowCount: number;
}

const TYPE_LABELS: Record<OrganizationType, string> = {
  GOVERNMENT: "Gouvernement",
  ENTERPRISE: "Entreprise",
  EDUCATION: "Éducation",
  HEALTHCARE: "Santé",
  NGO: "ONG",
  CHURCH: "Église",
  NON_PROFIT: "Non-profit",
  OTHER: "Autre",
};

const STATUS_BADGE: Record<OrganizationStatus, "green" | "gray" | "yellow" | "red"> = {
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "yellow",
  ARCHIVED: "red",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganizationDetailPage() {
  const params = useParams();
  const id = params["id"] as string;
  const [tab, setTab] = useState<"overview" | "departments" | "users">("overview");

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ["organization", id],
    queryFn: () => apiGet<OrgDetail>(`/v1/organizations/${id}`),
    enabled: !!id,
  });

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["org-dashboard", id],
    queryFn: () => apiGet<DashboardData>(`/v1/organizations/${id}/dashboard`),
    enabled: !!id,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div>
        <AdminTopBar title="Organisation" />
        <div className="p-6 text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div>
        <AdminTopBar title="Organisation introuvable" />
        <div className="p-6">
          <p className="text-slate-500">Cette organisation n&apos;existe pas ou a été supprimée.</p>
          <Link
            href="/admin/organizations"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← Retour aux organisations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminTopBar
        title={org.name}
        subtitle={`${TYPE_LABELS[org.type]} · ${org.city ?? ""}${org.country ? `, ${org.country}` : ""}`}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/organizations"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Organisations
            </Link>
            <Badge variant={STATUS_BADGE[org.status]}>{org.status}</Badge>
            {org.isDemo && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                DÉMO
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Agents", value: dashboard?.userCount ?? org._count.users },
            { label: "Départements", value: dashboard?.deptCount ?? org._count.departments },
            { label: "Ministères", value: dashboard?.ministryCount ?? org._count.ministries },
            { label: "Réunions", value: dashboard?.meetingCount ?? 0 },
            { label: "Documents", value: dashboard?.docCount ?? 0 },
            { label: "Workflows", value: dashboard?.workflowCount ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            {(["overview", "departments", "users"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-b-2 border-primary-600 text-primary-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "overview"
                  ? "Vue d'ensemble"
                  : t === "departments"
                    ? "Départements"
                    : "Agents"}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Info card */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Informations
                </p>
              </div>
              <dl className="divide-y divide-slate-100">
                {[
                  { label: "Code", value: org.code },
                  { label: "Type", value: TYPE_LABELS[org.type] },
                  { label: "Email", value: org.email ?? "—" },
                  { label: "Téléphone", value: org.phone ?? "—" },
                  { label: "Site web", value: org.website ?? "—" },
                  {
                    label: "Adresse",
                    value: [org.address, org.city, org.country].filter(Boolean).join(", ") || "—",
                  },
                  { label: "Créé le", value: new Date(org.createdAt).toLocaleDateString("fr-FR") },
                ].map((row) => (
                  <div key={row.label} className="flex px-5 py-2.5 text-sm">
                    <dt className="w-32 flex-shrink-0 font-medium text-slate-500">{row.label}</dt>
                    <dd className="text-slate-700">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Description */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </p>
              </div>
              <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
                {org.description ?? "Aucune description renseignée."}
              </div>
            </div>
          </div>
        )}

        {tab === "departments" && (
          <div className="border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Département
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ministère
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {org.ministries.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <TableEmpty message="Aucun département rattaché à cette organisation." />
                    </td>
                  </tr>
                ) : (
                  org.ministries.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link href={`/admin/ministries/${m.id}`} className="hover:text-primary-600">
                          {m.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.code}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.isActive ? "green" : "gray"}>
                          {m.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "users" && (
          <div className="border border-slate-200 bg-white">
            <div className="px-5 py-4">
              <p className="text-sm text-slate-500">
                {org._count.users} agent(s) appartiennent à cette organisation.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => (window.location.href = `/admin/employees?organizationId=${id}`)}
              >
                Voir les agents →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
