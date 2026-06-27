"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") ?? "";
  const type = searchParams.get("type") ?? "";

  const isGov = type === "GOVERNMENT";

  return (
    <div className="text-center py-2">
      {/* Icon */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-green-100 text-green-600 text-3xl">
        {isGov ? "⏳" : "✓"}
      </div>

      <h1 className="text-xl font-bold text-slate-900">
        {isGov ? "Demande soumise" : "Espace de travail créé !"}
      </h1>

      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
        {isGov ? (
          <>
            Votre organisation de type <strong>Gouvernement</strong> est en attente de vérification.
            Notre équipe examinera votre demande dans les 24–48 heures. Vous recevrez un e-mail de
            confirmation une fois votre espace activé.
          </>
        ) : (
          <>
            Votre espace de travail{" "}
            {slug ? <strong className="text-slate-700">{slug}</strong> : "a bien été créé"} est
            prêt. Vous pouvez maintenant vous connecter avec votre adresse e-mail et votre mot de
            passe.
          </>
        )}
      </p>

      {!isGov && (
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-block w-full rounded bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-700"
          >
            Se connecter maintenant
          </Link>
        </div>
      )}

      {isGov && (
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-700">
          <p className="font-semibold mb-1">Prochaines étapes</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Vérifiez votre boîte e-mail pour la confirmation</li>
            <li>Notre équipe valide votre organisation gouvernementale</li>
            <li>Vous recevrez les accès dès validation</li>
          </ol>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/signup" className="hover:underline">
          ← Créer un autre espace
        </Link>
      </p>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-slate-500">Chargement…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
