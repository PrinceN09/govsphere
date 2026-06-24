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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Province {
  id: string;
  name: string;
  code: string;
  capital: string | null;
  isActive: boolean;
  nameTranslations: Record<string, string>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Nom requis").max(255),
  code: z.string().min(2, "Code requis").max(10),
  capital: z.string().optional(),
  nameEn: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProvincesPage() {
  const list = useListQuery<Province>({ endpoint: "/v1/provinces", queryKey: "provinces" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Province | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Province | null>(null);

  // ── Create form ─────────────────────────────────────────────────────────────
  const createForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreateSubmit = async (values: FormValues) => {
    await list.createMutation.mutateAsync({
      name: values.name,
      code: values.code,
      capital: values.capital ?? null,
      nameTranslations: values.nameEn ? { en: values.nameEn } : {},
    });
    createForm.reset();
    setCreateOpen(false);
  };

  // ── Edit form ───────────────────────────────────────────────────────────────
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openEdit = (province: Province) => {
    setEditTarget(province);
    editForm.reset({
      name: province.name,
      code: province.code,
      capital: province.capital ?? "",
      nameEn: province.nameTranslations["en"] ?? "",
    });
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!editTarget) return;
    await list.updateMutation.mutateAsync({
      id: editTarget.id,
      body: {
        name: values.name,
        capital: values.capital ?? null,
        nameTranslations: values.nameEn ? { en: values.nameEn } : {},
      },
    });
    setEditTarget(null);
  };

  return (
    <div>
      <AdminTopBar
        title="Provinces"
        subtitle="Les 26 provinces de la République Démocratique du Congo"
        actions={
          <PermissionGate permission={PERMS.PROVINCE_CREATE}>
            <Button onClick={() => setCreateOpen(true)}>+ Nouvelle province</Button>
          </PermissionGate>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <SearchInput
            value={list.search}
            onChange={list.handleSearch}
            placeholder="Rechercher une province…"
            className="w-72"
          />
          <Badge variant="blue">
            {list.total} province{list.total !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Table */}
        {list.isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Nom</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Chef-lieu</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <PermissionGate permission={PERMS.PROVINCE_UPDATE}>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </PermissionGate>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.length === 0 ? (
                  <TableEmpty message="Aucune province trouvée" />
                ) : (
                  list.data.map((province) => (
                    <TableRow key={province.id}>
                      <TableCell className="font-medium text-gray-900">{province.name}</TableCell>
                      <TableCell>
                        <Badge variant="gray">{province.code}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">{province.capital ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          active={province.isActive}
                          labelActive="Actif"
                          labelInactive="Inactif"
                        />
                      </TableCell>
                      <PermissionGate permission={PERMS.PROVINCE_UPDATE}>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(province)}>
                            Modifier
                          </Button>
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

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
        }}
        title="Créer une province"
      >
        <form
          onSubmit={(e) => {
            void createForm.handleSubmit(onCreateSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom de la province"
            placeholder="ex. Kinshasa"
            required
            error={createForm.formState.errors.name?.message}
            {...createForm.register("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="KIN"
              required
              error={createForm.formState.errors.code?.message}
              {...createForm.register("code")}
            />
            <Input
              label="Chef-lieu"
              placeholder="Kinshasa"
              error={createForm.formState.errors.capital?.message}
              {...createForm.register("capital")}
            />
          </div>
          <Input
            label="Nom en anglais"
            placeholder="Kinshasa"
            error={createForm.formState.errors.nameEn?.message}
            {...createForm.register("nameEn")}
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

      {/* Edit dialog */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Modifier la province"
      >
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(onEditSubmit)(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom de la province"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" disabled {...editForm.register("code")} />
            <Input
              label="Chef-lieu"
              error={editForm.formState.errors.capital?.message}
              {...editForm.register("capital")}
            />
          </div>
          <Input
            label="Nom en anglais"
            error={editForm.formState.errors.nameEn?.message}
            {...editForm.register("nameEn")}
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

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          await list.deactivateMutation.mutateAsync(deactivateTarget.id);
          setDeactivateTarget(null);
        }}
        title="Désactiver la province"
        message={`Êtes-vous sûr de vouloir désactiver « ${deactivateTarget?.name} » ?`}
        confirmLabel="Désactiver"
        loading={list.deactivateMutation.isPending}
      />
    </div>
  );
}
