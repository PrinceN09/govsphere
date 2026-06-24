"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PageSpinner } from "@/components/ui/Spinner";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import { apiClient, apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "LOCKED" | "DEACTIVATED" | "ARCHIVED";

interface RoleAssignment {
  id: string;
  isActive: boolean;
  grantedAt: string;
  role: { id: string; name: string; displayName: string; weight: number };
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => apiGet<EmployeeProfile>(`/v1/users/${id}`),
  });

  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | "suspend" | "archive" | "unlock" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  async function revokeSession(sessionId: string) {
    await apiClient.delete(`/v1/sessions/${sessionId}`);
    await queryClient.invalidateQueries({ queryKey: ["employee", id] });
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
          <div className="flex gap-2">
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
            <Tab value="login">Historique connexions</Tab>
            <Tab value="sessions">Sessions actives</Tab>
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
                <CardHeader title="Hiérarchie" />
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
                        <AvatarPlaceholder name={employee.manager.displayName} />
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

          {/* ── Roles & Permissions ───────────────────────────────────────── */}
          <TabPanel value="roles">
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader
                  title="Rôles attribués"
                  subtitle={`${employee.roleAssignments.length} rôle(s) actif(s)`}
                />
                <CardBody className="p-0">
                  {employee.roleAssignments.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">Aucun rôle attribué</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {employee.roleAssignments.map((ra) => (
                        <div key={ra.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {ra.role.displayName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Poids {ra.role.weight} · Attribué le {fmtDateShort(ra.grantedAt)}
                            </p>
                          </div>
                          <Badge variant={ra.isActive ? "green" : "gray"}>
                            {ra.isActive ? "Actif" : "Révoqué"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Permissions effectives"
                  subtitle={`${employee.permissions.length} permission(s) résolues`}
                />
                <CardBody>
                  {employee.permissions.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucune permission</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {employee.permissions.map((p) => (
                        <Badge key={p} variant="gray" className="font-mono text-xs">
                          {p}
                        </Badge>
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
                              className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${entry.success ? "bg-success-500" : "bg-danger-500"}`}
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
                                {entry.userAgent && (
                                  <span className="ml-2 truncate max-w-xs inline-block align-middle">
                                    {entry.userAgent}
                                  </span>
                                )}
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

      {/* Lifecycle confirm */}
      <ConfirmDialog
        open={actionType !== null}
        onClose={() => setActionType(null)}
        onConfirm={handleAction}
        title={actionType ? actionLabels[actionType] : ""}
        message={actionType ? actionMessages[actionType] : ""}
        confirmLabel={actionType ? actionLabels[actionType] : "Confirmer"}
        loading={actionLoading}
      />
    </div>
  );
}
