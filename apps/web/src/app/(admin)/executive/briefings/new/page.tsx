"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import {
  BRIEFING_TYPE_LABELS,
  type BriefingType,
  type ExecutiveBriefing,
} from "@/lib/executive-types";

const BRIEFING_TYPES: BriefingType[] = ["DAILY", "WEEKLY", "CABINET", "EMERGENCY", "SPECIAL"];

export default function NewBriefingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    briefingType: "DAILY" as BriefingType,
    content: "",
    scheduledFor: "",
    classification: "INTERNAL",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation<ExecutiveBriefing, Error>({
    mutationFn: () => apiPost<ExecutiveBriefing>("/v1/executive/briefings", form),
    onSuccess: (briefing) => {
      void qc.invalidateQueries({ queryKey: ["executive-briefings"] });
      router.push(`/admin/executive/briefings/${briefing.id}`);
    },
    onError: (e) => setError(e.message),
  });

  return (
    <>
      <AdminTopBar
        title="Nouveau briefing"
        subtitle="Créer un briefing exécutif"
        actions={
          <button
            onClick={() => router.back()}
            className="rounded border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-300 hover:text-white transition-colors"
          >
            ← Retour
          </button>
        }
      />

      <div className="p-6 max-w-2xl">
        <Card>
          <CardBody className="space-y-5">
            {error && (
              <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1.5">Titre *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Briefing du 25 juin 2026..."
                className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-400 mb-1.5">Type *</label>
                <select
                  value={form.briefingType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, briefingType: e.target.value as BriefingType }))
                  }
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                >
                  {BRIEFING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {BRIEFING_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-400 mb-1.5">
                  Date prévue
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-400 mb-1.5">
                  Classification
                </label>
                <select
                  value={form.classification}
                  onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                  className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Interne</option>
                  <option value="CONFIDENTIAL">Confidentiel</option>
                  <option value="SECRET">Secret</option>
                  <option value="TOP_SECRET">Top Secret</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1.5">Contenu *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={14}
                placeholder="Rédigez le contenu du briefing ici..."
                className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2.5 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-y font-mono leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => mutation.mutate()}
                disabled={!form.title || !form.content || mutation.isPending}
                className="rounded bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? "Création..." : "Créer le briefing"}
              </button>
              <button
                onClick={() => router.back()}
                className="rounded border border-navy-700 px-5 py-2 text-sm font-medium text-navy-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
