"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const metadata = undefined; // metadata lives in layout

const schema = z.object({
  credential: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormValues = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Identifiant ou mot de passe incorrect.",
  AccountLocked: "Compte temporairement verrouillé. Réessayez dans 30 minutes.",
  AccountInactive: "Ce compte est désactivé. Contactez l'administrateur.",
  SessionExpired: "Votre session a expiré. Veuillez vous reconnecter.",
  Default: "Une erreur est survenue. Veuillez réessayer.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [serverError, setServerError] = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES["Default"]!) : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const result = await signIn("credentials", {
      credential: values.credential,
      password: values.password,
      redirect: false,
    });

    if (!result) {
      setServerError(ERROR_MESSAGES["Default"]!);
      return;
    }

    if (result.error) {
      // Check for MFA-required signal encoded in the error URL
      // next-auth encodes the error in the URL as ?error=...
      if (result.url?.includes("mfa-pending")) {
        // Extract challengeToken from the URL — it's in the error query param
        // The MFA redirect is handled by the middleware on the next navigation
        router.push(result.url);
        return;
      }
      setServerError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES["Default"]!);
      return;
    }

    // Check if we ended up on the MFA page (middleware redirect)
    if (result.url?.includes("/login/mfa")) {
      router.push(result.url);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Connexion</h1>
        <p className="mt-1 text-sm text-gray-500">
          Plateforme de Collaboration Gouvernementale — RDC
        </p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Matricule ou adresse e-mail"
          placeholder="1.641.558 ou nom@gouv.cd"
          autoComplete="username"
          autoFocus
          error={errors.credential?.message}
          required
          {...register("credential")}
        />

        <Input
          label="Mot de passe"
          type="password"
          placeholder="Entrez votre mot de passe"
          autoComplete="current-password"
          error={errors.password?.message}
          required
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
        >
          {isSubmitting ? "Connexion en cours…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
