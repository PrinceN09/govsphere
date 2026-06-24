"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata = undefined;

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
      if (result.url?.includes("mfa-pending")) {
        router.push(result.url);
        return;
      }
      setServerError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES["Default"]!);
      return;
    }

    if (result.url?.includes("/login/mfa")) {
      router.push(result.url);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Plateforme de Collaboration Gouvernementale</p>
      </div>

      {serverError && (
        <div className="mb-5">
          <Alert variant="danger">{serverError}</Alert>
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        noValidate
        className="space-y-4"
      >
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
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          required
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
          Se connecter
        </Button>
      </form>
    </div>
  );
}
