"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { PaginatedResponse } from "@/lib/api";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import { PERMS } from "@/lib/permissions";
import { useListQuery } from "@/lib/use-list-query";

type PositionLevel = "EXECUTIVE" | "DIRECTOR" | "MANAGER" | "SPECIALIST" | "OFFICER" | "SUPPORT";

interface Ministry {
  id: string;
  name: string;
  code: string;
}

interface Position {
  id: string;
  title: string;
  code: string;
  level: PositionLevel;
  headcount: number;
  isActive: boolean;
  ministry: Ministry | null;
}

const LEVEL_LABELS: Record<PositionLevel, string> = {
  EXECUTIVE: "Direction Exécutive",
  DIRECTOR: "Directeur",
  MANAGER: "Manager",
  SPECIALIST: "Spécialiste",
  OFFICER: "Agent",
  SUPPORT: "Support",
};

const LEVEL_COLORS: Record<PositionLevel, "purple" | "blue" | "green" | "yellow" | "gray" | "red"> =
  {
    EXECUTIVE: "purple",
    DIRECTOR: "blue",
    MANAGER: "green",
    SPECIALIST: "yellow",
    OFFICER: "gray",
    SUPPORT: "gray",
  };

const LEVEL_OPTIONS = Object.entries(LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l }));

const schema = z.object({
  title: z.string().min(1, "Intitulé requis").max(255),
  code: z.string().min(2, "Code requis").max(50),
  level: z.enum(["EXECUTIVE", "DIRECTOR", "MANAGER", "SPECIALIST", "OFFICER", "SUPPORT"]),
  headcount: z.coerce.number().int().positive().default(1),
  ministryId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function useMinistries() {
  return useQuery({
    queryKey: ["ministries-select"],
    queryFn: () => apiGet<PaginatedResponse<Ministry>>("/v1/ministries?limit=100&isActive=true"),
    select: (d) => d.data,
  });
}

export default function PositionsPage() {
  const list = useListQuery<Position>({ endpoint: "/v1/positions", queryKey: "positions" });
  const { data: ministries = [] } = useMinistries();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Position | null>(null);

  const ministryOptions = [
    { value: "", label: "Tous les ministères" },
    ...ministries.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` })),
  ];

  const createForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { headcount: 1 },
  });
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreateSubmit = async (values: FormValues) => {
    await list.createMutation.mutateAsync({
      title: values.title,
      code: values.code.toUpperCase(),
      level: values.level,
      headcount: values.headcount,
      ministryId: values.ministryId ?? null,
    });
    createForm.reset();
    setCreateOpen(false);
  };

  const openEdit = (p: Position) => {
    setEditTarget(p);
    editForm.reset({
      title: p.title,
      code: p.code,
      level: p.level,
      headcount: p.headcount,
      ministryId: p.ministry?.id ?? "",
    });
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!editTarget) return;
    await list.updateMutation.mutateAsync({
      id: editTarget.id,
      body: { title: values.title, level: values.level, headcount: values.headcount },
    });
    setEditTarget(null);
  };

  return (
    <div>
      <AdminTopBar
        title="Postes"
        subtitle="Postes et responsabilités gouvernementaux"
        actions={
          <PermissionGate permission={PERMS.POSITION_CREATE}>
            <Button onClick={() => setCreateOpen(true)}>+ Nouveau poste</Button>
          </PermissionGate>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={list.search}
            onChange={list.handleSearch}
            placeholder="Rechercher un poste…"
            className="w-72"
          />
          <Badge variant="blue">
            {list.total} poste{list.total !== 1 ? "s" : ""}
          </Badge>
        </div>

        {list.isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Intitulé</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Niveau</TableHeaderCell>
                  <TableHeaderCell>Effectif</TableHeaderCell>
                  <TableHeaderCell>Ministère</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <PermissionGate permission={PERMS.POSITION_UPDATE}>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </PermissionGate>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.length === 0 ? (
                  <TableEmpty message="Aucun poste trouvé" />
                ) : (
                  list.data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-gray-900">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant="gray">{p.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={LEVEL_COLORS[p.level]}>{LEVEL_LABELS[p.level]}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">{p.headcount}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {p.ministry?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          active={p.isActive}
                          labelActive="Actif"
                          labelInactive="Inactif"
                        />
                      </TableCell>
                      <PermissionGate permission={PERMS.POSITION_UPDATE}>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            Modifier
                          </Button>
                          {p.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger-600"
                              onClick={() => setDeactivateTarget(p)}
                            >
                              Désactiver
                            </Button>
                          )}
                        </TableCell>
                      </PermissionGate>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              limit={20}
              onPageChange={list.setPage}
              labelOf="sur"
              labelPage="Page"
            />
          </>
        )}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
        }}
        title="Créer un poste"
      >
        <form
          onSubmit={(e) => {
            void createForm.handleSubmit(onCreateSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Intitulé du poste"
            required
            error={createForm.formState.errors.title?.message}
            {...createForm.register("title")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="ex. DG"
              required
              error={createForm.formState.errors.code?.message}
              {...createForm.register("code")}
            />
            <Input
              label="Effectif autorisé"
              type="number"
              min={1}
              error={createForm.formState.errors.headcount?.message}
              {...createForm.register("headcount")}
            />
          </div>
          <Select
            label="Niveau"
            required
            options={LEVEL_OPTIONS}
            placeholder="Sélectionner un niveau"
            error={createForm.formState.errors.level?.message}
            {...createForm.register("level")}
          />
          <Select
            label="Ministère"
            options={ministryOptions}
            placeholder="Aucun (transversal)"
            {...createForm.register("ministryId")}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={list.createMutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Modifier le poste"
      >
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(onEditSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Intitulé"
            required
            error={editForm.formState.errors.title?.message}
            {...editForm.register("title")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" disabled {...editForm.register("code")} />
            <Input
              label="Effectif autorisé"
              type="number"
              min={1}
              error={editForm.formState.errors.headcount?.message}
              {...editForm.register("headcount")}
            />
          </div>
          <Select
            label="Niveau"
            required
            options={LEVEL_OPTIONS}
            error={editForm.formState.errors.level?.message}
            {...editForm.register("level")}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>
              Annuler
            </Button>
            <Button type="submit" loading={list.updateMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          await list.deactivateMutation.mutateAsync(deactivateTarget.id);
          setDeactivateTarget(null);
        }}
        title="Désactiver le poste"
        message={`Désactiver « ${deactivateTarget?.title} » ?`}
        confirmLabel="Désactiver"
        loading={list.deactivateMutation.isPending}
      />
    </div>
  );
}
