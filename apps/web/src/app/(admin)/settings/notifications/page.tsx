"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";

interface PrefRow {
  key: string;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

const DEFAULT_PREFS: PrefRow[] = [
  {
    key: "mentions",
    label: "Mentions",
    description: "Quand quelqu'un vous mentionne",
    inApp: true,
    email: false,
  },
  {
    key: "messages",
    label: "Messages directs",
    description: "Nouveaux messages dans vos conversations",
    inApp: true,
    email: false,
  },
  {
    key: "tasks",
    label: "Tâches assignées",
    description: "Quand une tâche vous est attribuée",
    inApp: true,
    email: true,
  },
  {
    key: "approvals",
    label: "Approbations requises",
    description: "Documents et workflows en attente de votre approbation",
    inApp: true,
    email: true,
  },
  {
    key: "meetings",
    label: "Réunions",
    description: "Invitations et rappels de réunions",
    inApp: true,
    email: true,
  },
  {
    key: "documents",
    label: "Partages de documents",
    description: "Quand un document est partagé avec vous",
    inApp: true,
    email: false,
  },
  {
    key: "security",
    label: "Alertes de sécurité",
    description: "Connexions suspectes, changement de mot de passe",
    inApp: true,
    email: true,
  },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  function toggle(key: string, channel: "inApp" | "email") {
    setPrefs((prev) => prev.map((p) => (p.key === key ? { ...p, [channel]: !p[channel] } : p)));
  }

  return (
    <div>
      <AdminTopBar
        title="Paramètres — Notifications"
        subtitle="Choisissez quand et comment être notifié"
        actions={
          <Link href="/admin/settings" className="text-sm text-slate-500 hover:text-slate-700">
            ← Paramètres
          </Link>
        }
      />
      <div className="p-6 max-w-2xl">
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="grid grid-cols-[1fr,80px,80px] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Événement</span>
              <span className="text-center">Application</span>
              <span className="text-center">Email</span>
            </div>
          </div>
          {prefs.map((pref) => (
            <div
              key={pref.key}
              className="grid grid-cols-[1fr,80px,80px] items-center border-b border-slate-100 px-5 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{pref.label}</p>
                <p className="text-xs text-slate-500">{pref.description}</p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => toggle(pref.key, "inApp")}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${pref.inApp ? "bg-primary-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${pref.inApp ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => toggle(pref.key, "email")}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${pref.email ? "bg-primary-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${pref.email ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm">Enregistrer les préférences</Button>
        </div>
      </div>
    </div>
  );
}
