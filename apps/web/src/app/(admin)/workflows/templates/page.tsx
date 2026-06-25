"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/api";

import type { WorkflowTemplate } from "@/lib/workflow-types";

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "Manuel",
  DOCUMENT_CREATED: "Création document",
  DOCUMENT_PUBLISHED: "Publication document",
  EMPLOYEE_TRANSFERRED: "Transfert agent",
  BUDGET_SUBMITTED: "Soumission budget",
  CONTRACT_UPLOADED: "Import contrat",
  CUSTOM: "Personnalisé",
};

export default function WorkflowTemplatesPage() {
  const { data: templates, isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates"],
    queryFn: () => apiGet("/v1/workflows/templates"),
  });

  const { data: builtIn, isLoading: builtInLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates-builtin"],
    queryFn: () => apiGet("/v1/workflows/templates/built-in"),
  });

  return (
    <>
      <AdminTopBar title="Modèles de workflow" subtitle="Modèles officiels et personnalisés" />

      <div className="p-6 space-y-8">
        {/* Built-in templates */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Modèles officiels
            </h2>
            <span className="rounded bg-gold-900/30 px-2 py-0.5 text-xs font-medium text-gold-400">
              Gouvernement RDC
            </span>
          </div>

          {builtInLoading ? (
            <PageSpinner />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(builtIn ?? []).map((tpl) => (
                <TemplateCard key={tpl.slug} template={tpl} isSystem />
              ))}
            </div>
          )}
        </section>

        {/* Custom templates */}
        <section>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Modèles personnalisés
          </h2>
          {isLoading ? (
            <PageSpinner />
          ) : !templates?.filter((t) => !t.isSystem).length ? (
            <EmptyState
              title="Aucun modèle personnalisé"
              description="Les modèles créés par votre ministère apparaîtront ici."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates
                ?.filter((t) => !t.isSystem)
                .map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} />
                ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isSystem = false,
}: {
  template: WorkflowTemplate;
  isSystem?: boolean;
}) {
  const stepCount =
    "stepDefinitions" in template ? (template.stepDefinitions as unknown[]).length : 0;

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-snug">{template.name}</h3>
          {isSystem && (
            <span className="flex-shrink-0 rounded bg-gold-900/30 px-1.5 py-0.5 text-[10px] font-medium text-gold-400 uppercase tracking-wide">
              Officiel
            </span>
          )}
        </div>

        {template.description && (
          <p className="text-xs text-navy-400 line-clamp-2 mb-3">{template.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-navy-500">
          <span>{TRIGGER_LABELS[template.trigger] ?? template.trigger}</span>
          <span>·</span>
          <span>
            {stepCount} étape{stepCount !== 1 ? "s" : ""}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
