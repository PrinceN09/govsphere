"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemoStatus {
  hasDemoData: boolean;
  lastGenerated: string | null;
  counts: {
    organizations: number;
    users: number;
    departments: number;
    meetings: number;
    documents: number;
    workflows: number;
    tasks: number;
    notifications: number;
  };
}

interface GenerateResult {
  success: boolean;
  sessionId: string;
  seedSize: string;
  orgType: string;
  generatedAt: string;
  counts: Record<string, number>;
}

type SeedSize = "SMALL" | "MEDIUM" | "LARGE" | "GOVERNMENT_MINISTRY";
type OrgType = "ALL" | "GOVERNMENT" | "ENTERPRISE" | "EDUCATION" | "HEALTHCARE" | "NGO" | "CHURCH";

const SEED_SIZES: Array<{ value: SeedSize; label: string; description: string }> = [
  { value: "SMALL", label: "Petit", description: "3 employés, 3 réunions, 4 documents par org" },
  { value: "MEDIUM", label: "Moyen", description: "5 employés, 8 réunions, 10 documents par org" },
  { value: "LARGE", label: "Grand", description: "10 employés, 15 réunions, 20 documents par org" },
  {
    value: "GOVERNMENT_MINISTRY",
    label: "Ministère gouvernemental",
    description: "Structure complète pour 1 ministère gouvernemental",
  },
];

const ORG_TYPES: Array<{ value: OrgType; label: string }> = [
  { value: "ALL", label: "Tous les types" },
  { value: "GOVERNMENT", label: "Gouvernement" },
  { value: "ENTERPRISE", label: "Entreprise" },
  { value: "EDUCATION", label: "Éducation" },
  { value: "HEALTHCARE", label: "Santé" },
  { value: "NGO", label: "ONG" },
  { value: "CHURCH", label: "Église" },
];

// ─── Count row ────────────────────────────────────────────────────────────────

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoDataPage() {
  const qc = useQueryClient();
  const [seedSize, setSeedSize] = useState<SeedSize>("MEDIUM");
  const [orgType, setOrgType] = useState<OrgType>("ALL");
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery<DemoStatus>({
    queryKey: ["demo-status"],
    queryFn: () => apiGet<DemoStatus>("/v1/demo/status"),
    staleTime: 30_000,
  });

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost<GenerateResult>("/v1/demo/generate", { seedSize, orgType });
      setResult(res);
      void refetch();
      void qc.invalidateQueries({ queryKey: ["organizations"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    setShowResetConfirm(false);
    try {
      await apiDelete("/v1/demo/reset");
      setResult(null);
      void refetch();
      void qc.invalidateQueries({ queryKey: ["organizations"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <AdminTopBar
        title="Environnement de démonstration"
        subtitle="Générez et gérez des données réalistes pour les présentations"
      />

      <div className="p-6 space-y-6">
        {/* Warning banner */}
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 px-5 py-4">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Données de démonstration uniquement
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              Les données générées sont marquées comme démo et peuvent être supprimées en toute
              sécurité. Elles n&apos;affectent jamais les données de production existantes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Config */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seed size */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Taille de jeu de données
                </p>
              </div>
              <div className="p-4 space-y-2">
                {SEED_SIZES.map((s) => (
                  <label
                    key={s.value}
                    className={`flex cursor-pointer items-start gap-3 rounded p-3 transition-colors ${
                      seedSize === s.value
                        ? "bg-primary-50 ring-1 ring-primary-300"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="seedSize"
                      value={s.value}
                      checked={seedSize === s.value}
                      onChange={() => setSeedSize(s.value)}
                      className="mt-0.5 h-4 w-4 accent-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.label}</p>
                      <p className="text-xs text-slate-500">{s.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Org type filter */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type d&apos;organisation
                </p>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {ORG_TYPES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setOrgType(o.value)}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      orgType === o.value
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button onClick={() => { void handleGenerate(); }} loading={generating} size="lg">
                ⚡ Générer les données démo
              </Button>
              {status?.hasDemoData && (
                <Button
                  variant="danger"
                  size="lg"
                  onClick={() => setShowResetConfirm(true)}
                  loading={resetting}
                >
                  🗑 Réinitialiser
                </Button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success result */}
            {result && (
              <div className="border border-green-200 bg-green-50 px-5 py-4">
                <p className="text-sm font-semibold text-green-800">
                  ✓ Données générées avec succès
                </p>
                <p className="mt-1 text-xs text-green-700">Session: {result.sessionId}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-700">
                  {Object.entries(result.counts).map(([k, v]) => (
                    <span key={k}>
                      {k}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Demo login accounts */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Comptes de démonstration
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-3">
                  Mot de passe pour tous les comptes démo:{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Demo@2025!</code>
                </p>
                <div className="space-y-1.5 text-xs font-mono text-slate-700">
                  {[
                    { email: "demo.exec.demogov*@demo.prinodia", role: "Exécutif" },
                    { email: "demo.mgr1.demogov*@demo.prinodia", role: "Manager" },
                    { email: "demo.hr.demogov*@demo.prinodia", role: "RH" },
                    { email: "demo.emp1.demogov*@demo.prinodia", role: "Employé" },
                  ].map((a) => (
                    <div key={a.email} className="flex items-center justify-between">
                      <span className="text-slate-600">{a.email}</span>
                      <Badge variant="gray">{a.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status */}
          <div className="space-y-4">
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Statut actuel
                </p>
              </div>
              <div className="px-5 py-4">
                {isLoading ? (
                  <div className="h-20 animate-pulse bg-slate-100 rounded" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${status?.hasDemoData ? "bg-green-500" : "bg-slate-300"}`}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {status?.hasDemoData ? "Données démo actives" : "Aucune donnée démo"}
                      </span>
                    </div>
                    {status?.lastGenerated && (
                      <p className="text-xs text-slate-500 mb-4">
                        Dernière génération:{" "}
                        {new Date(status.lastGenerated).toLocaleString("fr-FR")}
                      </p>
                    )}
                    <div className="divide-y divide-slate-100">
                      <CountRow label="Organisations" value={status?.counts.organizations ?? 0} />
                      <CountRow label="Agents" value={status?.counts.users ?? 0} />
                      <CountRow label="Départements" value={status?.counts.departments ?? 0} />
                      <CountRow label="Réunions" value={status?.counts.meetings ?? 0} />
                      <CountRow label="Documents" value={status?.counts.documents ?? 0} />
                      <CountRow label="Workflows" value={status?.counts.workflows ?? 0} />
                      <CountRow label="Tâches" value={status?.counts.tasks ?? 0} />
                      <CountRow label="Notifications" value={status?.counts.notifications ?? 0} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Safety rules */}
            <div className="border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Règles de sécurité
                </p>
              </div>
              <ul className="px-5 py-4 space-y-2 text-xs text-slate-600">
                {[
                  "Génération 100% idempotente",
                  "Registre interne pour chaque entité créée",
                  "Réinitialisation ciblée — jamais les vraies données",
                  "Emails démo sur domaine @demo.prinodia",
                  "Organisations marquées isDemo = true",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Confirmer la réinitialisation
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Toutes les données démo seront supprimées définitivement. Cette action est
              irréversible.
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => { void handleReset(); }} loading={resetting}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
