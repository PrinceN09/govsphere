"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  return (
    <div>
      <AdminTopBar
        title="Paramètres — Apparence"
        subtitle="Personnalisez l'aspect visuel de l'interface"
        actions={
          <Link href="/admin/settings" className="text-sm text-slate-500 hover:text-slate-700">
            ← Paramètres
          </Link>
        }
      />
      <div className="p-6 max-w-2xl space-y-6">
        {/* Theme */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thème</p>
          </div>
          <div className="px-5 py-5">
            <div className="flex gap-3">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 rounded border py-3 text-sm font-medium transition-colors ${
                    theme === t
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "light" ? "☀️ Clair" : t === "dark" ? "🌙 Sombre" : "💻 Système"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Le mode sombre est en cours de développement.
            </p>
          </div>
        </div>

        {/* Density */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Densité</p>
          </div>
          <div className="px-5 py-5 space-y-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-3 rounded p-3 ${density === d ? "bg-primary-50 ring-1 ring-primary-300" : "hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="density"
                  value={d}
                  checked={density === d}
                  onChange={() => setDensity(d)}
                  className="h-4 w-4 accent-primary-600"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {d === "compact" ? "Compact" : d === "comfortable" ? "Confortable" : "Spacieux"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d === "compact"
                      ? "Plus d'éléments visibles"
                      : d === "comfortable"
                        ? "Équilibre entre densité et lisibilité"
                        : "Plus d'espace entre les éléments"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Langue de l&apos;interface
            </p>
          </div>
          <div className="px-5 py-5">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
              className="h-9 w-full max-w-xs border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm">Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
