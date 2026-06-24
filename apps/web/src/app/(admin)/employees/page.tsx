"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { apiClient, apiGet, type PaginatedResponse } from "@/lib/api";
import { useListQuery } from "@/lib/use-list-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "LOCKED" | "DEACTIVATED" | "ARCHIVED";
type UserRole =
  | "SUPER_ADMIN"
  | "GOVERNMENT_ADMIN"
  | "MINISTRY_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "DIVISION_ADMIN"
  | "TEAM_MANAGER"
  | "EMPLOYEE"
  | "GUEST";

interface Employee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  matriculeNumber: string | null;
  role: UserRole;
  status: UserStatus;
  ministryId: string | null;
  ministry: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  manager: { id: string; displayName: string } | null;
  createdAt: string;
}

interface Ministry {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  LOCKED: "Verrouillé",
  DEACTIVATED: "Désactivé",
  ARCHIVED: "Archivé",
};

const STATUS_VARIANTS: Record<
  UserStatus,
  "green" | "red" | "yellow" | "gray" | "blue" | "purple" | "gold"
> = {
  PENDING: "gray",
  ACTIVE: "green",
  SUSPENDED: "yellow",
  LOCKED: "red",
  DEACTIVATED: "red",
  ARCHIVED: "purple",
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

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, "Requis").max(100),
  lastName: z.string().min(1, "Requis").max(100),
  email: z.string().email("Email invalide"),
  phone: z.string().max(50).optional(),
  matriculeNumber: z
    .string()
    .regex(/^\d{1,4}(\.\d{1,4}){1,2}$/, "Format: 1.641.558")
    .optional()
    .or(z.literal("")),
  ministryId: z.string().optional(),
  departmentId: z.string().optional(),
  divisionId: z.string().optional(),
  managerId: z.string().optional(),
});

