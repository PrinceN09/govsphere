"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { PERMS } from "@/lib/permissions";
import { useListQuery } from "@/lib/use-list-query";

interface Ministry {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  nameTranslations: Record<string, string>;
  _count?: { departments: number };
}

const schema = z.object({
  name: z.string().min(1, "Nom requis").max(255),
  code: z.string().min(2, "Code requis").max(50),
  description: z.string().optional(),
  nameEn: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function MinistriesPage() {
  const list = useListQuery<Ministry>({ endpoint: "/v1/ministries", queryKey: "ministries" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ministry | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Ministry | null>(null);

  const createForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreateSubmit = async (values: FormValues) => {
    await list.createMutation.mutateAsync({
      name: values.name,
      code: values.code.toUpperCase(),
      description: values.description ?? null,
      nameTranslations: values.nameEn ? { en: values.nameEn } : {},
    });
    createForm.reset();
    setCreateOpen(false);
  };

  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openEdit = (m: Ministry) => {
    setEditTarget(m);
    editForm.reset({
      name: m.name,
      code: m.code,
      description: m.description ?? "",
      nameEn: m.nameTranslations["en"] ?? "",
    });
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!editTarget) return;
    await list.updateMutation.mutateAsync({
      id: editTarget.id,
      body: {
        name: values.name,
        description: values.description ?? null,
        nameTranslations: values.nameEn ? { en: values.nameEn } : {},
      },
    });
    setEditTarget(null);
  };

  return (
    <div>
      <AdminTopBar
        title="Ministères"
        subtitle="Structure ministérielle du gouvernement de la RDC"
        actions={
          <PermissionGate permission={PERMS.MINISTRY_CREATE}>
            <Button onClick={() => setCreateOpen(true)}>+ Nouveau ministère</Button>
          </PermissionGate>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={list.search}
            onChange={list.handleSearch}
            placeholder="Rechercher un ministère…"
            className="w-72"
          />
          <Badge variant="blue">
            {list.total} ministère{list.total !== 1 ? "s" : ""}
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
                  <TableHeaderCell>Départements</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <PermissionGate anyOf={[PERMS.MINISTRY_UPDATE, PERMS.MINISTRY_DEACTIVATE]}>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </PermissionGate>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.length === 0 ? (
                  <TableEmpty message="Aucun ministère trouvé" />
                ) : (
                  list.data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        {m.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">{m.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="blue">{m.code}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {m._count?.departments ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          active={m.isActive}
                          labelActive="Actif"
                          labelInactive="Inactif"
                        />
                      </TableCell>
                      <PermissionGate anyOf={[PERMS.MINISTRY_UPDATE, PERMS.MINISTRY_DEACTIVATE]}>
                        <TableCell className="text-right space-x-2">
                          <PermissionGate permission={PERMS.MINISTRY_UPDATE}>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                              Modifier
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission={PERMS.MINISTRY_DEACTIVATE}>
                            {m.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600 hover:text-danger-700"
                                onClick={() => setDeactivateTarget(m)}
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
        title="Créer un ministère"
      >
        <form
          onSubmit={(e) => {
            void createForm.handleSubmit(onCreateSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom du ministère"
            placeholder="ex. Ministère des Finances"
            required
            error={createForm.formState.errors.name?.message}
            {...createForm.register("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="MFIN"
              required
              error={createForm.formState.errors.code?.message}
              {...createForm.register("code")}
            />
            <Input
              label="Nom en anglais"
              placeholder="Ministry of Finance"
              error={createForm.formState.errors.nameEn?.message}
              {...createForm.register("nameEn")}
            />
          </div>
          <Input
            label="Description"
            placeholder="Description du ministère"
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
        title="Modifier le ministère"
      >
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(onEditSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom du ministère"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" disabled {...editForm.register("code")} />
            <Input
              label="Nom en anglais"
              error={editForm.formState.errors.nameEn?.message}
              {...editForm.register("nameEn")}
            />
          </div>
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
        title="Désactiver le ministère"
        message={`Êtes-vous sûr de vouloir désactiver « ${deactivateTarget?.name} » ?`}
        confirmLabel="Désactiver"
        loading={list.deactivateMutation.isPending}
      />
    </div>
  );
}
