"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { StatCard } from "@/components/ui/StatCard";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api";

// ─── Icon components ──────────────────────────────────────────────────────────

function MapPinIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h10.5a.75.75 0 010 1.5H12v13.75a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5H2V3.5h-.25A.75.75 0 011 2.75zM4 5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h1a.5.5 0 000-1h-1zM4 10.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm4-5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM8.5 8a.5.5 0 000 1h1a.5.5 0 000-1h-1zm-.5 2.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" clipRule="evenodd" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.75-9A2.25 2.25 0 008.75 4.25v2.5A2.25 2.25 0 0011 9h2.5A2.25 2.25 0 0015.75 6.75v-2.5A2.25 2.25 0 0013.5 2h-2.5zm0 9A2.25 2.25 0 008.75 13.25v2.5A2.25 2.25 0 0011 18h2.5A2.25 2.25 0 0015.75 15.75v-2.5A2.25 2.25 0 0013.5 11h-2.5z" clipRule="evenodd" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.168v2.352a1.5 1.5 0 01-.83 1.342l-4.17 2.085a1.5 1.5 0 01-1.336-.021l-.21-.105a.5.5 0 00-.454 0l-.21.105a1.5 1.5 0 01-1.336.02L5.83 10.86A1.5 1.5 0 015 9.52V7.168c0-1.418.947-2.586 2.294-2.775A41.22 41.22 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Stats fetcher ────────────────────────────────────────────────────────────

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

  return (
    <div>
      <AdminTopBar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de la structure gouvernementale"
      />

      <div className="p-6">
        {/* Welcome banner */}
        <div className="mb-6 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 text-white">
          <p className="text-lg font-semibold">Bienvenue, {firstName} 👋</p>
          <p className="mt-0.5 text-sm text-primary-200">
            Vous êtes connecté en tant que{" "}
            <span className="font-medium text-white">
              {session?.user.role?.replace(/_/g, " ")}
            </span>
          </p>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <PageSpinner />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Provinces"
              value={stats?.provinces ?? 0}
              icon={<MapPinIcon />}
              accentColor="bg-blue-600"
            />
            <StatCard
              label="Ministères"
              value={stats?.ministries ?? 0}
              icon={<BuildingIcon />}
              accentColor="bg-primary-600"
            />
            <StatCard
              label="Départements"
              value={stats?.departments ?? 0}
              icon={<GridIcon />}
              accentColor="bg-indigo-600"
            />
            <StatCard
              label="Divisions"
              value={stats?.divisions ?? 0}
              icon={<GridIcon />}
              accentColor="bg-violet-600"
            />
            <StatCard
              label="Postes"
              value={stats?.positions ?? 0}
              icon={<BriefcaseIcon />}
              accentColor="bg-amber-600"
            />
            <StatCard
              label="Agents actifs"
              value={stats?.employees ?? 0}
              icon={<UsersIcon />}
              accentColor="bg-emerald-600"
            />
          </div>
        )}

        {/* DRC Government context */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            République Démocratique du Congo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            GovSphere est la plateforme centralisée de gestion de la structure gouvernementale de la
            RDC. Gérez les 26 provinces, les 36 ministères, leurs départements, divisions, postes et
            le personnel gouvernemental en un seul endroit sécurisé.
          </p>
        </div>
      </div>
    </div>
  );
}
