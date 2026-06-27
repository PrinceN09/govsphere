"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "gold";
type WorkloadStatus = "NOT_ASSIGNED" | "AVAILABLE" | "NORMAL" | "BUSY" | "OVERLOADED";
type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";
type SkillCategory = "TECHNICAL" | "DOMAIN" | "SOFT" | "LANGUAGE" | "CERTIFICATION";

interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
}

interface EmployeeSkill {
  id: string;
  level: SkillLevel;
  verified: boolean;
  skill: Skill;
}

interface EmployeeProfile {
  id: string;
  bio: string | null;
  officeLocation: string | null;
  timeZone: string;
  workloadStatus: WorkloadStatus;
  vacationStatus: string | null;
  vacationFrom: string | null;
  vacationUntil: string | null;
  availabilityNote: string | null;
  languages: Array<{ code: string; level: string }>;
  orgNode: { id: string; name: string; type: string } | null;
  skills: EmployeeSkill[];
}

interface DirectReport {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
}

interface PersonDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  matriculeNumber: string | null;
  employeeNumber: string | null;
  username: string | null;
  organizationId: string | null;
  createdAt: string;
  employeeProfile: EmployeeProfile | null;
  manager: DirectReport | null;
  subordinates: DirectReport[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORKLOAD_LABELS: Record<WorkloadStatus, string> = {
  NOT_ASSIGNED: "Non assigné",
  AVAILABLE: "Disponible",
  NORMAL: "Normal",
  BUSY: "Occupé",
  OVERLOADED: "Surchargé",
};

const WORKLOAD_BADGE: Record<WorkloadStatus, BadgeVariant> = {
  NOT_ASSIGNED: "gray",
  AVAILABLE: "green",
  NORMAL: "green",
  BUSY: "yellow",
  OVERLOADED: "red",
};

const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  EXPERT: "Expert",
};

const CAT_LABELS: Record<SkillCategory, string> = {
  TECHNICAL: "Technique",
  DOMAIN: "Domaine",
  SOFT: "Soft skill",
  LANGUAGE: "Langue",
  CERTIFICATION: "Certification",
};

function getDisplayName(p: Pick<PersonDetail, "displayName" | "firstName" | "lastName" | "email">) {
  return p.displayName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || p.email);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

