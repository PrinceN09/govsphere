"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div>
      <AdminTopBar
        title="Paramètres — Mon profil"
        subtitle="Gérez vos informations personnelles"
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
              Informations personnelles
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700">Prénom</label>
                <input
                  type="text"
                  defaultValue={user?.name?.split(" ")[0] ?? ""}
                  className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Nom</label>
                <input
                  type="text"
                  defaultValue={user?.name?.split(" ").slice(1).join(" ") ?? ""}
                  className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Email</label>
              <input
                type="email"
                defaultValue={user?.email ?? ""}
                className="mt-1 h-9 w-full border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                readOnly
              />
              <p className="mt-1 text-xs text-slate-400">
                Contactez l&apos;administrateur pour changer l&apos;email.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Langue préférée</label>
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

        {/* Avatar */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Photo de profil
            </p>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                {(user?.name ?? "?")[0]}
              </div>
              <div>
                <Button variant="secondary" size="sm">
                  Téléverser une photo
                </Button>
                <p className="mt-1.5 text-xs text-slate-400">JPG, PNG — max 5 Mo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
