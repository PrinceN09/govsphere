"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api";

import type { AxiosError } from "axios";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères")
      .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
      .regex(/[a-z]/, "Doit contenir au moins une minuscule")
      .regex(/[0-9]/, "Doit contenir au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Doit contenir au moins un caractère spécial"),
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await apiClient.post("/v1/auth/reset-password", {
        token,
        newPassword: values.newPassword,
      });
      setDone(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      const code = axiosErr.response?.data?.error;
      if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") {
        setServerError("Lien de réinitialisation invalide ou expiré.");
      } else {
        setServerError("Une erreur est survenue. Veuillez réessayer.");
      }
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-danger-600">Lien invalide. Veuillez demander un nouveau lien.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-primary-600 hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-success-200 bg-success-50">
          <svg
            className="h-6 w-6 text-success-600"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Mot de passe réinitialisé
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
          ← Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-slate-500">Choisissez un nouveau mot de passe sécurisé</p>
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
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          autoFocus
          error={errors.newPassword?.message}
          hint="Au moins 12 caractères, majuscule, chiffre et caractère spécial"
          required
          {...register("newPassword")}
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          required
          {...register("confirmPassword")}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
