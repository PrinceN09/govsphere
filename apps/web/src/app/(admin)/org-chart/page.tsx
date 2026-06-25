"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ministry {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  _count?: { departments: number; users: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
  ministryId: string;
  isActive: boolean;
  _count?: { divisions: number; users: number };
}

interface Division {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  isActive: boolean;
  _count?: { users: number };
}

interface UserStub {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  employeeAssignments: { position: { title: string } }[];
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number };
}

// ─── Level colors ─────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  ministry: { indent: 0, dot: "bg-primary-600", badge: "blue" as const, label: "Ministère" },
  department: { indent: 6, dot: "bg-violet-500", badge: "purple" as const, label: "Département" },
  division: { indent: 12, dot: "bg-teal-500", badge: "green" as const, label: "Division" },
  employee: { indent: 18, dot: "bg-slate-400", badge: "gray" as const, label: "Agent" },
} as const;

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1 pl-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Employee node ────────────────────────────────────────────────────────────

function EmployeeNode({ user }: { user: UserStub }) {
  const cfg = LEVEL_CONFIG.employee;
  const position = user.employeeAssignments[0]?.position.title;

  return (
    <div
      className={`flex items-center gap-3 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50`}
      style={{ paddingLeft: `${cfg.indent * 4 + 12}px` }}
    >
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
      <Link href={`/employees/${user.id}`} className="min-w-0 flex-1 hover:text-primary-700">
        <span className="font-medium">{user.displayName}</span>
        {position && <span className="ml-1.5 text-slate-400 text-xs">{position}</span>}
      </Link>
      <Badge variant={user.status === "ACTIVE" ? "green" : "gray"} className="flex-shrink-0">
        {user.status === "ACTIVE" ? "Actif" : user.status}
      </Badge>
    </div>
  );
}

// ─── Division node ────────────────────────────────────────────────────────────

