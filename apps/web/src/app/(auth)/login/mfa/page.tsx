"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const totpSchema = z.object({
  code: z
    .string()
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code doit être numérique"),
});

const backupSchema = z.object({
  backupCode: z.string().min(8, "Code de secours invalide"),
});

type TotpValues = z.infer<typeof totpSchema>;
type BackupValues = z.infer<typeof backupSchema>;

export default function MfaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeToken = searchParams.get("challengeToken") ?? "";

  const [useBackup, setUseBackup] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const totpForm = useForm<TotpValues>({ resolver: zodResolver(totpSchema) });
  const backupForm = useForm<BackupValues>({ resolver: zodResolver(backupSchema) });

  if (!challengeToken) {
    router.push("/login");
    return null;
  }

  const onTotpSubmit = async (values: TotpValues) => {
    setServerError(null);
    const result = await signIn("mfa", {
      challengeToken,
      code: values.code,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Code incorrect ou expiré.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  const onBackupSubmit = async (values: BackupValues) => {
    setServerError(null);
    const result = await signIn("mfa", {
      challengeToken,
      backupCode: values.backupCode,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Code de secours incorrect.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Vérification en deux étapes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {useBackup
            ? "Entrez un code de secours"
            : "Entrez le code de votre application d'authentification"}
        </p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
          {serverError}
        </div>
      )}

      {!useBackup ? (
        <form onSubmit={totpForm.handleSubmit(onTotpSubmit)} noValidate className="space-y-4">
          <Input
            label="Code à 6 chiffres"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            error={totpForm.formState.errors.code?.message}
            required
            {...totpForm.register("code")}
          />

          <Button
            type="submit"
            className="w-full"
            loading={totpForm.formState.isSubmitting}
          >
            {totpForm.formState.isSubmitting ? "Vérification…" : "Vérifier"}
          </Button>

          <button
            type="button"
            onClick={() => { setUseBackup(true); setServerError(null); }}
            className="w-full text-center text-sm text-primary-600 hover:underline"
          >
            Utiliser un code de secours
          </button>
        </form>
      ) : (
        <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} noValidate className="space-y-4">
          <Input
            label="Code de secours"
            placeholder="xxxxxxxx"
            autoFocus
            error={backupForm.formState.errors.backupCode?.message}
            required
            {...backupForm.register("backupCode")}
          />

          <Button
            type="submit"
            className="w-full"
            loading={backupForm.formState.isSubmitting}
          >
            {backupForm.formState.isSubmitting ? "Vérification…" : "Vérifier"}
          </Button>

          <button
            type="button"
            onClick={() => { setUseBackup(false); setServerError(null); }}
            className="w-full text-center text-sm text-primary-600 hover:underline"
          >
            Utiliser l&apos;application
          </button>
        </form>
      )}
    </div>
  );
}
