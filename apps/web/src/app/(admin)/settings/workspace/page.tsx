"use client";

import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";

export default function WorkspaceSettingsPage() {
  return (
    <div>
      <AdminTopBar
        title="Paramètres — Espace de travail"
        subtitle="Configurez les informations de votre organisation"
        actions={
          <Link href="/admin/settings" className="text-sm text-slate-500 hover:text-slate-700">
            ← Paramètres
          </Link>
        }
      />
      <div className="p-6 max-w-2xl space-y-6">
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Identité
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">
                Nom de l&apos;espace de travail
              </label>
              <input
                type="text"
                defaultValue="Prinodia Workspace"
                className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Fuseau horaire</label>
              <select className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Africa/Kinshasa (UTC+1)</option>
                <option>Europe/Paris (UTC+1/+2)</option>
                <option>UTC</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Langue par défaut</label>
              <select className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
            <Button size="sm">Enregistrer</Button>
          </div>
        </div>

        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Logo & Marque
            </p>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center bg-primary-600 text-2xl font-black text-white">
                G
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Logo de l&apos;organisation</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  PNG ou SVG — max 2 Mo. En attente des assets de marque finaux.
                </p>
                <Button variant="secondary" size="sm" className="mt-2" disabled>
                  Téléverser un logo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