function DivisionNode({ division, search }: { division: Division; search: string }) {
  const [open, setOpen] = useState(false);
  const cfg = LEVEL_CONFIG.division;

  const { data: users, isLoading } = useQuery({
    queryKey: ["org-users-division", division.id],
    queryFn: () => apiGet<ListResponse<UserStub>>(`/v1/users?divisionId=${division.id}&limit=50`),
    enabled: open,
    select: (r) => r.data,
  });

  const matchesSearch =
    !search ||
    division.name.toLowerCase().includes(search.toLowerCase()) ||
    division.code.toLowerCase().includes(search.toLowerCase());

  if (!matchesSearch && !open) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none"
        style={{ paddingLeft: `${cfg.indent * 4 + 12}px` }}
      >
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
        <ChevronIcon open={open} />
        <span className="min-w-0 flex-1 font-medium text-slate-800">{division.name}</span>
        <span className="text-xs text-slate-400">{division.code}</span>
        {division._count && <Badge variant={cfg.badge}>{division._count.users ?? 0} agents</Badge>}
      </button>
      {open && (
        <div>
          {isLoading ? (
            <LoadingDots />
          ) : users && users.length > 0 ? (
            users.map((u) => <EmployeeNode key={u.id} user={u} />)
          ) : (
            <p
              className="px-3 py-1.5 text-xs text-slate-400"
              style={{ paddingLeft: `${LEVEL_CONFIG.employee.indent * 4 + 12}px` }}
            >
              Aucun agent
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Department node ──────────────────────────────────────────────────────────

function DepartmentNode({ department, search }: { department: Department; search: string }) {
  const [open, setOpen] = useState(false);
  const cfg = LEVEL_CONFIG.department;

  const { data: divisions, isLoading } = useQuery({
    queryKey: ["org-divisions", department.id],
    queryFn: () =>
      apiGet<ListResponse<Division>>(`/v1/divisions?departmentId=${department.id}&limit=100`),
    enabled: open,
    select: (r) => r.data,
  });

  const matchesSearch =
    !search ||
    department.name.toLowerCase().includes(search.toLowerCase()) ||
    department.code.toLowerCase().includes(search.toLowerCase());

  if (!matchesSearch && !search) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none"
        style={{ paddingLeft: `${cfg.indent * 4 + 12}px` }}
      >
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
        <ChevronIcon open={open} />
        <span className="min-w-0 flex-1 font-medium text-slate-800">{department.name}</span>
        <span className="text-xs text-slate-400">{department.code}</span>
        {department._count && (
          <Badge variant={cfg.badge}>
            {department._count.divisions ?? 0} div · {department._count.users ?? 0} agents
          </Badge>
        )}
      </button>
      {open && (
        <div>
          {isLoading ? (
            <LoadingDots />
          ) : divisions && divisions.length > 0 ? (
            divisions.map((div) => <DivisionNode key={div.id} division={div} search={search} />)
          ) : (
            <p
              className="px-3 py-1.5 text-xs text-slate-400"
              style={{ paddingLeft: `${LEVEL_CONFIG.division.indent * 4 + 12}px` }}
            >
              Aucune division
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ministry node ────────────────────────────────────────────────────────────

function MinistryNode({ ministry, search }: { ministry: Ministry; search: string }) {
  const [open, setOpen] = useState(false);
  const cfg = LEVEL_CONFIG.ministry;

  const { data: departments, isLoading } = useQuery({
    queryKey: ["org-departments", ministry.id],
    queryFn: () =>
      apiGet<ListResponse<Department>>(`/v1/departments?ministryId=${ministry.id}&limit=100`),
    enabled: open,
    select: (r) => r.data,
  });

  const matchesSearch =
    !search ||
    ministry.name.toLowerCase().includes(search.toLowerCase()) ||
    ministry.code.toLowerCase().includes(search.toLowerCase());

  if (!matchesSearch && !search) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 text-left text-sm hover:border-primary-200 hover:bg-primary-50/30 focus:outline-none"
        style={{ paddingLeft: `${cfg.indent * 4 + 12}px` }}
      >
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
        <ChevronIcon open={open} />
        <span className="min-w-0 flex-1 font-semibold text-slate-900">{ministry.name}</span>
        <span className="text-xs text-slate-400">{ministry.code}</span>
        {ministry._count && (
          <Badge variant={cfg.badge}>
            {ministry._count.departments ?? 0} dép · {ministry._count.users ?? 0} agents
          </Badge>
        )}
        {!ministry.isActive && <Badge variant="gray">Inactif</Badge>}
      </button>
      {open && (
        <div className="ml-4 mt-0.5 border-l border-slate-100 pl-2">
          {isLoading ? (
            <LoadingDots />
          ) : departments && departments.length > 0 ? (
            departments.map((dept) => (
              <DepartmentNode key={dept.id} department={dept} search={search} />
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-400">Aucun département</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const [search, setSearch] = useState("");

  const { data: ministries, isLoading } = useQuery({
    queryKey: ["org-ministries"],
    queryFn: () => apiGet<ListResponse<Ministry>>("/v1/ministries?limit=100"),
    select: (r) => r.data,
  });

  return (
    <div>
      <AdminTopBar
        title="Organigramme"
        subtitle="Structure hiérarchique du gouvernement"
        actions={
          <div className="flex gap-2">
            <Link href="/employees">
              <Button variant="ghost" size="sm">
                Liste des agents
              </Button>
            </Link>
          </div>
        }
      />

      {/* Controls */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-72">
            <Input
              placeholder="Rechercher un ministère, département…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              Effacer
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-600" />
              Ministère
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Département
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Division
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Agent
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <PageSpinner />
        ) : !ministries || ministries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg
              className="mb-3 h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
            <p className="text-sm">Aucun ministère trouvé</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-1">
            {/* Government root node */}
            <div className="mb-4 flex items-center gap-3 rounded border border-primary-200 bg-primary-50 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 shadow-sm">
                <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 1a6 6 0 110 12A6 6 0 0110 1zm0 1a5 5 0 100 10A5 5 0 0010 2zM10 14c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-900">
                  République Démocratique du Congo
                </p>
                <p className="text-xs text-primary-600">{ministries.length} ministère(s)</p>
              </div>
            </div>

            <div className="ml-4 border-l-2 border-primary-100 pl-2 space-y-1">
              {ministries.map((m) => (
                <MinistryNode key={m.id} ministry={m} search={search} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
