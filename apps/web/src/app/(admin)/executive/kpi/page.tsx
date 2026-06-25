"use client";

import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";

const KPI_CATEGORIES = [
  {
    id: "governance",
    label: "Gouvernance",
    icon: "🏛️",
    kpis: [
      { label: "Décisions adoptées (mois)", value: "—", unit: "décisions" },
      { label: "Taux de mise en œuvre", value: "—", unit: "%" },
      { label: "Sessions tenues (trimestre)", value: "—", unit: "sessions" },
      { label: "Briefings publiés", value: "—", unit: "briefings" },
    ],
  },
  {
    id: "performance",
    label: "Performance exécutive",
    icon: "📊",
    kpis: [
      { label: "Délai moyen d'adoption", value: "—", unit: "jours" },
      { label: "Décisions en retard", value: "—", unit: "décisions" },
      { label: "Actions de mise en œuvre complétées", value: "—", unit: "%" },
      { label: "Correspondances en suspens", value: "—", unit: "courriers" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: "📢",
    kpis: [
      { label: "Annonces publiées (mois)", value: "—", unit: "annonces" },
      { label: "Directives émises", value: "—", unit: "directives" },
      { label: "Circulaires de cabinet", value: "—", unit: "circulaires" },
    ],
  },
];

export default function KpiPage() {
  return (
    <>
      <AdminTopBar
        title="Indicateurs de performance (KPI)"
        subtitle="Tableau de bord stratégique — Bureau Exécutif & Cabinet"
        actions={
          <span className="rounded border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-400">
            🚧 En développement
          </span>
        }
      />

      <div className="p-6 space-y-6">
        {/* Notice */}
        <div className="rounded-lg border border-amber-800 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
          Le tableau de bord KPI est en cours de développement. Les données seront disponibles une
          fois les intégrations avec les modules de workflow, de décisions et de briefings
          configurées.
        </div>

        {/* KPI categories */}
        {KPI_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>{cat.icon}</span>
              {cat.label}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cat.kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-navy-700 bg-navy-800/60 px-4 py-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-navy-400 mb-2 leading-tight">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
                  <p className="text-[10px] text-navy-500 mt-0.5">{kpi.unit}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Links to real data */}
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-white mb-4">
              Accéder aux données en temps réel
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: "/admin/executive/cabinet/decisions", label: "Décisions", icon: "⚖️" },
                { href: "/admin/executive/cabinet", label: "Sessions", icon: "🏛️" },
                { href: "/admin/executive/briefings", label: "Briefings", icon: "📋" },
                { href: "/admin/executive/correspondence", label: "Correspondances", icon: "✉️" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 hover:border-navy-600 transition-colors"
                >
                  <span>{link.icon}</span>
                  <span className="text-sm text-navy-200">{link.label}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
