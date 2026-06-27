"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkloadStatus = "NOT_ASSIGNED" | "AVAILABLE" | "NORMAL" | "BUSY" | "OVERLOADED";

interface EmployeeProfile {
  id: string;
  workloadStatus: WorkloadStatus;
  vacationStatus: string | null;
  officeLocation: string | null;
  orgNode: { id: string; name: string; type: string } | null;
}

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  matriculeNumber: string | null;
  employeeNumber: string | null;
  employeeProfile: EmployeeProfile | null;
}

interface PeopleResponse {
  items: Person[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORKLOAD_LABELS: Record<WorkloadStatus, string> = {
  NOT_ASSIGNED: "Non assigné",
  AVAILABLE: "Disponible",
  NORMAL: "Normal",
  BUSY: "Occupé",
  OVERLOADED: "Surchargé",
};

const WORKLOAD_BADGE: Record<WorkloadStatus, "green" | "yellow" | "red" | "gray"> = {
  NOT_ASSIGNED: "gray",
  AVAILABLE: "green",
  NORMAL: "green",
  BUSY: "yellow",
  OVERLOADED: "red",
};

function getInitials(person: Person) {
  const fn = person.firstName ?? "";
  const ln = person.lastName ?? "";
  const initials = `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase();
  return initials || (person.email[0] ?? "?").toUpperCase();
}

function getDisplayName(person: Person) {
  return (
    person.displayName ??
    ([person.firstName, person.lastName].filter(Boolean).join(" ") || person.email)
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WORKLOAD_OPTIONS: Array<{ value: WorkloadStatus | ""; label: string }> = [
  { value: "", label: "Toute disponibilité" },
  { value: "NOT_ASSIGNED", label: "Non assigné" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "NORMAL", label: "Normal" },
  { value: "BUSY", label: "Occupé" },
  { value: "OVERLOADED", label: "Surchargé" },
];

export default function PeoplePage() {
  const [search, setSearch] = useState("");
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadStatus | "">("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const params: Record<string, unknown> = { page, limit };
  if (search) params["q"] = search;
  if (workloadFilter) params["workloadStatus"] = workloadFilter;

  const { data, isLoading } = useQuery<PeopleResponse>({
    queryKey: ["people-list", page, search, workloadFilter],
    queryFn: () => apiGet<PeopleResponse>("/v1/people", params),
    placeholderData: (prev) => prev,
  });

  const people = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleWorkload(value: WorkloadStatus | "") {
    setWorkloadFilter(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminTopBar
        title="Annuaire"
        subtitle={`${total} collaborateur${total !== 1 ? "s" : ""}`}
        actions={
          <Link href="/admin/people/org-chart">
            <Button variant="secondary" size="sm">
              Voir la hiérarchie
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border bg-surface flex gap-3 items-center flex-wrap">
        <input
          type="text"
          placeholder="Rechercher un collaborateur…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-[220px] max-w-xs h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={workloadFilter}
          onChange={(e) => handleWorkload(e.target.value as WorkloadStatus | "")}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {WORKLOAD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface border-b border-border">
            <tr className="text-left text-muted">
              <th className="px-6 py-3 font-medium">Collaborateur</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Unité</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Disponibilité</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Matricule</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-3" colSpan={6}>
                    <div className="h-4 bg-border rounded animate-pulse w-1/2" />
                  </td>
                </tr>
              ))
            ) : people.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted text-sm">
                  Aucun collaborateur trouvé.
                </td>
              </tr>
            ) : (
              people.map((person) => (
                <tr key={person.id} className="hover:bg-surface-hover transition-colors">
                  {/* Avatar + name */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {person.avatarUrl ? (
                        <Image
                          src={person.avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          unoptimized
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                          {getInitials(person)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/people/${person.id}`}
                          className="font-medium text-foreground hover:text-primary truncate block"
                        >
                          {getDisplayName(person)}
                        </Link>
                        <span className="text-xs text-muted truncate block">{person.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Org node */}
                  <td className="px-4 py-3 hidden md:table-cell text-muted text-sm">
                    {person.employeeProfile?.orgNode?.name ?? "—"}
                  </td>

                  {/* Workload */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {person.employeeProfile ? (
                      <Badge variant={WORKLOAD_BADGE[person.employeeProfile.workloadStatus]}>
                        {WORKLOAD_LABELS[person.employeeProfile.workloadStatus]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>

                  {/* Matricule */}
                  <td className="px-4 py-3 hidden lg:table-cell text-muted font-mono text-xs">
                    {person.matriculeNumber ?? person.employeeNumber ?? "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={person.status === "ACTIVE" ? "green" : "gray"}>
                      {person.status === "ACTIVE" ? "Actif" : person.status}
                    </Badge>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/people/${person.id}`}>
                      <Button variant="ghost" size="sm">
                        Profil →
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
