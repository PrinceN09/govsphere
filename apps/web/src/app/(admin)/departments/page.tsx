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

interface Ministry {
  id: string;
  name: string;
  code: string;
}
interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  ministry: Ministry;
}

const schema = z.object({
  name: z.string().min(1, "Nom requis").max(255),
  code: z.string().min(2, "Code requis").max(50),
  ministryId: z.string().min(1, "Ministère requis"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function useMinistries() {
  return useQuery({
    queryKey: ["ministries-select"],
    queryFn: () => apiGet<PaginatedResponse<Ministry>>("/v1/ministries?limit=100&isActive=true"),
    select: (d) => d.data,
  });
}

export default function DepartmentsPage() {
  const list = useListQuery<Department>({ endpoint: "/v1/departments", queryKey: "departments" });
  const { data: ministries = [] } = useMinistries();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Department | null>(null);

  const ministryOptions = ministries.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }));

  const createForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreateSubmit = async (values: FormValues) => {
    await list.createMutation.mutateAsync({
      name: values.name,
      code: values.code.toUpperCase(),
      ministryId: values.ministryId,
      description: values.description ?? null,
    });
    createForm.reset();
    setCreateOpen(false);
  };

  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openEdit = (d: Department) => {
    setEditTarget(d);
    editForm.reset({
      name: d.name,
      code: d.code,
      ministryId: d.ministry.id,
      description: d.description ?? "",
    });
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!editTarget) return;
    await list.updateMutation.mutateAsync({
      id: editTarget.id,
      body: { name: values.name, description: values.description ?? null },
    });
    setEditTarget(null);
  };

  return (
    <div>
      <AdminTopBar
        title="Départements"
        subtitle="Départements des ministères"
        actions={
          <PermissionGate permission={PERMS.DEPARTMENT_CREATE}>
            <Button onClick={() => setCreateOpen(true)}>+ Nouveau département</Button>
          </PermissionGate>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={list.search}
            onChange={list.handleSearch}
            placeholder="Rechercher un département…"
            className="w-72"
          />
          <Badge variant="blue">
            {list.total} département{list.total !== 1 ? "s" : ""}
          </Badge>
        </div>

        {list.isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Nom</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Ministère</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <PermissionGate anyOf={[PERMS.DEPARTMENT_UPDATE, PERMS.DEPARTMENT_DEACTIVATE]}>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </PermissionGate>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.length === 0 ? (
                  <TableEmpty message="Aucun département trouvé" />
                ) : (
                  list.data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-gray-900">{d.name}</TableCell>
                      <TableCell>
                        <Badge variant="gray">{d.code}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">{d.ministry.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          active={d.isActive}
                          labelActive="Actif"
                          labelInactive="Inactif"
                        />
                      </TableCell>
                      <PermissionGate
                        anyOf={[PERMS.DEPARTMENT_UPDATE, PERMS.DEPARTMENT_DEACTIVATE]}
                      >
                        <TableCell className="text-right space-x-2">
                          <PermissionGate permission={PERMS.DEPARTMENT_UPDATE}>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                              Modifier
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission={PERMS.DEPARTMENT_DEACTIVATE}>
                            {d.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600 hover:text-danger-700"
                                onClick={() => setDeactivateTarget(d)}
                              >
                                Désactiver
                              </Button>
                            )}
                          </PermissionGate>
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

      {/* Create */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
        }}
        title="Créer un département"
      >
        <form
          onSubmit={(e) => {
            void createForm.handleSubmit(onCreateSubmit)(e);
          }}
          className="space-y-4"
        >
          <Select
            label="Ministère"
            required
            options={ministryOptions}
            placeholder="Sélectionner un ministère"
            error={createForm.formState.errors.ministryId?.message}
            {...createForm.register("ministryId")}
          />
          <Input
            label="Nom du département"
            required
            error={createForm.formState.errors.name?.message}
            {...createForm.register("name")}
          />
          <Input
            label="Code"
            placeholder="ex. DAF"
            required
            error={createForm.formState.errors.code?.message}
            {...createForm.register("code")}
          />
          <Input
            label="Description"
            error={createForm.formState.errors.description?.message}
            {...createForm.register("description")}
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

      {/* Edit */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Modifier le département"
      >
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(onEditSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom du département"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register("name")}
          />
          <Input label="Code" disabled {...editForm.register("code")} />
          <Input
            label="Description"
            error={editForm.formState.errors.description?.message}
            {...editForm.register("description")}
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

      {/* Deactivate */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          await list.deactivateMutation.mutateAsync(deactivateTarget.id);
          setDeactivateTarget(null);
        }}
        title="Désactiver le département"
        message={`Êtes-vous sûr de vouloir désactiver « ${deactivateTarget?.name} » ?`}
        confirmLabel="Désactiver"
        loading={list.deactivateMutation.isPending}
      />
    </div>
  );
}
