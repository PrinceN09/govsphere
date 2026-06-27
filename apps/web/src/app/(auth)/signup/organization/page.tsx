"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const ORG_TYPE_OPTIONS = [
  { value: "ENTERPRISE", label: "Entreprise" },
  { value: "GOVERNMENT", label: "Gouvernement / Institution publique" },
  { value: "EDUCATION", label: "Éducation (université, école)" },
  { value: "HEALTHCARE", label: "Santé (hôpital, clinique)" },
  { value: "NGO", label: "ONG / Association" },
  { value: "CHURCH", label: "Église / Communauté religieuse" },
  { value: "NON_PROFIT", label: "Organisation à but non lucratif" },
  { value: "OTHER", label: "Autre" },
];

const schema = z
  .object({
    orgName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
    orgType: z.string().min(1, "Sélectionnez un type d'organisation"),
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    workEmail: z.string().email("Adresse e-mail invalide").max(255),
    firstName: z.string().min(1, "Prénom requis").max(100),
    lastName: z.string().min(1, "Nom requis").max(100),
    password: z.string().min(8, "Minimum 8 caractères").max(128),
    confirmPassword: z.string().min(1, "Confirmation requise"),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "Vous devez accepter les conditions d'utilisation",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export default function SignupOrganizationPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [govWarning, setGovWarning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptTerms: false },
  });

  // Show gov warning whenever they pick GOVERNMENT
  const handleOrgTypeChange = (v: string) => {
    setGovWarning(v === "GOVERNMENT");
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    try {
      const res = await fetch(`${API_URL}/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: values.orgName,
          orgType: values.orgType,
          country: values.country,
          city: values.city,
          workEmail: values.workEmail,
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          confirmPassword: values.confirmPassword,
          acceptTerms: values.acceptTerms,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setServerError(body.message ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const data = (await res.json()) as { workspaceSlug: string };
      router.push(`/signup/success?slug=${data.workspaceSlug}&type=${values.orgType}`);
    } catch {
      setServerError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Créer votre espace de travail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Informations sur votre organisation et votre compte administrateur
        </p>
      </div>

      {serverError && (
        <div className="mb-4">
          <Alert variant="danger">{serverError}</Alert>
        </div>
      )}

      {govWarning && (
        <div className="mb-4">
          <Alert variant="warning">
            Les organisations gouvernementales nécessitent une vérification manuelle par notre
            équipe avant activation. Votre espace sera créé en statut{" "}
            <strong>En attente de vérification</strong>.
          </Alert>
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        noValidate
        className="space-y-4"
      >
        {/* Organisation */}
        <fieldset className="space-y-3 rounded border border-slate-100 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Organisation
          </legend>

          <Input
            label="Nom de l'organisation"
            placeholder="Ministère des Finances, Prinodia Tech, Hôpital Central…"
            error={errors.orgName?.message}
            required
            {...register("orgName")}
          />

          <Select
            label="Type d'organisation"
            error={errors.orgType?.message}
            required
            placeholder="Sélectionner…"
            options={ORG_TYPE_OPTIONS}
            {...register("orgType", {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                handleOrgTypeChange(e.target.value);
              },
            })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pays"
              placeholder="Congo (RDC)"
              error={errors.country?.message}
              {...register("country")}
            />
            <Input
              label="Ville"
              placeholder="Kinshasa"
              error={errors.city?.message}
              {...register("city")}
            />
          </div>
        </fieldset>

        {/* Admin account */}
        <fieldset className="space-y-3 rounded border border-slate-100 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Compte administrateur
          </legend>

          <Input
            label="E-mail professionnel"
            type="email"
            placeholder="admin@organisation.com"
            autoComplete="email"
            error={errors.workEmail?.message}
            required
            {...register("workEmail")}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              placeholder="Jean"
              autoComplete="given-name"
              error={errors.firstName?.message}
              required
              {...register("firstName")}
            />
            <Input
              label="Nom"
              placeholder="Dupont"
              autoComplete="family-name"
              error={errors.lastName?.message}
              required
              {...register("lastName")}
            />
          </div>

          <Input
            label="Mot de passe"
            type="password"
            placeholder="Minimum 8 caractères"
            autoComplete="new-password"
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
        </fieldset>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input
            id="acceptTerms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            {...register("acceptTerms")}
          />
          <label htmlFor="acceptTerms" className="text-xs text-slate-600">
            J&apos;accepte les{" "}
            <a href="#" className="text-primary-600 hover:underline">
              Conditions d&apos;utilisation
            </a>{" "}
            et la{" "}
            <a href="#" className="text-primary-600 hover:underline">
              Politique de confidentialité
            </a>{" "}
            de Prinodia Workspace.
          </label>
        </div>
        {errors.acceptTerms && <p className="text-xs text-red-600">{errors.acceptTerms.message}</p>}

        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
          Créer l&apos;espace de travail
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/signup" className="text-primary-600 hover:underline">
          ← Retour
        </Link>{" "}
        · Déjà un compte ?{" "}
        <Link href="/login" className="text-primary-600 hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
