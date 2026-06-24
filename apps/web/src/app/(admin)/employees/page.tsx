"use client";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TableEmpty } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { PageSpinner } from "@/components/ui/Spinner";
import { useListQuery } from "@/lib/use-list-query";

type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_ACTIVATION";
type UserRole = "SUPER_ADMIN" | "GOVERNMENT_ADMIN" | "MINISTRY_ADMIN" | "DEPARTMENT_ADMIN" | "DIVISION_ADMIN" | "TEAM_MANAGER" | "EMPLOYEE" | "GUEST";

interface Employee {
  id: string;
  displayName: string;
  email: string;
  matriculeNumber: string | null;
  role: UserRole;
  status: UserStatus;
  ministry: { name: string } | null;
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
  PENDING_ACTIVATION: "En attente",
};

const STATUS_COLORS: Record<UserStatus, "green" | "red" | "yellow" | "gray"> = {
  ACTIVE: "green",
  INACTIVE: "red",
  SUSPENDED: "yellow",
  PENDING_ACTIVATION: "gray",
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  GOVERNMENT_ADMIN: "Admin Gouv.",
  MINISTRY_ADMIN: "Admin Ministère",
  DEPARTMENT_ADMIN: "Admin Dept.",
  DIVISION_ADMIN: "Admin Division",
  TEAM_MANAGER: "Chef d'équipe",
  EMPLOYEE: "Agent",
  GUEST: "Invité",
};

export default function EmployeesPage() {
  const list = useListQuery<Employee>({ endpoint: "/v1/users", queryKey: "employees" });

  return (
    <div>
      <AdminTopBar title="Agents" subtitle="Personnel gouvernemental" />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput value={list.search} onChange={list.handleSearch}
            placeholder="Rechercher un agent…" className="w-72" />
          <Badge variant="blue">{list.total} agent{list.total !== 1 ? "s" : ""}</Badge>
        </div>

        {list.isLoading ? <PageSpinner /> : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Nom</TableHeaderCell>
                  <TableHeaderCell>Matricule</TableHeaderCell>
                  <TableHeaderCell>E-mail</TableHeaderCell>
                  <TableHeaderCell>Rôle</TableHeaderCell>
                  <TableHeaderCell>Ministère</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.length === 0 ? <TableEmpty message="Aucun agent trouvé" /> : (
                  list.data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-gray-900">{e.displayName}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {e.matriculeNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{e.email}</TableCell>
                      <TableCell>
                        <Badge variant="blue">{ROLE_LABELS[e.role]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {e.ministry?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[e.status]}>{STATUS_LABELS[e.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination page={list.page} totalPages={list.totalPages} total={list.total}
              limit={20} onPageChange={list.setPage} labelOf="sur" labelPage="Page" />
          </>
        )}
      </div>
    </div>
  );
}
