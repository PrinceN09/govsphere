"use client";

import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";

const SETTINGS_SECTIONS = [
  {
    href: "/admin/settings/workspace",
    title: "Espace de travail",
    description: "Nom, logo, fuseau horaire, langue par défaut",
    icon: "🏢",
  },
  {
    href: "/admin/settings/profile",
    title: "Mon profil",
    description: "Nom, email, photo, informations personnelles",
    icon: "👤",
  },
  {
    href: "/admin/settings/security",
    title: "Sécurité",
    description: "Mot de passe, authentification à deux facteurs, sessions actives",
    icon: "🔒",
  },
  {
    href: "/admin/settings/notifications",
    title: "Notifications",
    description: "Préférences de notification par email et dans l'application",
    icon: "🔔",
  },
  {
    href: "/admin/settings/appearance",
    title: "Apparence",
    description: "Thème, densité d'affichage, langue de l'interface",
    icon: "🎨",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <AdminTopBar
        title="Paramètres"
        subtitle="Configurez votre espace de travail et vos préférences personnelles"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-4 border border-slate-200 bg-white px-5 py-5 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Version</p>
          </div>
          <div className="px-5 py-4 space-y-1 text-sm text-slate-600">
            <p>
              Prinodia Workspace <span className="font-semibold">v1.1.0</span>
            </p>
            <p className="text-xs text-slate-400">Product Readiness &amp; Demo Environment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