const inviteSchema = z.object({
  firstName: z.string().min(1, "Requis").max(100),
  lastName: z.string().min(1, "Requis").max(100),
  email: z.string().email("Email invalide"),
  ministryId: z.string().optional(),
  departmentId: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type InviteForm = z.infer<typeof inviteSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const list = useListQuery<Employee>({ endpoint: "/v1/users", queryKey: "employees" });
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Employee | null>(null);
  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | "suspend" | "archive" | null
  >(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    token: string;
    email: string;
  } | null>(null);

  // ── Ministry / dept options ─────────────────────────────────────────────
  const { data: ministriesData } = useQuery({
    queryKey: ["ministries-select"],
    queryFn: () => apiGet<PaginatedResponse<Ministry>>("/v1/ministries?limit=200"),
  });

  const [selectedMinistryId, setSelectedMinistryId] = useState<string>("");

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-select", selectedMinistryId],
    queryFn: () =>
      apiGet<PaginatedResponse<Department>>(
        `/v1/departments?ministryId=${selectedMinistryId}&limit=200`,
      ),
    enabled: !!selectedMinistryId,
  });

  const ministryOptions = [
    { value: "", label: "— Aucun —" },
    ...(ministriesData?.data ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];

  const deptOptions = [
    { value: "", label: "— Aucun —" },
    ...(departmentsData?.data ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  // ── Create form ────────────────────────────────────────────────────────
  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const [createLoading, setCreateLoading] = useState(false);

  async function onCreateSubmit(values: CreateForm) {
    setCreateLoading(true);
    setServerError(null);
    try {
      await apiClient.post("/v1/users", {
        ...values,
        matriculeNumber: values.matriculeNumber ?? undefined,
        ministryId: values.ministryId ?? undefined,
        departmentId: values.departmentId ?? undefined,
        divisionId: values.divisionId ?? undefined,
        managerId: values.managerId ?? undefined,
        phone: values.phone ?? undefined,
      });
      setCreateOpen(false);
      createForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la création";
      setServerError(msg);
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Invite form ────────────────────────────────────────────────────────
  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });
  const [inviteLoading, setInviteLoading] = useState(false);

  async function onInviteSubmit(values: InviteForm) {
    setInviteLoading(true);
    setServerError(null);
    try {
      const res = await apiClient.post<{ id: string; invitationToken: string }>(
        "/v1/users/invite",
        {
          ...values,
          ministryId: values.ministryId ?? undefined,
          departmentId: values.departmentId ?? undefined,
        },
      );
      setInviteResult({ token: res.data.invitationToken, email: values.email });
      inviteForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de l'invitation";
      setServerError(msg);
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Lifecycle actions ──────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);

  async function handleAction() {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "activate") {
        await apiClient.patch(`/v1/users/${actionTarget.id}/activate`);
      } else if (actionType === "archive") {
        await apiClient.patch(`/v1/users/${actionTarget.id}/archive`);
      } else if (actionType === "deactivate") {
        await apiClient.patch(`/v1/users/${actionTarget.id}/status`, { status: "DEACTIVATED" });
      } else if (actionType === "suspend") {
        await apiClient.patch(`/v1/users/${actionTarget.id}/status`, { status: "SUSPENDED" });
      }
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    } finally {
      setActionLoading(false);
      setActionTarget(null);
      setActionType(null);
    }
  }

  function openAction(employee: Employee, type: typeof actionType) {
    setActionTarget(employee);
    setActionType(type);
  }

  const actionLabels: Record<NonNullable<typeof actionType>, string> = {
    activate: "Activer",
    deactivate: "Désactiver",
    suspend: "Suspendre",
    archive: "Archiver",
  };

  const actionMessages: Record<NonNullable<typeof actionType>, string> = {
    activate: `Activer le compte de ${actionTarget?.displayName ?? "cet agent"} ?`,
    deactivate: `Désactiver le compte de ${actionTarget?.displayName ?? "cet agent"} ? Les sessions actives seront révoquées.`,
    suspend: `Suspendre temporairement le compte de ${actionTarget?.displayName ?? "cet agent"} ?`,
    archive: `Archiver ${actionTarget?.displayName ?? "cet agent"} ? Cette action est irréversible.`,
  };

  return (
    <div>
      <AdminTopBar
        title="Agents"
        subtitle="Personnel gouvernemental"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInviteOpen(true);
                setServerError(null);
              }}
            >
              Inviter
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateOpen(true);
                setServerError(null);
              }}
            >
              + Créer un agent
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <SearchInput
            value={list.search}
            onChange={list.handleSearch}
            placeholder="Rechercher un agent…"
            className="w-72"
          />
          <Badge variant="blue">
            {list.total} agent{list.total !== 1 ? "s" : ""}
          </Badge>
        </div>

        {list.isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Nom</TableHeaderCell>
                    <TableHeaderCell>Matricule</TableHeaderCell>
                    <TableHeaderCell>E-mail</TableHeaderCell>
                    <TableHeaderCell>Rôle</TableHeaderCell>
                    <TableHeaderCell>Ministère</TableHeaderCell>
                    <TableHeaderCell>Statut</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.data.length === 0 ? (
                    <TableEmpty message="Aucun agent trouvé" />
                  ) : (
                    list.data.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link
                            href={`/employees/${e.id}`}
                            className="font-medium text-slate-900 hover:text-primary-600"
                          >
                            {e.displayName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {e.matriculeNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{e.email}</TableCell>
                        <TableCell>
                          <Badge variant="blue">{ROLE_LABELS[e.role]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {e.ministry?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[e.status]}>
                            {STATUS_LABELS[e.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/employees/${e.id}`}>
                              <Button variant="ghost" size="sm">
                                Voir
                              </Button>
                            </Link>
                            {e.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAction(e, "activate")}
                              >
                                Activer
                              </Button>
                            )}
                            {e.status === "ACTIVE" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAction(e, "suspend")}
                                >
                                  Suspendre
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAction(e, "deactivate")}
                                >
                                  Désactiver
                                </Button>
                              </>
                            )}
                            {e.status === "SUSPENDED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAction(e, "activate")}
                              >
                                Réactiver
                              </Button>
                            )}
                            {e.status === "DEACTIVATED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAction(e, "archive")}
                              >
                                Archiver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              limit={25}
              onPageChange={list.setPage}
              labelOf="sur"
              labelPage="Page"
            />
          </>
        )}
      </div>

      {/* ── Create Employee Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
          setServerError(null);
        }}
        title="Créer un agent"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            void createForm.handleSubmit(onCreateSubmit)(e);
          }}
          className="space-y-4"
        >
          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              required
              {...createForm.register("firstName")}
              error={createForm.formState.errors.firstName?.message}
            />
            <Input
              label="Nom de famille"
              required
              {...createForm.register("lastName")}
              error={createForm.formState.errors.lastName?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Adresse e-mail"
              type="email"
              required
              {...createForm.register("email")}
              error={createForm.formState.errors.email?.message}
            />
            <Input
              label="Téléphone"
              {...createForm.register("phone")}
              placeholder="+243 8X0 000 000"
            />
          </div>

          <Input
            label="Matricule"
            {...createForm.register("matriculeNumber")}
            placeholder="ex. 1.641.558"
            hint="Format : 1.641.558 ou 478.432"
            error={createForm.formState.errors.matriculeNumber?.message}
          />

          <Select
            label="Ministère"
            options={ministryOptions}
            {...createForm.register("ministryId", {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                setSelectedMinistryId(e.target.value);
                createForm.setValue("departmentId", "");
              },
            })}
          />

          {selectedMinistryId && (
            <Select
              label="Département"
              options={deptOptions}
              {...createForm.register("departmentId")}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                createForm.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" loading={createLoading}>
              Créer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Invite Employee Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          inviteForm.reset();
          setInviteResult(null);
          setServerError(null);
        }}
        title="Inviter un agent"
      >
        {inviteResult ? (
          <div className="space-y-4">
            <Alert variant="success">
              Invitation envoyée à <strong>{inviteResult.email}</strong>. Copiez le lien
              d&apos;invitation ci-dessous et transmettez-le à l&apos;agent.
            </Alert>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
              {`${process.env["NEXT_PUBLIC_APP_URL"] ?? "https://govsphere.cd"}/auth/accept-invitation?token=${inviteResult.token}`}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setInviteOpen(false);
                  setInviteResult(null);
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void inviteForm.handleSubmit(onInviteSubmit)(e);
            }}
            className="space-y-4"
          >
            {serverError && <Alert variant="danger">{serverError}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                required
                {...inviteForm.register("firstName")}
                error={inviteForm.formState.errors.firstName?.message}
              />
              <Input
                label="Nom de famille"
                required
                {...inviteForm.register("lastName")}
                error={inviteForm.formState.errors.lastName?.message}
              />
            </div>

            <Input
              label="Adresse e-mail"
              type="email"
              required
              {...inviteForm.register("email")}
              error={inviteForm.formState.errors.email?.message}
            />

            <Select
              label="Ministère"
              options={ministryOptions}
              {...inviteForm.register("ministryId")}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setInviteOpen(false);
                  inviteForm.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" loading={inviteLoading}>
                Envoyer l&apos;invitation
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ── Lifecycle action confirm ───────────────────────────────────────── */}
      <ConfirmDialog
        open={actionTarget !== null}
        onClose={() => {
          setActionTarget(null);
          setActionType(null);
        }}
        onConfirm={handleAction}
        title={actionType ? actionLabels[actionType] : ""}
        message={actionType ? actionMessages[actionType] : ""}
        confirmLabel={actionType ? actionLabels[actionType] : "Confirmer"}
        loading={actionLoading}
      />
    </div>
  );
}
