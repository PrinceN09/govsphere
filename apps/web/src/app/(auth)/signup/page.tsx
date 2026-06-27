import Link from "next/link";

export default function SignupLandingPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Commencer avec Prinodia</h1>
        <p className="mt-1 text-sm text-slate-500">Choisissez comment rejoindre la plateforme</p>
      </div>

      <div className="space-y-3">
        {/* Create workspace */}
        <Link
          href="/signup/organization"
          className="group flex w-full items-start gap-4 rounded border border-slate-200 p-4 text-left transition-colors hover:border-primary-500 hover:bg-primary-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary-100 text-primary-700 text-lg font-bold">
            +
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-700">
              Créer un espace de travail
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Pour votre gouvernement, entreprise, école, hôpital, ONG ou association
            </p>
          </div>
        </Link>

        {/* Join with invite */}
        <Link
          href="/signup/join"
          className="group flex w-full items-start gap-4 rounded border border-slate-200 p-4 text-left transition-colors hover:border-primary-500 hover:bg-primary-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-slate-500 text-lg font-bold">
            ✉
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-700">
              Rejoindre via une invitation
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Vous avez reçu un lien d&apos;invitation par e-mail
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-primary-600 hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
