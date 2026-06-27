"use client";

import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function SecuritySettingsPage() {
  return (
    <div>
      <AdminTopBar
        title="Paramètres — Sécurité"
        subtitle="Gérez votre mot de passe, MFA et les sessions actives"
        actions={
          <Link href="/admin/settings" className="text-sm text-slate-500 hover:text-slate-700">
            ← Paramètres
          </Link>
        }
      />
      <div className="p-6 max-w-2xl space-y-6">
        {/* Password */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mot de passe
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Mot de passe actuel</label>
              <input
                type="password"
                className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Nouveau mot de passe</label>
              <input
                type="password"
                className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
            <Button size="sm">Changer le mot de passe</Button>
          </div>
        </div>

        {/* MFA */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Authentification à deux facteurs (MFA)
            </p>
            <Badge variant="yellow">Désactivé</Badge>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-slate-600">
              Activez la MFA pour renforcer la sécurité de votre compte. Utilisez une application
              comme Google Authenticator ou Authy.
            </p>
            <Button variant="secondary" size="sm" className="mt-4">
              Activer la MFA
            </Button>
          </div>
        </div>

        {/* Sessions */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sessions actives
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-slate-600 mb-4">
              Visualisez et gérez toutes vos sessions actives.
            </p>
            <div className="flex gap-3">
              <Link href="/admin/security/sessions">
                <Button variant="secondary" size="sm">
                  Voir mes sessions
                </Button>
              </Link>
              <Button variant="danger" size="sm">
                Déconnecter toutes les sessions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
