"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import { apiClient, apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "LOCKED" | "DEACTIVATED" | "ARCHIVED";

interface RoleAssignment {
  id: string;
  isActive: boolean;
  grantedAt: string;
  expiresAt: string | null;
  role: { id: string; name: string; displayName: string; weight: number };
  ministry: { id: string; name: string; code: string } | null;
  department: { id: string; name: string; code: string } | null;
  division: { id: string; name: string; code: string } | null;
}

interface PermissionGroup {
  resource: string;
  permissions: { key: string; displayName: string; action: string }[];
}

interface AvailableRole {
  id: string;
  name: string;
  displayName: string;
  weight: number;
}

interface Ministry {
  id: string;
  name: string;
  code: string;
}

interface Position {
  id: string;
  title: string;
  code: string;
}

interface WorkforceTransfer {
  id: string;
  fromMinistryId: string | null;
  toMinistryId: string | null;
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  fromDivisionId: string | null;
  toDivisionId: string | null;
  fromOfficeId: string | null;
  toOfficeId: string | null;
  fromManagerId: string | null;
  toManagerId: string | null;
  fromPositionId: string | null;
  toPositionId: string | null;
  reason: string | null;
  effectiveDate: string;
  createdAt: string;
}

interface LoginEntry {
  id: string;
  success: boolean;
  failReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  platform: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

interface PositionAssignment {
  id: string;
  isActive: boolean;
  isPrimary: boolean;
  startDate: string;
  position: { id: string; title: string; code: string; level: string | null };
}

interface EmployeeProfile {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  matriculeNumber: string | null;
  avatarUrl: string | null;
  role: string;
  status: UserStatus;
  mfaEnabled: boolean;
  preferredLanguage: string;
  createdAt: string;
  lastLoginAt: string | null;
  ministryId: string | null;
  departmentId: string | null;
  divisionId: string | null;
  officeId: string | null;
  managerId: string | null;
  ministry: { id: string; name: string; code: string } | null;
  department: { id: string; name: string; code: string } | null;
  division: { id: string; name: string; code: string } | null;
  office: { id: string; name: string; code: string } | null;
  manager: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  roleAssignments: RoleAssignment[];
  loginHistory: LoginEntry[];
  sessions: Session[];
  employeeAssignments: PositionAssignment[];
  permissions: string[];
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

const STATUS_VARIANTS: Record<UserStatus, "green" | "red" | "yellow" | "gray" | "blue" | "purple"> =
  {
    PENDING: "gray",
    ACTIVE: "green",
    SUSPENDED: "yellow",
    LOCKED: "red",
    DEACTIVATED: "red",
    ARCHIVED: "purple",
  };

const RESOURCE_LABELS: Record<string, string> = {
  USER: "Utilisateurs",
  ADMIN: "Administration",
  CONTENT: "Contenu",
  MINISTRY: "Ministères",
  DEPARTMENT: "Départements",
  AUDIT: "Audit",
  SESSION: "Sessions",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 text-sm border-b border-slate-100 last:border-0">
      <span className="text-slate-500 flex-shrink-0 w-40">{label}</span>
      <span className="text-slate-900 text-right">
        {value ?? <span className="text-slate-400">—</span>}
      </span>
    </div>
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-white shadow-sm">
      <span className="text-xl font-semibold text-primary-700">{initials}</span>
    </div>
  );
}

function SmallAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-semibold text-primary-700">{initials}</span>
    </div>
  );
}

// ─── Assign Role Dialog ───────────────────────────────────────────────────────

interface AssignRoleDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

