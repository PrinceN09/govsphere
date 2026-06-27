"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z
  .object({
    token: z.string().min(1, "Token d'invitation requis"),
    password: z.string().min(8, "Minimum 8 caractères").max(128),
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromUrl },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    try {
      const res = await fetch(`${API_URL}/v1/auth/accept-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: values.token.trim(),
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setServerError(body.message ?? "Lien invalide ou expiré.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch {
      setServerError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-green-100 text-green-600 text-2xl">
          ✓
        </div>
        <h2 className="text-lg font-bold text-slate-900">Compte activé !</h2>
        <p className="mt-1 text-sm text-slate-500">
          Votre mot de passe a été défini. Redirection vers la page de connexion…
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Accepter l&apos;invitation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Définissez votre mot de passe pour activer votre compte
        </p>
      </div>

      {serverError && (
        <div className="mb-4">
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
        {!tokenFromUrl && (
          <Input
            label="Token d'invitation"
            placeholder="Collez ici le token reçu par e-mail"
            error={errors.token?.message}
            required
            {...register("token")}
          />
        )}

        <Input
          label="Nouveau mot de passe"
          type="password"
          placeholder="Minimum 8 caractères"
          autoComplete="new-password"
          autoFocus
          error={errors.password?.message}
          required
          {...register("password")}
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          required
          {...register("confirmPassword")}
        />

        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
          Activer mon compte
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/login" className="text-primary-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function SignupJoinPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-slate-500">Chargement…</div>}>
      <JoinForm />
    </Suspense>
  );
}
