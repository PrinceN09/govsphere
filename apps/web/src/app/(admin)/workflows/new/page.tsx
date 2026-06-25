"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

import type { WorkflowDefinition, WorkflowInstance } from "@/lib/workflow-types";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [definitionId, setDefinitionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: definitions, isLoading: defsLoading } = useQuery<WorkflowDefinition[]>({
    queryKey: ["workflow-definitions"],
    queryFn: () => apiGet("/v1/workflows/definitions"),
  });

  const start = useMutation<WorkflowInstance, Error, void>({
    mutationFn: () => apiPost("/v1/workflows/start", { definitionId, title, description }),
    onSuccess: (wf) => {
      void router.push(`/admin/workflows/${wf.id}`);
    },
    onError: (e) => setError(e.message),
  });

  if (defsLoading) return <PageSpinner />;

  const defOptions = definitions?.map((d) => ({ value: d.id, label: d.title })) ?? [];

  return (
    <>
      <AdminTopBar title="Nouveau workflow" subtitle="Lancer un circuit d'approbation" />

      <div className="p-6 max-w-2xl">
        <Card>
          <CardBody>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-navy-300 uppercase tracking-wider mb-1.5">
                  Définition de workflow
                </label>
                <Select
                  value={definitionId}
                  onChange={(e) => setDefinitionId(e.target.value)}
                  options={[{ value: "", label: "Sélectionner un workflow…" }, ...defOptions]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-300 uppercase tracking-wider mb-1.5">
                  Titre
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Approbation Note de Cabinet — Avril 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-300 uppercase tracking-wider mb-1.5">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Contexte ou notes…"
                />
              </div>

              {error && (
                <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => start.mutate()}
                  disabled={!definitionId || !title || start.isPending}
                  variant="primary"
                >
                  {start.isPending ? "Lancement…" : "Lancer le workflow"}
                </Button>
                <Button onClick={() => router.back()} variant="ghost">
                  Annuler
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Workflow preview */}
        {definitionId &&
          definitions &&
          (() => {
            const found = definitions.find((d) => d.id === definitionId);
            return found !== undefined ? <WorkflowPreview definition={found} /> : null;
          })()}
      </div>
    </>
  );
}

function WorkflowPreview({ definition }: { definition: WorkflowDefinition }) {
  if (!definition?.steps?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-400 mb-3">
        Étapes du workflow
      </h3>
      <div className="space-y-2">
        {definition.steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-navy-700 flex items-center justify-center">
              <span className="text-xs font-bold text-navy-300">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0 rounded bg-navy-800 border border-navy-700 px-3 py-2">
              <p className="text-sm font-medium text-white">{step.name}</p>
              {step.description && (
                <p className="text-xs text-navy-400 mt-0.5">{step.description}</p>
              )}
              <div className="mt-1 flex gap-3 text-xs text-navy-500">
                {step.durationHours && <span>{step.durationHours}h max</span>}
                {step.requireSign && <span className="text-gold-400">✦ Signature requise</span>}
                {step.requireComment && <span>Commentaire requis</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
