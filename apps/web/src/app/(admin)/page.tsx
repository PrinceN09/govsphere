"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { apiGet } from "@/lib/api";

import type { PaginatedResponse } from "@/lib/api";

// ─── Icons ────────────────────────────────────────────────────────────────────

function MapPinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M1 2.75A.75.75 0 011.75 2h10.5a.75.75 0 010 1.5H12v13.75a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5H2V3.5h-.25A.75.75 0 011 2.75zM4 5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h1a.5.5 0 000-1h-1zM4 10.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm4-5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM8.5 8a.5.5 0 000 1h1a.5.5 0 000-1h-1zm-.5 2.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.75-9A2.25 2.25 0 008.75 4.25v2.5A2.25 2.25 0 0011 9h2.5A2.25 2.25 0 0015.75 6.75v-2.5A2.25 2.25 0 0013.5 2h-2.5zm0 9A2.25 2.25 0 008.75 13.25v2.5A2.25 2.25 0 0011 18h2.5A2.25 2.25 0 0015.75 15.75v-2.5A2.25 2.25 0 0013.5 11h-2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.168v2.352a1.5 1.5 0 01-.83 1.342l-4.17 2.085a1.5 1.5 0 01-1.336-.021l-.21-.105a.5.5 0 00-.454 0l-.21.105a1.5 1.5 0 01-1.336.02L5.83 10.86A1.5 1.5 0 015 9.52V7.168c0-1.418.947-2.586 2.294-2.775A41.22 41.22 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  provinces: number;
  ministries: number;
  departments: number;
  divisions: number;
  positions: number;
  employees: number;
}

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [provinces, ministries, departments, divisions, positions, employees] =
        await Promise.all([
          apiGet<PaginatedResponse<unknown>>("/v1/provinces?limit=1"),
          apiGet<PaginatedResponse<unknown>>("/v1/ministries?limit=1"),
          apiGet<PaginatedResponse<unknown>>("/v1/departments?limit=1"),
          apiGet<PaginatedResponse<unknown>>("/v1/divisions?limit=1"),
          apiGet<PaginatedResponse<unknown>>("/v1/positions?limit=1"),
          apiGet<PaginatedResponse<unknown>>("/v1/users?limit=1&isActive=true"),
        ]);

      return {
        provinces: provinces.total,
        ministries: ministries.total,
        departments: departments.total,
        divisions: divisions.total,
        positions: positions.total,
        employees: employees.total,
      };
    },
    staleTime: 60_000,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useDashboardStats();

  const firstName = session?.user.displayName?.split(" ")[0] ?? "";
  const roleLabel = session?.user.role?.replace(/_/g, " ") ?? "";

  return (
    <div>
      <AdminTopBar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de la structure gouvernementale"
      />

      <div className="p-6 space-y-6">
        {/* Welcome banner — clean, no gradient */}
        <div className="border border-slate-200 bg-white">
          {/* Authority bar at top — the gold accent used purposefully */}
          <div className="h-0.5 bg-gold-500" />
          <div className="flex items-start justify-between px-6 py-5">
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                Bonjour, {firstName}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Connecté en tant que{" "}
                <span className="font-medium text-slate-700 uppercase text-xs tracking-wider">
                  {roleLabel}
                </span>
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold uppercase tracking-label text-slate-400">
                République Démocratique du Congo
              </p>
              <p className="text-xs text-slate-400">Plateforme gouvernementale sécurisée</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Provinces"
              value={stats?.provinces ?? 0}
              icon={<MapPinIcon />}
              accentColor="bg-primary-600"
            />
            <StatCard
              label="Ministères"
              value={stats?.ministries ?? 0}
              icon={<BuildingIcon />}
              accentColor="bg-navy-600"
            />
            <StatCard
              label="Départements"
              value={stats?.departments ?? 0}
              icon={<GridIcon />}
              accentColor="bg-primary-700"
            />
            <StatCard
              label="Divisions"
              value={stats?.divisions ?? 0}
              icon={<GridIcon />}
              accentColor="bg-navy-500"
            />
            <StatCard
              label="Postes"
              value={stats?.positions ?? 0}
              icon={<BriefcaseIcon />}
              accentColor="bg-gold-600"
            />
            <StatCard
              label="Agents actifs"
              value={stats?.employees ?? 0}
              icon={<UsersIcon />}
              accentColor="bg-success-600"
            />
          </div>
        )}

        {/* Quick actions */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-label text-slate-500">
              Actions rapides
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Créer une organisation", href: "/admin/organizations", icon: "🏢" },
              { label: "Inviter un agent", href: "/admin/employees/invite", icon: "👤" },
              { label: "Créer un document", href: "/admin/documents/new", icon: "📄" },
              { label: "Planifier une réunion", href: "/admin/meetings/new", icon: "📅" },
              { label: "Démarrer un workflow", href: "/admin/workflows/new", icon: "⚡" },
              { label: "Données de démo", href: "/admin/demo-data", icon: "🧪" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 bg-white px-4 py-5 text-center hover:bg-slate-50 transition-colors"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium text-slate-600 leading-tight">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty state CTA — shown when org count is 0 */}
        {stats?.ministries === 0 && (
          <div className="border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-3xl mb-3">🏢</p>
            <p className="text-base font-semibold text-slate-800">
              Démarrez avec Prinodia Workspace
            </p>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Aucune structure organisationnelle n&apos;est encore configurée. Créez votre première
              organisation ou générez des données de démonstration pour explorer la plateforme.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/admin/organizations">
                <Button>Créer une organisation</Button>
              </Link>
              <Link href="/admin/demo-data">
                <Button variant="secondary">🧪 Générer des données démo</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Context card */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-label text-slate-500">
              À propos de Prinodia Workspace
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Prinodia Workspace est une plateforme multi-organisations pour gouvernements,
              entreprises, universités, hôpitaux, ONG et églises. Gérez votre structure, votre
              personnel, vos documents, workflows, réunions et communications depuis un espace de
              travail sécurisé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