// ─── Tab sub-components ───────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: EmployeeProfile | null }) {
  if (!profile) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        Aucun profil étendu créé pour ce collaborateur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {profile.bio && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Biographie
          </h3>
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted text-xs">Unité organisationnelle</span>
          <p className="font-medium">{profile.orgNode?.name ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted text-xs">Bureau</span>
          <p className="font-medium">{profile.officeLocation ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted text-xs">Fuseau horaire</span>
          <p className="font-medium">{profile.timeZone}</p>
        </div>
        <div>
          <span className="text-muted text-xs">Disponibilité</span>
          <div className="mt-0.5">
            <Badge variant={WORKLOAD_BADGE[profile.workloadStatus]}>
              {WORKLOAD_LABELS[profile.workloadStatus]}
            </Badge>
          </div>
        </div>
        {profile.availabilityNote && (
          <div className="col-span-2">
            <span className="text-muted text-xs">Note de disponibilité</span>
            <p className="font-medium">{profile.availabilityNote}</p>
          </div>
        )}
        {profile.vacationFrom && (
          <div className="col-span-2">
            <span className="text-muted text-xs">Congé</span>
            <p className="font-medium">
              {new Date(profile.vacationFrom).toLocaleDateString("fr-FR")}
              {profile.vacationUntil &&
                ` → ${new Date(profile.vacationUntil).toLocaleDateString("fr-FR")}`}
            </p>
          </div>
        )}
      </div>

      {profile.languages.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Langues</h3>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((l, i) => (
              <Badge key={i} variant="blue">
                {l.code.toUpperCase()} — {l.level}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsTab({ skills }: { skills: EmployeeSkill[] }) {
  const grouped = skills.reduce<Partial<Record<SkillCategory, EmployeeSkill[]>>>((acc, s) => {
    const cat = s.skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(s);
    return acc;
  }, {});

  if (skills.length === 0) {
    return (
      <div className="py-12 text-center text-muted text-sm">Aucune compétence enregistrée.</div>
    );
  }

  return (
    <div className="space-y-5">
      {(Object.entries(grouped) as [SkillCategory, EmployeeSkill[]][]).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            {CAT_LABELS[cat] ?? cat}
          </h3>
          <div className="flex flex-wrap gap-2">
            {items.map((es) => (
              <div
                key={es.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm bg-surface"
              >
                <span className="font-medium">{es.skill.name}</span>
                <Badge variant="gray">{LEVEL_LABELS[es.level]}</Badge>
                {es.verified && <span className="text-green-600 text-xs font-bold">✓</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({
  manager,
  subordinates,
}: {
  manager: DirectReport | null;
  subordinates: DirectReport[];
}) {
  return (
    <div className="space-y-6">
      {manager && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Responsable
          </h3>
          <Link
            href={`/admin/people/${manager.id}`}
            className="inline-flex items-center gap-3 hover:text-primary"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
              {getInitials(manager.displayName ?? "?")}
            </span>
            <span className="text-sm font-medium">{manager.displayName ?? "—"}</span>
            <Badge variant="blue">{manager.role}</Badge>
          </Link>
        </div>
      )}

      {subordinates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Collaborateurs directs ({subordinates.length})
          </h3>
          <div className="space-y-1">
            {subordinates.map((s) => (
              <Link
                key={s.id}
                href={`/admin/people/${s.id}`}
                className="flex items-center gap-3 hover:text-primary p-2 rounded-md hover:bg-surface-hover"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {getInitials(s.displayName ?? "?")}
                </span>
                <span className="text-sm font-medium">{s.displayName ?? "—"}</span>
                <Badge variant={s.status === "ACTIVE" ? "green" : "gray"}>{s.role}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!manager && subordinates.length === 0 && (
        <div className="py-8 text-center text-muted text-sm">
          Aucune relation hiérarchique configurée.
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["Profil", "Compétences", "Hiérarchie"] as const;
type Tab = (typeof TABS)[number];

export default function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("Profil");

  const { data: person, isLoading } = useQuery<PersonDetail>({
    queryKey: ["people", id],
    queryFn: () => apiGet<PersonDetail>(`/v1/people/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <AdminTopBar title="Chargement…" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-border rounded animate-pulse w-1/3" />
          ))}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-col flex-1">
        <AdminTopBar title="Introuvable" />
        <div className="p-6 text-muted text-sm">Ce profil n&#39;existe pas ou a été supprimé.</div>
      </div>
    );
  }

  const displayName = getDisplayName(person);
  const profile = person.employeeProfile;
  const skills = profile?.skills ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminTopBar
        title={displayName}
        subtitle={person.email}
        actions={
          <Link href="/admin/people">
            <Button variant="secondary" size="sm">
              ← Annuaire
            </Button>
          </Link>
        }
      />

      {/* Hero card */}
      <div className="px-6 py-5 border-b border-border bg-surface flex items-start gap-5">
        {person.avatarUrl ? (
          <Image
            src={person.avatarUrl}
            alt=""
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover shrink-0"
            unoptimized
          />
        ) : (
          <span className="w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-semibold flex items-center justify-center shrink-0">
            {getInitials(displayName)}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">{displayName}</h2>
          <p className="text-sm text-muted">{person.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={person.status === "ACTIVE" ? "green" : "gray"}>{person.status}</Badge>
            <Badge variant="blue">{person.role}</Badge>
            {person.matriculeNumber && <Badge variant="gray">Mat. {person.matriculeNumber}</Badge>}
            {profile && (
              <Badge variant={WORKLOAD_BADGE[profile.workloadStatus]}>
                {WORKLOAD_LABELS[profile.workloadStatus]}
              </Badge>
            )}
          </div>
        </div>

        <div className="hidden lg:flex gap-6 text-sm">
          {person.phone && (
            <div className="text-right">
              <span className="text-muted text-xs block">Téléphone</span>
              <span className="font-medium">{person.phone}</span>
            </div>
          )}
          {profile?.officeLocation && (
            <div className="text-right">
              <span className="text-muted text-xs block">Bureau</span>
              <span className="font-medium">{profile.officeLocation}</span>
            </div>
          )}
          {profile?.orgNode && (
            <div className="text-right">
              <span className="text-muted text-xs block">Unité</span>
              <span className="font-medium">{profile.orgNode.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "Compétences" && skills.length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                {skills.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "Profil" && <ProfileTab profile={profile} />}
        {activeTab === "Compétences" && <SkillsTab skills={skills} />}
        {activeTab === "Hiérarchie" && (
          <ReportsTab manager={person.manager} subordinates={person.subordinates} />
        )}
      </div>
    </div>
  );
}
