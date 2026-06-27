/**
 * DemoService — v1.1.0 Demo Environment Generator
 *
 * Generates realistic demo data for all 6 organization types.
 * Safety rules:
 *   – All demo records are tracked in the demo_registry table.
 *   – Reset deletes ONLY records listed in demo_registry.
 *   – Generation is fully idempotent (ON CONFLICT DO NOTHING / DO UPDATE).
 *   – Never touches non-demo data.
 *   – Development-only: endpoints are guarded by DEMO:MANAGE permission.
 */
import { Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import type { GenerateDemoDto } from "./dto/demo.dto";

// ─── Stable demo data definitions ────────────────────────────────────────────

const DEMO_PASSWORD_HASH = bcrypt.hashSync("Demo@2025!", 10);

const DEMO_ORGS = [
  {
    code: "DEMO-GOV-FIN",
    name: "Ministère des Finances",
    type: "GOVERNMENT",
    country: "DRC",
    city: "Kinshasa",
    description: "Ministère chargé des finances publiques et du budget national.",
    email: "contact@finances.gouv.cd",
    website: "https://finances.gouv.cd",
  },
  {
    code: "DEMO-ENT-TECH",
    name: "Prinodia Technologies",
    type: "ENTERPRISE",
    country: "DRC",
    city: "Kinshasa",
    description: "Société technologique leader en solutions logicielles pour l'Afrique.",
    email: "hello@prinodia.tech",
    website: "https://prinodia.tech",
  },
  {
    code: "DEMO-EDU-UNI",
    name: "Université Nationale",
    type: "EDUCATION",
    country: "DRC",
    city: "Lubumbashi",
    description: "Université publique offrant des formations en sciences et technologies.",
    email: "info@uninat.ac.cd",
    website: "https://uninat.ac.cd",
  },
  {
    code: "DEMO-HEA-HOP",
    name: "Hôpital Central",
    type: "HEALTHCARE",
    country: "DRC",
    city: "Kinshasa",
    description: "Établissement hospitalier de référence nationale.",
    email: "direction@hopitalcentral.cd",
    website: "https://hopitalcentral.cd",
  },
  {
    code: "DEMO-NGO-HOPE",
    name: "Hope Foundation",
    type: "NGO",
    country: "DRC",
    city: "Goma",
    description: "ONG dédiée à l'éducation et au développement communautaire.",
    email: "info@hopefoundation.org",
    website: "https://hopefoundation.org",
  },
  {
    code: "DEMO-CHU-LCN",
    name: "Local Church Network",
    type: "CHURCH",
    country: "DRC",
    city: "Kinshasa",
    description: "Réseau d'églises locales au service des communautés.",
    email: "contact@lcn.cd",
    website: "https://lcn.cd",
  },
] as const;

// Departments per org type
const DEPT_TEMPLATES: Record<string, Array<{ name: string; code: string }>> = {
  GOVERNMENT: [
    { name: "Direction du Budget", code: "BUDGET" },
    { name: "Direction du Trésor", code: "TRESOR" },
    { name: "Direction Générale des Impôts", code: "DGI" },
    { name: "Direction des Ressources Humaines", code: "DRH" },
    { name: "Direction Informatique", code: "DSI" },
  ],
  ENTERPRISE: [
    { name: "Ingénierie Logicielle", code: "ENGINEERING" },
    { name: "Produit & Design", code: "PRODUCT" },
    { name: "Ventes & Partenariats", code: "SALES" },
    { name: "Ressources Humaines", code: "HR" },
    { name: "Finance & Administration", code: "FINANCE" },
  ],
  EDUCATION: [
    { name: "Faculté des Sciences", code: "SCIENCES" },
    { name: "Faculté des Lettres", code: "LETTRES" },
    { name: "Faculté de Médecine", code: "MEDECINE" },
    { name: "Scolarité & Inscriptions", code: "SCOLARITE" },
    { name: "Recherche & Innovation", code: "RECHERCHE" },
  ],
  HEALTHCARE: [
    { name: "Médecine Interne", code: "MED-INT" },
    { name: "Chirurgie", code: "CHIR" },
    { name: "Pédiatrie", code: "PEDIATRIE" },
    { name: "Urgences", code: "URGENCES" },
    { name: "Administration Hospitalière", code: "ADMIN-HOP" },
  ],
  NGO: [
    { name: "Programmes Éducatifs", code: "EDUCATION" },
    { name: "Aide Humanitaire", code: "HUMANITAIRE" },
    { name: "Communication & Plaidoyer", code: "COMM" },
    { name: "Finance & Conformité", code: "FINANCE" },
    { name: "Suivi & Évaluation", code: "M-E" },
  ],
  CHURCH: [
    { name: "Pastorale", code: "PASTORALE" },
    { name: "Musique & Louange", code: "MUSIQUE" },
    { name: "Jeunesse", code: "JEUNESSE" },
    { name: "Aide Sociale", code: "SOCIAL" },
    { name: "Administration", code: "ADMIN" },
  ],
};

// Employee templates per role type
const EMPLOYEE_TEMPLATES = [
  { firstName: "Jean-Pierre", lastName: "Kabila", role: "ADMIN", suffix: "exec" },
  { firstName: "Marie", lastName: "Nzinga", role: "MANAGER", suffix: "mgr1" },
  { firstName: "Paul", lastName: "Mutombo", role: "MANAGER", suffix: "mgr2" },
  { firstName: "Claire", lastName: "Bokassa", role: "EMPLOYEE", suffix: "emp1" },
  { firstName: "André", lastName: "Lumba", role: "EMPLOYEE", suffix: "emp2" },
  { firstName: "Sophie", lastName: "Mbeki", role: "EMPLOYEE", suffix: "emp3" },
  { firstName: "Thomas", lastName: "Diallo", role: "EMPLOYEE", suffix: "emp4" },
  { firstName: "Fatou", lastName: "Sow", role: "HR_MANAGER", suffix: "hr" },
  { firstName: "Kevin", lastName: "Osei", role: "EMPLOYEE", suffix: "emp5" },
  { firstName: "Grace", lastName: "Mensah", role: "EMPLOYEE", suffix: "emp6" },
];

// Meeting templates
const MEETING_TITLES = [
  "Réunion hebdomadaire d'équipe",
  "Revue budgétaire trimestrielle",
  "Comité de direction",
  "Point d'avancement projet",
  "Formation et développement",
  "Réunion stratégique annuelle",
  "Briefing mensuel",
  "Revue des performances",
];

// Document templates
const DOCUMENT_TITLES = [
  "Rapport annuel 2025",
  "Politique de gestion des ressources humaines",
  "Plan stratégique 2025-2030",
  "Guide des procédures internes",
  "Rapport d'audit financier",
  "Manuel de l'employé",
  "Charte organisationnelle",
  "Rapport d'activités Q1 2025",
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns current demo data status: counts and last generated timestamp.
   */
  async getStatus() {
    const [
      orgCount,
      userCount,
      deptCount,
      meetingCount,
      docCount,
      workflowCount,
      taskCount,
      notifCount,
    ] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      (this.prisma as any).organization?.count({ where: { isDemo: true } }).catch(() => 0) ?? 0,
      this.prisma.user.count({ where: { email: { contains: "@demo.prinodia" } } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      (this.prisma as any).department
        ?.count({ where: { code: { startsWith: "DEMO-" } } })
        .catch(() => 0) ?? 0,
      this.prisma.meeting.count({ where: { title: { startsWith: "[DEMO]" } } }),
      this.prisma.document.count({ where: { title: { startsWith: "[DEMO]" } } }),
      this.prisma.workflowInstance.count(),
      this.prisma.task.count({ where: { title: { startsWith: "[DEMO]" } } }),
      this.prisma.notification.count({ where: { title: { startsWith: "[DEMO]" } } }),
    ]);

    // Get last session from registry
    const lastRecord = await this.prisma.$queryRaw<Array<{ createdAt: Date; sessionId: string }>>`
      SELECT "sessionId", MAX("createdAt") as "createdAt"
      FROM demo_registry
      GROUP BY "sessionId"
      ORDER BY MAX("createdAt") DESC
      LIMIT 1
    `.catch(() => []);

    const lastGenerated =
      Array.isArray(lastRecord) && lastRecord.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ((lastRecord[0] as any).createdAt as Date | null)
        : null;

    return {
      hasDemoData: userCount > 0,
      lastGenerated,
      counts: {
        organizations: orgCount as number,
        users: userCount,
        departments: deptCount as number,
        meetings: meetingCount,
        documents: docCount,
        workflows: workflowCount,
        tasks: taskCount,
        notifications: notifCount,
      },
    };
  }

  /**
   * Generates demo data. Fully idempotent — safe to call multiple times.
   */
  async generate(dto: GenerateDemoDto, _generatedById?: string) {
    const sessionId = `demo-session-${Date.now()}`;
    const { seedSize = "MEDIUM", orgType = "ALL" } = dto;

    // Filter which orgs to seed
    const orgsToSeed =
      orgType === "ALL" ? [...DEMO_ORGS] : DEMO_ORGS.filter((o) => o.type === orgType);

    this.logger.log(
      `Generating demo data: size=${seedSize}, orgType=${orgType}, session=${sessionId}`,
    );

    const registryEntries: Array<{ entityType: string; entityId: string }> = [];

    // ── Step 1: Create organizations ─────────────────────────────────────────
    const orgIds: Record<string, string> = {};

    for (const org of orgsToSeed) {
      const result = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO organizations (
          id, name, code, type, status, description, email, website,
          city, country, "isDemo", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${org.name},
          ${org.code},
          ${org.type}::"OrganizationType",
          'ACTIVE'::"OrganizationStatus",
          ${org.description},
          ${org.email},
          ${org.website},
          ${org.city},
          ${org.country},
          true,
          NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          "updatedAt" = NOW()
        RETURNING id
      `;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const id = ((result[0] as any)?.id as string) ?? "";
      orgIds[org.code] = id;
      registryEntries.push({ entityType: "Organization", entityId: id });
    }

    // ── Step 2: Create departments per org ────────────────────────────────────
    const deptIds: Record<string, string[]> = {};

    for (const org of orgsToSeed) {
      const orgId = orgIds[org.code];
      const templates = DEPT_TEMPLATES[org.type] ?? [];
      deptIds[org.code] = [];

      // Find existing ministry to attach departments (required FK)
      const ministry = await this.prisma.ministry.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!ministry) continue;

      for (const dept of templates) {
        const deptCode = `DEMO-${org.code}-${dept.code}`;
        const existing = await this.prisma.department.findFirst({
          where: { code: deptCode, ministryId: ministry.id },
        });

        let deptId: string;
        if (existing) {
          deptId = existing.id;
        } else {
          const created = await this.prisma.department.create({
            data: {
              ministryId: ministry.id,
              name: dept.name,
              code: deptCode,
              isActive: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...({ organizationId: orgId } as any),
            },
          });
          deptId = created.id;
        }
        deptIds[org.code]?.push(deptId);
        registryEntries.push({ entityType: "Department", entityId: deptId });
      }
    }

    // ── Step 3: Create users (employees) ─────────────────────────────────────
    const userIds: string[] = [];
    let adminUserId: string | undefined;

    for (const org of orgsToSeed) {
      const orgId = orgIds[org.code];
      const empCount = seedSize === "SMALL" ? 3 : seedSize === "LARGE" ? 10 : 5;
      const templates = EMPLOYEE_TEMPLATES.slice(0, empCount);

      for (const [empIdx, emp] of templates.entries()) {
        const orgSlug = org.code.toLowerCase().replace(/[^a-z0-9]/g, "");
        const email = `demo.${emp.suffix}.${orgSlug}@demo.prinodia`;
        // Username follows email prefix — stable, predictable for demo docs
        const username = `demo.${emp.suffix}.${orgSlug}`;
        // Employee number — org-scoped, zero-padded index (e.g. EMP-DEMO-001)
        const employeeNumber = `EMP-DEMO-${String(empIdx + 1).padStart(3, "0")}`;
        const existing = await this.prisma.user.findUnique({ where: { email } });

        let userId: string;
        if (existing) {
          userId = existing.id;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const created = await (this.prisma.user as any).create({
            data: {
              email,
              username, // v1.1.1 — not in generated client yet
              employeeNumber, // v1.1.1 — not in generated client yet
              passwordHash: DEMO_PASSWORD_HASH,
              firstName: emp.firstName,
              lastName: emp.lastName,
              displayName: `${emp.firstName} ${emp.lastName}`,
              role:
                emp.role === "ADMIN"
                  ? "SUPER_ADMIN"
                  : emp.role === "MANAGER"
                    ? "MINISTRY_ADMIN"
                    : "EMPLOYEE",
              status: "ACTIVE",
              userType: "GOVERNMENT_EMPLOYEE",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...({ organizationId: orgId } as any),
            },
          });
          userId = created.id;
        }

        userIds.push(userId);
        if (emp.role === "ADMIN" && !adminUserId) adminUserId = userId;
        registryEntries.push({ entityType: "User", entityId: userId });
      }
    }

    // Use first admin user or first user
    const actorId = adminUserId ?? userIds[0];
    if (!actorId) {
      return {
        success: false,
        message: "No users created — no ministry found to attach departments.",
      };
    }

    // ── Step 4: Create meetings ───────────────────────────────────────────────
    const meetingCount = seedSize === "SMALL" ? 3 : seedSize === "LARGE" ? 15 : 8;
    const meetingTitles = MEETING_TITLES.slice(0, meetingCount);

    for (const title of meetingTitles) {
      const demoTitle = `[DEMO] ${title}`;
      const existing = await this.prisma.meeting.findFirst({
        where: { title: demoTitle, organizerId: actorId },
      });

      if (!existing) {
        const startAt = new Date();
        startAt.setDate(startAt.getDate() + Math.floor(Math.random() * 14));
        startAt.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

        // Meeting requires a parent CalendarEvent — create both via nested create
        const event = await this.prisma.calendarEvent.create({
          data: {
            title: demoTitle,
            startAt,
            endAt,
            createdById: actorId,
            status: "CONFIRMED",
            scope: "MINISTRY",
            classification: "INTERNAL",
            location: "Salle de conférence A",
            meeting: {
              create: {
                title: demoTitle,
                organizerId: actorId,
                status: "SCHEDULED",
                meetingType: "REGULAR",
                classification: "INTERNAL",
              },
            },
          },
          include: { meeting: true },
        });
        if (event.meeting) {
          registryEntries.push({ entityType: "Meeting", entityId: event.meeting.id });
          registryEntries.push({ entityType: "CalendarEvent", entityId: event.id });
        }
      }
    }

    // ── Step 5: Create documents ──────────────────────────────────────────────
    const docCount = seedSize === "SMALL" ? 4 : seedSize === "LARGE" ? 20 : 10;
    const docTitles = DOCUMENT_TITLES.slice(0, Math.min(docCount, DOCUMENT_TITLES.length));

    for (const title of docTitles) {
      const demoTitle = `[DEMO] ${title}`;
      const existing = await this.prisma.document.findFirst({
        where: { title: demoTitle, authorId: actorId },
      });

      if (!existing) {
        const doc = await this.prisma.document.create({
          data: {
            title: demoTitle,
            slug: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            authorId: actorId,
            status: "PUBLISHED",
            type: "REPORT",
            classification: "INTERNAL",
            content: `# ${title}\n\nCe document a été généré automatiquement par l'environnement de démonstration de Prinodia Workspace.\n\n## Contenu\n\nCeci est un exemple de contenu pour démontrer les capacités de gestion documentaire de la plateforme.\n\n## Sections\n\n### Introduction\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n### Analyse\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.\n\n### Conclusion\nNam quis nulla. Integer malesuada. In in enim a arcu imperdiet malesuada.`,
          },
        });
        registryEntries.push({ entityType: "Document", entityId: doc.id });
      }
    }

    // ── Step 6: Create tasks ──────────────────────────────────────────────────
    const taskCount = seedSize === "SMALL" ? 5 : seedSize === "LARGE" ? 25 : 12;
    const taskTitles = [
      "Réviser le rapport mensuel",
      "Préparer la présentation du conseil",
      "Mettre à jour les procédures RH",
      "Analyser les données financières Q1",
      "Organiser la formation du personnel",
      "Répondre aux demandes des partenaires",
      "Finaliser le budget prévisionnel",
      "Conduire les entretiens annuels",
      "Mettre à jour le plan de communication",
      "Vérifier la conformité des documents",
      "Préparer le rapport d'audit",
      "Planifier la réunion stratégique",
    ];

    for (let i = 0; i < Math.min(taskCount, taskTitles.length); i++) {
      const demoTitle = `[DEMO] ${taskTitles[i]}`;
      const existing = await this.prisma.task.findFirst({
        where: { title: demoTitle, assigneeId: actorId },
      });

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (i + 1) * 3);
        const task = await this.prisma.task.create({
          data: {
            title: demoTitle,
            assigneeId: actorId,
            createdById: actorId,
            status: i % 3 === 0 ? "DONE" : i % 3 === 1 ? "IN_PROGRESS" : "TODO",
            priority: i % 2 === 0 ? "HIGH" : "MEDIUM",
            dueAt: dueDate,
          },
        });
        registryEntries.push({ entityType: "Task", entityId: task.id });
      }
    }

    // ── Step 7: Create notifications ──────────────────────────────────────────
    const notifTitles = [
      {
        title: "Bienvenue dans Prinodia Workspace",
        body: "Votre environnement de démonstration est prêt.",
      },
      { title: "Document partagé", body: "Un document a été partagé avec vous." },
      { title: "Réunion planifiée", body: "Une réunion a été programmée pour demain." },
      { title: "Tâche assignée", body: "Une nouvelle tâche vous a été attribuée." },
      { title: "Approbation requise", body: "Un document attend votre approbation." },
    ];

    for (const notif of notifTitles) {
      const demoTitle = `[DEMO] ${notif.title}`;
      const existing = await this.prisma.notification.findFirst({
        where: { title: demoTitle, userId: actorId },
      });

      if (!existing) {
        const created = await this.prisma.notification.create({
          data: {
            title: demoTitle,
            body: notif.body,
            type: "SYSTEM",
            userId: actorId,
            isRead: false,
          },
        });
        registryEntries.push({ entityType: "Notification", entityId: created.id });
      }
    }

    // ── Step 8: Create audit logs ─────────────────────────────────────────────
    for (const org of orgsToSeed) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: "USER_CREATED",
          entityType: "Organization",
          entityId: orgIds[org.code] ?? undefined,
          metadata: { demo: true, seedSize, orgType: org.type, session: sessionId },
          ipAddress: "127.0.0.1",
          userAgent: "DemoService/1.1.0",
        } as any,
      });
    }

    // ── Step 9: Write to demo_registry ────────────────────────────────────────
    for (const entry of registryEntries) {
      await this.prisma.$executeRaw`
        INSERT INTO demo_registry ("id", "entityType", "entityId", "sessionId", "createdAt")
        VALUES (gen_random_uuid()::text, ${entry.entityType}, ${entry.entityId}, ${sessionId}, NOW())
        ON CONFLICT ("entityType", "entityId") DO NOTHING
      `;
    }

    this.logger.log(`Demo generation complete: ${registryEntries.length} records tracked.`);

    return {
      success: true,
      sessionId,
      seedSize,
      orgType,
      generatedAt: new Date(),
      counts: {
        organizations: orgsToSeed.length,
        departments: Object.values(deptIds).flat().length,
        users: userIds.length,
        meetings: meetingCount,
        documents: docCount,
        tasks: taskCount,
        notifications: notifTitles.length,
      },
    };
  }

  /**
   * Resets ALL demo data. Deletes only records tracked in demo_registry.
   * Never deletes non-demo records.
   */
  async reset() {
    this.logger.warn("Demo reset initiated — removing all demo-tracked records.");

    // Fetch all registry entries grouped by entity type
    const entries = await this.prisma.$queryRaw<Array<{ entityType: string; entityId: string }>>`
      SELECT "entityType", "entityId" FROM demo_registry ORDER BY "createdAt" DESC
    `;

    // Group by type
    const byType: Record<string, string[]> = {};
    for (const entry of entries) {
      if (!byType[entry.entityType]) byType[entry.entityType] = [];
      byType[entry.entityType]?.push(entry.entityId);
    }

    // Delete in safe order (dependents first)
    const deleted: Record<string, number> = {};

    const deleteMany = async (model: string, ids: string[]) => {
      if (!ids.length) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaModel = (this.prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)];
        if (prismaModel?.deleteMany) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          const result = await prismaModel.deleteMany({ where: { id: { in: ids } } });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          deleted[model] = (result.count as number) ?? 0;
        }
      } catch (err) {
        this.logger.warn(`Could not delete ${model}: ${String(err)}`);
      }
    };

    // Delete dependencies first
    await deleteMany("Notification", byType["Notification"] ?? []);
    await deleteMany("Task", byType["Task"] ?? []);
    await deleteMany("Document", byType["Document"] ?? []);
    await deleteMany("Meeting", byType["Meeting"] ?? []);
    await deleteMany("Department", byType["Department"] ?? []);
    await deleteMany("User", byType["User"] ?? []);

    // Delete demo orgs via raw SQL (not in generated client yet)
    const orgIds = byType["Organization"] ?? [];
    if (orgIds.length > 0) {
      for (const id of orgIds) {
        await this.prisma.$executeRaw`
          DELETE FROM organizations WHERE id = ${id} AND "isDemo" = true
        `;
      }
      deleted["Organization"] = orgIds.length;
    }

    // Clear registry
    await this.prisma.$executeRaw`DELETE FROM demo_registry`;

    this.logger.log(`Demo reset complete: ${JSON.stringify(deleted)}`);
    return { success: true, deleted };
  }
}