function AssignRoleDialog({ open, onClose, userId, onSuccess }: AssignRoleDialogProps) {
  const [roleId, setRoleId] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiGet<AvailableRole[]>("/v1/roles"),
    enabled: open,
  });

  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries-list"],
    queryFn: () => apiGet<{ data: Ministry[] }>("/v1/ministries").then((r) => r.data),
    enabled: open,
  });

  function handleClose() {
    setRoleId("");
    setMinistryId("");
    setDepartmentId("");
    setDivisionId("");
    setExpiresAt("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) {
      setError("Veuillez sélectionner un rôle");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { roleId };
      if (ministryId) body["ministryId"] = ministryId;
      if (departmentId) body["departmentId"] = departmentId;
      if (divisionId) body["divisionId"] = divisionId;
      if (expiresAt) body["expiresAt"] = new Date(expiresAt).toISOString();
      await apiClient.post(`/v1/users/${userId}/roles`, body);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'attribution du rôle";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Attribuer un rôle" size="md">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <Select
          label="Rôle *"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          options={roles.map((r) => ({
            value: r.id,
            label: `${r.displayName} (poids ${r.weight})`,
          }))}
          placeholder="Sélectionner un rôle"
          required
        />
        <Select
          label="Portée — Ministère (optionnel)"
          value={ministryId}
          onChange={(e) => setMinistryId(e.target.value)}
          options={[
            { value: "", label: "Système entier" },
            ...ministries.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Input
          label="Date d'expiration (optionnel)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Attribuer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Transfer Dialog ──────────────────────────────────────────────────────────

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeProfile;
  onSuccess: () => void;
}

function TransferDialog({ open, onClose, employee, onSuccess }: TransferDialogProps) {
  const [ministryId, setMinistryId] = useState(employee.ministryId ?? "");
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? "");
  const [divisionId, setDivisionId] = useState(employee.divisionId ?? "");
  const [officeId, setOfficeId] = useState(employee.officeId ?? "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries-list"],
    queryFn: () => apiGet<{ data: Ministry[] }>("/v1/ministries").then((r) => r.data),
    enabled: open,
  });

  function handleClose() {
    setMinistryId(employee.ministryId ?? "");
    setDepartmentId(employee.departmentId ?? "");
    setDivisionId(employee.divisionId ?? "");
    setOfficeId(employee.officeId ?? "");
    setReason("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string | null> = {};
      if (ministryId !== (employee.ministryId ?? "")) body["ministryId"] = ministryId || null;
      if (departmentId !== (employee.departmentId ?? ""))
        body["departmentId"] = departmentId || null;
      if (divisionId !== (employee.divisionId ?? "")) body["divisionId"] = divisionId || null;
      if (officeId !== (employee.officeId ?? "")) body["officeId"] = officeId || null;
      if (reason) body["reason"] = reason;

      if (Object.keys(body).length === 0 || (Object.keys(body).length === 1 && "reason" in body)) {
        setError("Veuillez modifier au moins un champ organisationnel");
        setLoading(false);
        return;
      }

      await apiClient.patch(`/v1/users/${employee.id}/transfer`, body);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du transfert";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Transférer l'agent" size="md">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <Select
          label="Ministère"
          value={ministryId}
          onChange={(e) => setMinistryId(e.target.value)}
          options={[
            { value: "", label: "— Aucun —" },
            ...ministries.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Input
          label="Raison du transfert"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Réorganisation, mutation, promotion…"
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Transférer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Change Position Dialog ───────────────────────────────────────────────────

interface ChangePositionDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

function ChangePositionDialog({ open, onClose, userId, onSuccess }: ChangePositionDialogProps) {
  const [positionId, setPositionId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: positions = [] } = useQuery({
    queryKey: ["positions-list"],
    queryFn: () => apiGet<{ data: Position[] }>("/v1/positions").then((r) => r.data),
    enabled: open,
  });

  function handleClose() {
    setPositionId("");
    setReason("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId) {
      setError("Veuillez sélectionner un poste");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.patch(`/v1/users/${userId}/position`, {
        positionId,
        ...(reason ? { reason } : {}),
      });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du changement de poste";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Changer de poste" size="md">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <Select
          label="Nouveau poste *"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          options={positions.map((p) => ({ value: p.id, label: `${p.title} (${p.code})` }))}
          placeholder="Sélectionner un poste"
          required
        />
        <Input
          label="Raison (optionnel)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Promotion, réorganisation…"
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Changer de poste
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => apiGet<EmployeeProfile>(`/v1/users/${id}`),
  });

  const { data: permissionGroups = [] } = useQuery({
    queryKey: ["employee-permissions", id],
    queryFn: () => apiGet<PermissionGroup[]>(`/v1/users/${id}/permissions`),
    enabled: !!employee,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["employee-transfers", id],
    queryFn: () => apiGet<WorkforceTransfer[]>(`/v1/users/${id}/transfers`),
    enabled: !!employee,
  });

  // ── Dialog open states ─────────────────────────────────────────────────────
  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | "suspend" | "archive" | "unlock" | null
  >(null);
  const [revokeAssignmentId, setRevokeAssignmentId] = useState<string | null>(null);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [changePositionOpen, setChangePositionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  async function handleAction() {
    if (!actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "activate") {
        await apiClient.patch(`/v1/users/${id}/activate`);
      } else if (actionType === "unlock") {
        await apiClient.patch(`/v1/users/${id}/unlock`);
      } else if (actionType === "archive") {
        await apiClient.patch(`/v1/users/${id}/archive`);
      } else if (actionType === "deactivate") {
        await apiClient.patch(`/v1/users/${id}/status`, { status: "DEACTIVATED" });
      } else if (actionType === "suspend") {
        await apiClient.patch(`/v1/users/${id}/status`, { status: "SUSPENDED" });
      }
      await queryClient.invalidateQueries({ queryKey: ["employee", id] });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  }

  async function handleRevokeRole() {
    if (!revokeAssignmentId) return;
    setRevokeLoading(true);
    try {
      await apiClient.delete(`/v1/users/${id}/roles/${revokeAssignmentId}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employee", id] }),
        queryClient.invalidateQueries({ queryKey: ["employee-permissions", id] }),
      ]);
    } finally {
      setRevokeLoading(false);
      setRevokeAssignmentId(null);
    }
  }

  async function revokeSession(sessionId: string) {
    await apiClient.delete(`/v1/sessions/${sessionId}`);
    await queryClient.invalidateQueries({ queryKey: ["employee", id] });
  }

  function invalidateEmployee() {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["employee", id] }),
      queryClient.invalidateQueries({ queryKey: ["employee-permissions", id] }),
      queryClient.invalidateQueries({ queryKey: ["employee-transfers", id] }),
    ]);
  }

  if (isLoading || !employee) {
    return (
      <div>
        <AdminTopBar title="Profil agent" />
        <PageSpinner />
      </div>
    );
  }

  const status = employee.status;
  const activeRoles = employee.roleAssignments.filter((r) => r.isActive);

  const actionLabels: Record<NonNullable<typeof actionType>, string> = {
    activate: "Activer",
    deactivate: "Désactiver",
    suspend: "Suspendre",
    archive: "Archiver",
    unlock: "Déverrouiller",
  };

  const actionMessages: Record<NonNullable<typeof actionType>, string> = {
    activate: `Activer le compte de ${employee.displayName} ?`,
    deactivate: `Désactiver le compte de ${employee.displayName} ? Les sessions actives seront révoquées.`,
    suspend: `Suspendre temporairement le compte de ${employee.displayName} ?`,
    archive: `Archiver ${employee.displayName} ? Cette action est irréversible.`,
    unlock: `Déverrouiller le compte de ${employee.displayName} ?`,
  };

  return (
    <div>
      <AdminTopBar
        title={employee.displayName}
        subtitle={employee.matriculeNumber ?? employee.email}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link href={`/employees/${id}/timeline`}>
              <Button size="sm" variant="ghost">
                Chronologie
              </Button>
            </Link>
            {status !== "ARCHIVED" && (
              <Button size="sm" variant="secondary" onClick={() => setTransferOpen(true)}>
                Transférer
              </Button>
            )}
            {status === "PENDING" && (
              <Button size="sm" onClick={() => setActionType("activate")}>
                Activer
              </Button>
            )}
            {status === "LOCKED" && (
              <Button size="sm" variant="secondary" onClick={() => setActionType("unlock")}>
                Déverrouiller
              </Button>
            )}
            {status === "ACTIVE" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setActionType("suspend")}>
                  Suspendre
                </Button>
                <Button size="sm" variant="danger" onClick={() => setActionType("deactivate")}>
                  Désactiver
                </Button>
              </>
            )}
            {status === "SUSPENDED" && (
              <Button size="sm" onClick={() => setActionType("activate")}>
                Réactiver
              </Button>
            )}
            {status === "DEACTIVATED" && (
              <Button size="sm" variant="danger" onClick={() => setActionType("archive")}>
                Archiver
              </Button>
            )}
          </div>
        }
      />

      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
        <Link href="/employees" className="hover:text-slate-700">
          Agents
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{employee.displayName}</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Hero card */}
        <Card>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-shrink-0">
              {employee.avatarUrl ? (
                <img
                  src={employee.avatarUrl}
                  alt={employee.displayName}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <AvatarPlaceholder name={employee.displayName} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{employee.displayName}</h1>
                <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
                {employee.mfaEnabled && <Badge variant="green">MFA activé</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{employee.email}</p>
              {employee.matriculeNumber && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Matricule {employee.matriculeNumber}
                </p>
              )}
              {employee.employeeAssignments[0] && (
                <p className="mt-1 text-sm text-slate-600">
                  {employee.employeeAssignments[0].position.title}
                  {employee.employeeAssignments[0].position.code && (
                    <span className="ml-1 text-slate-400">
                      ({employee.employeeAssignments[0].position.code})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="text-sm text-slate-500 space-y-1 text-right flex-shrink-0">
              <p>
                Dernière connexion:{" "}
                <span className="text-slate-700">{fmtDateShort(employee.lastLoginAt)}</span>
              </p>
              <p>
                Compte créé:{" "}
                <span className="text-slate-700">{fmtDateShort(employee.createdAt)}</span>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Tabs */}
        <Tabs defaultTab="info">
          <TabList>
            <Tab value="info">Informations</Tab>
            <Tab value="org">Organisation</Tab>
            <Tab value="roles">Rôles & Permissions</Tab>
            <Tab value="workforce">Effectif</Tab>
            <Tab value="login">Connexions</Tab>
            <Tab value="sessions">Sessions</Tab>
          </TabList>

          {/* ── Informations ──────────────────────────────────────────────── */}
          <TabPanel value="info">
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Informations personnelles" />
                <CardBody>
                  <InfoRow label="Prénom" value={employee.firstName} />
                  <InfoRow label="Nom de famille" value={employee.lastName} />
                  <InfoRow label="Adresse e-mail" value={employee.email} />
                  <InfoRow label="Téléphone" value={employee.phone} />
                  <InfoRow label="Matricule" value={employee.matriculeNumber} />
                  <InfoRow
                    label="Langue"
                    value={employee.preferredLanguage === "fr" ? "Français" : "Anglais"}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Sécurité & accès" />
                <CardBody>
                  <InfoRow
                    label="Statut du compte"
                    value={<Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>}
                  />
                  <InfoRow
                    label="Authentification MFA"
                    value={
                      <Badge variant={employee.mfaEnabled ? "green" : "gray"}>
                        {employee.mfaEnabled ? "Activée" : "Non activée"}
                      </Badge>
                    }
                  />
                  <InfoRow label="Rôle système" value={employee.role.replace(/_/g, " ")} />
                  <InfoRow
                    label="Sessions actives"
                    value={
                      <Badge variant={employee.sessions.length > 0 ? "blue" : "gray"}>
                        {employee.sessions.length}
                      </Badge>
                    }
                  />
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* ── Organisation ──────────────────────────────────────────────── */}
          <TabPanel value="org">
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Placement organisationnel" />
                <CardBody>
                  <InfoRow label="Ministère" value={employee.ministry?.name} />
                  <InfoRow label="Département" value={employee.department?.name} />
                  <InfoRow label="Division" value={employee.division?.name} />
                  <InfoRow label="Bureau" value={employee.office?.name} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Responsable hiérarchique" />
                <CardBody>
                  {employee.manager ? (
                    <div className="flex items-center gap-3 py-2">
                      {employee.manager.avatarUrl ? (
                        <img
                          src={employee.manager.avatarUrl}
                          alt={employee.manager.displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <SmallAvatar name={employee.manager.displayName} />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {employee.manager.displayName}
                        </p>
                        <p className="text-xs text-slate-500">{employee.manager.email}</p>
                        <p className="text-xs text-slate-400">
                          {employee.manager.role.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-2">Aucun responsable hiérarchique</p>
                  )}
                </CardBody>
              </Card>

              {employee.employeeAssignments.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader title="Postes occupés" />
                  <CardBody className="p-0">
                    <div className="divide-y divide-slate-100">
                      {employee.employeeAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{a.position.title}</p>
                            <p className="text-xs text-slate-500">
                              Code: {a.position.code}
                              {a.position.level && ` · Niveau ${a.position.level}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.isPrimary && <Badge variant="blue">Principal</Badge>}
                            <Badge variant={a.isActive ? "green" : "gray"}>
                              {a.isActive ? "Actif" : "Clôturé"}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              Depuis {fmtDateShort(a.startDate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </TabPanel>

          {/* ── Rôles & Permissions ───────────────────────────────────────── */}
          <TabPanel value="roles">
            <div className="mt-4 space-y-4">
              {/* Active role assignments */}
              <Card>
                <CardHeader
                  title="Rôles attribués"
                  subtitle={`${activeRoles.length} rôle(s) actif(s)`}
                  actions={
                    <Button size="sm" onClick={() => setAssignRoleOpen(true)}>
                      + Attribuer un rôle
                    </Button>
                  }
                />
                <CardBody className="p-0">
                  {activeRoles.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">Aucun rôle attribué</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {activeRoles.map((ra) => (
                        <div key={ra.id} className="flex items-center justify-between px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {ra.role.displayName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Poids {ra.role.weight}
                              {ra.ministry && ` · ${ra.ministry.name}`}
                              {ra.department && ` → ${ra.department.name}`}
                              {ra.division && ` → ${ra.division.name}`}
                            </p>
                            <p className="text-xs text-slate-400">
                              Attribué le {fmtDateShort(ra.grantedAt)}
                              {ra.expiresAt && ` · Expire le ${fmtDateShort(ra.expiresAt)}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger-600 hover:bg-danger-50 flex-shrink-0"
                            onClick={() => setRevokeAssignmentId(ra.id)}
                          >
                            Révoquer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Permission matrix grouped by resource */}
              <Card>
                <CardHeader
                  title="Matrice des permissions effectives"
                  subtitle={`${employee.permissions.length} permission(s) résolues depuis les rôles actifs`}
                />
                <CardBody>
                  {permissionGroups.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucune permission</p>
                  ) : (
                    <div className="space-y-4">
                      {permissionGroups.map((group) => (
                        <div key={group.resource}>
                          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                            {RESOURCE_LABELS[group.resource] ?? group.resource}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {group.permissions.map((p) => (
                              <span
                                key={p.key}
                                title={p.key}
                                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {p.displayName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* ── Workforce management ──────────────────────────────────────── */}
          <TabPanel value="workforce">
            <div className="mt-4 space-y-4">
              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                {status !== "ARCHIVED" && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
                      Transférer (org)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setChangePositionOpen(true)}
                    >
                      Changer de poste
                    </Button>
                  </>
                )}
                <Link href={`/employees/${id}/timeline`}>
                  <Button variant="ghost" size="sm">
                    Voir la chronologie complète →
                  </Button>
                </Link>
              </div>

              {/* Transfer history */}
              <Card>
                <CardHeader
                  title="Historique des mutations"
                  subtitle={`${transfers.length} transfert(s) enregistré(s)`}
                />
                <CardBody className="p-0">
                  {transfers.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">Aucune mutation enregistrée</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transfers.map((t) => (
                        <div key={t.id} className="px-5 py-3">
                          <div className="flex items-start justify-between">
                            <div className="text-sm space-y-0.5">
                              {(t.fromMinistryId ?? t.toMinistryId) && (
                                <p className="text-slate-700">
                                  <span className="text-slate-400">Ministère :</span>{" "}
                                  <span className="line-through text-slate-400 mr-1">
                                    {t.fromMinistryId ?? "—"}
                                  </span>
                                  → {t.toMinistryId ?? "—"}
                                </p>
                              )}
                              {(t.fromPositionId ?? t.toPositionId) && (
                                <p className="text-slate-700">
                                  <span className="text-slate-400">Poste :</span>{" "}
                                  <span className="line-through text-slate-400 mr-1">
                                    {t.fromPositionId ?? "—"}
                                  </span>
                                  → {t.toPositionId ?? "—"}
                                </p>
                              )}
                              {t.reason && (
                                <p className="text-xs text-slate-500 italic">« {t.reason} »</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                              {fmtDateShort(t.effectiveDate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* ── Login history ─────────────────────────────────────────────── */}
          <TabPanel value="login">
            <div className="mt-4">
              <Card>
                <CardHeader title="Historique des connexions" subtitle="10 dernières tentatives" />
                <CardBody className="p-0">
                  {employee.loginHistory.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">Aucune connexion enregistrée</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {employee.loginHistory.map((entry) => (
                        <div key={entry.id} className="flex items-start justify-between px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                                entry.success ? "bg-success-500" : "bg-danger-500"
                              }`}
                            />
                            <div>
                              <p className="text-sm text-slate-900">
                                {entry.success ? "Connexion réussie" : "Échec de connexion"}
                                {entry.failReason && (
                                  <span className="ml-1 text-slate-400">— {entry.failReason}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {entry.ipAddress ?? "IP inconnue"}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                            {fmtDate(entry.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* ── Active sessions ───────────────────────────────────────────── */}
          <TabPanel value="sessions">
            <div className="mt-4">
              <Card>
                <CardHeader
                  title="Sessions actives"
                  subtitle={`${employee.sessions.length} session(s) en cours`}
                />
                <CardBody className="p-0">
                  {employee.sessions.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">Aucune session active</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {employee.sessions.map((s) => (
                        <div key={s.id} className="flex items-start justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {s.platform ?? "Plateforme inconnue"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {s.ipAddress ?? "IP inconnue"} · Dernière activité:{" "}
                              {fmtDateShort(s.lastUsedAt)}
                            </p>
                            <p className="text-xs text-slate-400">
                              Expire le {fmtDateShort(s.expiresAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              void revokeSession(s.id);
                            }}
                          >
                            Révoquer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {/* ── Lifecycle confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={actionType !== null}
        onClose={() => setActionType(null)}
        onConfirm={handleAction}
        title={actionType ? actionLabels[actionType] : ""}
        message={actionType ? actionMessages[actionType] : ""}
        confirmLabel={actionType ? actionLabels[actionType] : "Confirmer"}
        loading={actionLoading}
      />

      {/* ── Revoke role confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={revokeAssignmentId !== null}
        onClose={() => setRevokeAssignmentId(null)}
        onConfirm={handleRevokeRole}
        title="Révoquer le rôle"
        message="Révoquer ce rôle ? L'agent perdra immédiatement les permissions associées."
        confirmLabel="Révoquer"
        loading={revokeLoading}
      />

      {/* ── Assign role ──────────────────────────────────────────────────────── */}
      <AssignRoleDialog
        open={assignRoleOpen}
        onClose={() => setAssignRoleOpen(false)}
        userId={id}
        onSuccess={invalidateEmployee}
      />

      {/* ── Transfer ─────────────────────────────────────────────────────────── */}
      {employee && (
        <TransferDialog
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          employee={employee}
          onSuccess={invalidateEmployee}
        />
      )}

      {/* ── Change position ──────────────────────────────────────────────────── */}
      <ChangePositionDialog
        open={changePositionOpen}
        onClose={() => setChangePositionOpen(false)}
        userId={id}
        onSuccess={invalidateEmployee}
      />
    </div>
  );
}
