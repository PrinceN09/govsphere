"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { TableEmpty } from "@/components/ui/Table";
import { apiPost } from "@/lib/api";
import { useListQuery } from "@/lib/use-list-query";

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

interface Organization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  status: OrganizationStatus;
  city: string | null;
  country: string | null;
  isDemo: boolean;
  _count?: { ministries: number; departments: number; users: number };
}

interface CreateForm {
  name: string;
  code: string;
  type: OrganizationType;
  city?: string;
  country?: string;
  email?: string;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const TYPE_BADGE: Record<
  OrganizationType,
  "blue" | "purple" | "gold" | "green" | "yellow" | "gray" | "red"
> = {
  GOVERNMENT: "blue",
  ENTERPRISE: "purple",
  EDUCATION: "gold",
  HEALTHCARE: "green",
  NGO: "yellow",
  CHURCH: "gray",
  NON_PROFIT: "yellow",
  OTHER: "gray",
};

const STATUS_BADGE: Record<OrganizationStatus, "green" | "gray" | "yellow" | "red"> = {
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "yellow",
  ARCHIVED: "red",
};

const STATUS_LABELS: Record<OrganizationStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const list = useListQuery<Organization>({
    endpoint: "/v1/organizations",
    queryKey: "organizations",
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>();

  async function onCreate(data: CreateForm) {
    setCreating(true);
    try {
      await apiPost("/v1/organizations", data);
      reset();
      setShowCreate(false);
      void qc.invalidateQueries({ queryKey: ["organizations"] });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <AdminTopBar
        title="Organisations"
        subtitle="Gérez les entités multitype : gouvernements, entreprises, établissements"
        actions={<Button onClick={() => setShowCreate(true)}>+ Nouvelle organisation</Button>}
      />

      <div className="p-6 space-y-4">
        {/* Search bar */}
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Rechercher une organisation..."
            className="h-9 w-72 border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            onChange={(e) => list.handleSearch(e.target.value)}
          />
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg bg-white shadow-xl">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Nouvelle organisation</h2>
              </div>
              <form onSubmit={(e) => { void handleSubmit(onCreate)(e); }} className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Nom *</label>
                    <input
                      {...register("name", { required: true })}
                      className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ministère des Finances"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">Requis</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Code *</label>
                    <input
                      {...register("code", { required: true })}
                      className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="MIN-FIN"
                    />
                    {errors.code && <p className="text-xs text-red-500 mt-1">Requis</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Type *</label>
                  <select
                    {...register("type", { required: true })}
                    className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner…</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {errors.type && <p className="text-xs text-red-500 mt-1">Requis</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Ville</label>
                    <input
                      {...register("city")}
                      className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Kinshasa"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Pays</label>
                    <input
                      {...register("country")}
                      className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="DRC"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="contact@organisation.cd"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      reset();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" loading={creating}>
                    Créer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Organisation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Localisation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Membres
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    Chargement…
                  </td>
                </tr>
              ) : list.data.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <TableEmpty message="Aucune organisation trouvée. Créez-en une ou générez des données de démonstration." />
                  </td>
                </tr>
              ) : (
                list.data.map((org: Organization) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{org.name}</p>
                        {org.isDemo && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Démo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{org.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE[org.type]}>{TYPE_LABELS[org.type]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[org.status]}>{STATUS_LABELS[org.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[org.city, org.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{org._count?.users ?? 0} agents</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {list.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              limit={20}
              onPageChange={list.setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
