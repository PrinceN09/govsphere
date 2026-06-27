"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api";

import type { AxiosError } from "axios";

const schema = z.object({
  credential: z.string().min(1, "Identifiant requis"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await apiClient.post("/v1/auth/forgot-password", { credential: values.credential });
      setSent(true);
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 429) {
        setServerError("Trop de tentatives. Veuillez patienter avant de réessayer.");
      } else {
        // Show success even on error (security: don't reveal if account exists)
        setSent(true);
      }
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-success-200 bg-success-50">
          <svg
            className="h-6 w-6 text-green-600"
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
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Lien envoyé</h2>
        <p className="mt-2 text-sm text-slate-500">
          Si un compte existe avec cet identifiant, un e-mail de réinitialisation a été envoyé.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Réinitialiser le mot de passe
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Entrez votre e-mail, nom d&apos;utilisateur ou identifiant employé pour recevoir un lien
          de réinitialisation
        </p>
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
          label="E-mail, nom d'utilisateur ou identifiant employé"
          placeholder="john@organisation.com, jean.dupont ou EMP-001"
          autoComplete="username"
          autoFocus
          error={errors.credential?.message}
          required
          {...register("credential")}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Envoi en cours…" : "Envoyer le lien"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-primary-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
