/**
 * Prinodia Workspace — Database Seed
 * Seeds the default roles and permissions for the identity platform.
 * Run with: npx prisma db seed
 */

import * as bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// PERMISSIONS — keyed by RESOURCE:ACTION
// ---------------------------------------------------------------------------
const PERMISSIONS = [
  // Auth
  { key: "AUTH:LOGIN", resource: "AUTH", action: "LOGIN", displayName: "Login to platform" },
  { key: "AUTH:SETUP_MFA", resource: "AUTH", action: "SETUP_MFA", displayName: "Setup MFA" },
  {
    key: "AUTH:MANAGE_SESSIONS",
    resource: "AUTH",
    action: "MANAGE_SESSIONS",
    displayName: "Manage own sessions",
  },
  // Users
  { key: "USER:READ_OWN", resource: "USER", action: "READ_OWN", displayName: "Read own profile" },
  {
    key: "USER:UPDATE_OWN",
    resource: "USER",
    action: "UPDATE_OWN",
    displayName: "Update own profile",
  },
  {
    key: "USER:READ_MINISTRY",
    resource: "USER",
    action: "READ_MINISTRY",
    displayName: "Read ministry users",
  },
  { key: "USER:READ_ALL", resource: "USER", action: "READ_ALL", displayName: "Read all users" },
  { key: "USER:CREATE", resource: "USER", action: "CREATE", displayName: "Create users" },
  {
    key: "USER:UPDATE_ROLE",
    resource: "USER",
    action: "UPDATE_ROLE",
    displayName: "Assign user roles",
  },
  {
    key: "USER:DEACTIVATE",
    resource: "USER",
    action: "DEACTIVATE",
    displayName: "Deactivate users",
  },
  { key: "USER:UNLOCK", resource: "USER", action: "UNLOCK", displayName: "Unlock locked accounts" },
  // Channels
  {
    key: "CHANNEL:READ_MEMBER",
    resource: "CHANNEL",
    action: "READ_MEMBER",
    displayName: "Read member channels",
  },
  {
    key: "CHANNEL:SEND_MESSAGE",
    resource: "CHANNEL",
    action: "SEND_MESSAGE",
    displayName: "Send messages",
  },
  {
    key: "CHANNEL:CREATE_PUBLIC",
    resource: "CHANNEL",
    action: "CREATE_PUBLIC",
    displayName: "Create public channels",
  },
  {
    key: "CHANNEL:CREATE_PRIVATE",
    resource: "CHANNEL",
    action: "CREATE_PRIVATE",
    displayName: "Create private channels",
  },
  {
    key: "CHANNEL:MANAGE_OWN",
    resource: "CHANNEL",
    action: "MANAGE_OWN",
    displayName: "Manage own channels",
  },
  {
    key: "CHANNEL:MANAGE_MINISTRY",
    resource: "CHANNEL",
    action: "MANAGE_MINISTRY",
    displayName: "Manage ministry channels",
  },
  {
    key: "CHANNEL:MANAGE_ALL",
    resource: "CHANNEL",
    action: "MANAGE_ALL",
    displayName: "Manage all channels",
  },
  {
    key: "CHANNEL:ARCHIVE",
    resource: "CHANNEL",
    action: "ARCHIVE",
    displayName: "Archive channels",
  },
  {
    key: "CHANNEL:ADD_MEMBER",
    resource: "CHANNEL",
    action: "ADD_MEMBER",
    displayName: "Add channel members",
  },
  // Files
  { key: "FILE:UPLOAD", resource: "FILE", action: "UPLOAD", displayName: "Upload files" },
  {
    key: "FILE:DOWNLOAD_OWN",
    resource: "FILE",
    action: "DOWNLOAD_OWN",
    displayName: "Download files in member channels",
  },
  {
    key: "FILE:DELETE_OWN",
    resource: "FILE",
    action: "DELETE_OWN",
    displayName: "Delete own files",
  },
  {
    key: "FILE:DELETE_ANY_MINISTRY",
    resource: "FILE",
    action: "DELETE_ANY_MINISTRY",
    displayName: "Delete any ministry file",
  },
  {
    key: "FILE:DELETE_ANY",
    resource: "FILE",
    action: "DELETE_ANY",
    displayName: "Delete any file",
  },
  // Administration
  {
    key: "ADMIN:VIEW_AUDIT_LOGS_MINISTRY",
    resource: "ADMIN",
    action: "VIEW_AUDIT_LOGS_MINISTRY",
    displayName: "View ministry audit logs",
  },
  {
    key: "ADMIN:VIEW_AUDIT_LOGS_ALL",
    resource: "ADMIN",
    action: "VIEW_AUDIT_LOGS_ALL",
    displayName: "View all audit logs",
  },
  {
    key: "ADMIN:MANAGE_ROLES",
    resource: "ADMIN",
    action: "MANAGE_ROLES",
    displayName: "Manage roles",
  },
  {
    key: "ADMIN:INVITE_EXTERNAL",
    resource: "ADMIN",
    action: "INVITE_EXTERNAL",
    displayName: "Invite external partners",
  },
  {
    key: "ADMIN:SYSTEM_CONFIG",
    resource: "ADMIN",
    action: "SYSTEM_CONFIG",
    displayName: "Modify system configuration",
  },
  // Government Structure
  { key: "MINISTRY:READ", resource: "MINISTRY", action: "READ", displayName: "Read ministries" },
  {
    key: "MINISTRY:CREATE",
    resource: "MINISTRY",
    action: "CREATE",
    displayName: "Create ministries",
  },
  {
    key: "MINISTRY:UPDATE",
    resource: "MINISTRY",
    action: "UPDATE",
    displayName: "Update ministries",
  },
  {
    key: "MINISTRY:DEACTIVATE",
    resource: "MINISTRY",
    action: "DEACTIVATE",
    displayName: "Deactivate ministries",
  },
  {
    key: "DEPARTMENT:READ",
    resource: "DEPARTMENT",
    action: "READ",
    displayName: "Read departments",
  },
  {
    key: "DEPARTMENT:CREATE",
    resource: "DEPARTMENT",
    action: "CREATE",
    displayName: "Create departments",
  },
  {
    key: "DEPARTMENT:UPDATE",
    resource: "DEPARTMENT",
    action: "UPDATE",
    displayName: "Update departments",
  },
  {
    key: "DEPARTMENT:DEACTIVATE",
    resource: "DEPARTMENT",
    action: "DEACTIVATE",
    displayName: "Deactivate departments",
  },
  { key: "DIVISION:READ", resource: "DIVISION", action: "READ", displayName: "Read divisions" },
  {
    key: "DIVISION:CREATE",
    resource: "DIVISION",
    action: "CREATE",
    displayName: "Create divisions",
  },
  {
    key: "DIVISION:UPDATE",
    resource: "DIVISION",
    action: "UPDATE",
    displayName: "Update divisions",
  },
  {
    key: "DIVISION:DEACTIVATE",
    resource: "DIVISION",
    action: "DEACTIVATE",
    displayName: "Deactivate divisions",
  },
  { key: "PROVINCE:READ", resource: "PROVINCE", action: "READ", displayName: "Read provinces" },
  {
    key: "PROVINCE:CREATE",
    resource: "PROVINCE",
    action: "CREATE",
    displayName: "Create provinces",
  },
  {
    key: "PROVINCE:UPDATE",
    resource: "PROVINCE",
    action: "UPDATE",
    displayName: "Update provinces",
  },
  { key: "POSITION:READ", resource: "POSITION", action: "READ", displayName: "Read positions" },
  {
    key: "POSITION:CREATE",
    resource: "POSITION",
    action: "CREATE",
    displayName: "Create positions",
  },
  {
    key: "POSITION:UPDATE",
    resource: "POSITION",
    action: "UPDATE",
    displayName: "Update positions",
  },
  {
    key: "EMPLOYEE_ASSIGNMENT:READ",
    resource: "EMPLOYEE_ASSIGNMENT",
    action: "READ",
    displayName: "Read employee assignments",
  },
  {
    key: "EMPLOYEE_ASSIGNMENT:CREATE",
    resource: "EMPLOYEE_ASSIGNMENT",
    action: "CREATE",
    displayName: "Create employee assignments",
  },
  {
    key: "EMPLOYEE_ASSIGNMENT:UPDATE",
    resource: "EMPLOYEE_ASSIGNMENT",
    action: "UPDATE",
    displayName: "Update employee assignments",
  },
] as const;

// ---------------------------------------------------------------------------
// ROLES — name, weight, and which permissions they hold
// ---------------------------------------------------------------------------
const ROLES: Array<{
  name: string;
  displayName: string;
  weight: number;
  description: string;
  permissions: string[];
}> = [
  {
    name: "SUPER_ADMIN",
    displayName: "Super Administrator",
    weight: 100,
    description: "Full system access. Reserved for Prinodia Workspace platform engineers.",
    permissions: PERMISSIONS.map((p) => p.key), // all permissions
  },
  {
    name: "GOVERNMENT_ADMIN",
    displayName: "Government Administrator",
    weight: 90,
    description: "Cross-ministry access. IT administrators and senior government officials.",
    permissions: PERMISSIONS.filter((p) => p.key !== "ADMIN:SYSTEM_CONFIG").map((p) => p.key),
  },
  // MINISTRY_ADMIN gets read access to government structure + manage own ministry
  // (structure write permissions remain with GOVERNMENT_ADMIN and above)
  {
    name: "MINISTRY_ADMIN",
    displayName: "Ministry Administrator",
    weight: 70,
    description: "Full access within their assigned ministry.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "USER:UPDATE_OWN",
      "USER:READ_MINISTRY",
      "USER:CREATE",
      "USER:UPDATE_ROLE",
      "USER:DEACTIVATE",
      "USER:UNLOCK",
      "CHANNEL:READ_MEMBER",
      "CHANNEL:SEND_MESSAGE",
      "CHANNEL:CREATE_PUBLIC",
      "CHANNEL:CREATE_PRIVATE",
      "CHANNEL:MANAGE_OWN",
      "CHANNEL:MANAGE_MINISTRY",
      "CHANNEL:ARCHIVE",
      "CHANNEL:ADD_MEMBER",
      "FILE:UPLOAD",
      "FILE:DOWNLOAD_OWN",
      "FILE:DELETE_OWN",
      "FILE:DELETE_ANY_MINISTRY",
      "ADMIN:VIEW_AUDIT_LOGS_MINISTRY",
      "ADMIN:INVITE_EXTERNAL",
      // Government structure — read + manage own ministry's departments/divisions/positions
      "MINISTRY:READ",
      "DEPARTMENT:READ",
      "DEPARTMENT:CREATE",
      "DEPARTMENT:UPDATE",
      "DEPARTMENT:DEACTIVATE",
      "DIVISION:READ",
      "DIVISION:CREATE",
      "DIVISION:UPDATE",
      "DIVISION:DEACTIVATE",
      "PROVINCE:READ",
      "POSITION:READ",
      "POSITION:CREATE",
      "POSITION:UPDATE",
      "EMPLOYEE_ASSIGNMENT:READ",
      "EMPLOYEE_ASSIGNMENT:CREATE",
      "EMPLOYEE_ASSIGNMENT:UPDATE",
    ],
  },
  {
    name: "DEPARTMENT_ADMIN",
    displayName: "Department Administrator",
    weight: 50,
    description: "Full access within their assigned department.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "USER:UPDATE_OWN",
      "USER:READ_MINISTRY",
      "USER:CREATE",
      "USER:UPDATE_ROLE",
      "USER:DEACTIVATE",
      "USER:UNLOCK",
      "CHANNEL:READ_MEMBER",
      "CHANNEL:SEND_MESSAGE",
      "CHANNEL:CREATE_PUBLIC",
      "CHANNEL:CREATE_PRIVATE",
      "CHANNEL:MANAGE_OWN",
      "CHANNEL:ARCHIVE",
      "CHANNEL:ADD_MEMBER",
      "FILE:UPLOAD",
      "FILE:DOWNLOAD_OWN",
      "FILE:DELETE_OWN",
      "MINISTRY:READ",
      "DEPARTMENT:READ",
      "DIVISION:READ",
      "DIVISION:CREATE",
      "DIVISION:UPDATE",
      "PROVINCE:READ",
      "POSITION:READ",
      "POSITION:CREATE",
      "POSITION:UPDATE",
      "EMPLOYEE_ASSIGNMENT:READ",
      "EMPLOYEE_ASSIGNMENT:CREATE",
      "EMPLOYEE_ASSIGNMENT:UPDATE",
    ],
  },
  {
    name: "DIVISION_ADMIN",
    displayName: "Division Administrator",
    weight: 40,
    description: "Full access within their assigned division.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "USER:UPDATE_OWN",
      "USER:READ_MINISTRY",
      "CHANNEL:READ_MEMBER",
      "CHANNEL:SEND_MESSAGE",
      "CHANNEL:CREATE_PUBLIC",
      "CHANNEL:CREATE_PRIVATE",
      "CHANNEL:MANAGE_OWN",
      "CHANNEL:ADD_MEMBER",
      "FILE:UPLOAD",
      "FILE:DOWNLOAD_OWN",
      "FILE:DELETE_OWN",
      "MINISTRY:READ",
      "DEPARTMENT:READ",
      "DIVISION:READ",
      "PROVINCE:READ",
      "POSITION:READ",
      "EMPLOYEE_ASSIGNMENT:READ",
    ],
  },
  {
    name: "TEAM_MANAGER",
    displayName: "Team Manager",
    weight: 30,
    description: "Manages their team's channels and members.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "USER:UPDATE_OWN",
      "USER:READ_MINISTRY",
      "CHANNEL:READ_MEMBER",
      "CHANNEL:SEND_MESSAGE",
      "CHANNEL:CREATE_PUBLIC",
      "CHANNEL:CREATE_PRIVATE",
      "CHANNEL:MANAGE_OWN",
      "CHANNEL:ADD_MEMBER",
      "FILE:UPLOAD",
      "FILE:DOWNLOAD_OWN",
      "FILE:DELETE_OWN",
    ],
  },
  {
    name: "EMPLOYEE",
    displayName: "Employee",
    weight: 10,
    description: "Standard civil servant. Access to assigned channels only.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "USER:UPDATE_OWN",
      "USER:READ_MINISTRY",
      "CHANNEL:READ_MEMBER",
      "CHANNEL:SEND_MESSAGE",
      "CHANNEL:MANAGE_OWN",
      "FILE:UPLOAD",
      "FILE:DOWNLOAD_OWN",
      "FILE:DELETE_OWN",
      "MINISTRY:READ",
      "DEPARTMENT:READ",
      "DIVISION:READ",
      "PROVINCE:READ",
      "POSITION:READ",
      "EMPLOYEE_ASSIGNMENT:READ",
    ],
  },
  {
    name: "GUEST",
    displayName: "Guest / External Partner",
    weight: 0,
    description: "Read-only access to invited channels. Cannot send messages or upload files.",
    permissions: [
      "AUTH:LOGIN",
      "AUTH:SETUP_MFA",
      "AUTH:MANAGE_SESSIONS",
      "USER:READ_OWN",
      "CHANNEL:READ_MEMBER",
      "FILE:DOWNLOAD_OWN",
    ],
  },
];

// ---------------------------------------------------------------------------
// MAIN SEED
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("🌱 Prinodia Workspace — Seeding identity platform...");

  // 1. Upsert all permissions
  console.log(`  → Seeding ${PERMISSIONS.length} permissions...`);
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { displayName: perm.displayName },
      create: {
        key: perm.key,
        displayName: perm.displayName,
        resource: perm.resource,
        action: perm.action,
      },
    });
  }

  // 2. Upsert all roles + their permission links
  console.log(`  → Seeding ${ROLES.length} roles...`);
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        displayName: roleData.displayName,
        weight: roleData.weight,
        description: roleData.description,
        isSystem: true,
      },
      create: {
        name: roleData.name,
        displayName: roleData.displayName,
        weight: roleData.weight,
        description: roleData.description,
        isSystem: true,
      },
    });

    // Resolve permission IDs
    const permIds = await prisma.permission.findMany({
      where: { key: { in: roleData.permissions as string[] } },
      select: { id: true },
    });

    // Upsert role-permission links
    for (const { id: permissionId } of permIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }

    console.log(
      `    ✅ ${roleData.name} (weight: ${roleData.weight}, permissions: ${permIds.length})`,
    );
  }

  // 3. Upsert Super Admin user
  // Password is read from SEED_ADMIN_PASSWORD env var.
  // Falls back to a placeholder — must be rotated before production use.
  const adminEmail = "superadmin@govsphere.cd";
  const rawPassword = process.env["SEED_ADMIN_PASSWORD"] ?? "Prinodia Workspace@Admin1!";
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      matriculeNumber: "0.000.001",
      firstName: "Platform",
      lastName: "Admin",
      displayName: "Platform Administrator",
      passwordHash,
      role: "SUPER_ADMIN",
      userType: "IT_ADMINISTRATOR",
      status: "ACTIVE",
      passwordChangedAt: new Date(),
    },
  });
  console.log(`  ✅ Super Admin: ${adminEmail} (role: SUPER_ADMIN)`);
  if (!process.env["SEED_ADMIN_PASSWORD"]) {
    console.warn(
      "  ⚠️  Default seed password used — set SEED_ADMIN_PASSWORD before production use.",
    );
  }

  // ── 4. Seed DRC Provinces ────────────────────────────────────────────────
  const PROVINCES = [
    { code: "KIN", name: "Kinshasa", capital: "Kinshasa" },
    { code: "KOC", name: "Kongo Central", capital: "Matadi" },
    { code: "KWA", name: "Kwango", capital: "Kenge" },
    { code: "KWI", name: "Kwilu", capital: "Bandundu" },
    { code: "MAI", name: "Maï-Ndombe", capital: "Inongo" },
    { code: "KAS", name: "Kasaï", capital: "Luebo" },
    { code: "KAC", name: "Kasaï Central", capital: "Kananga" },
    { code: "KAO", name: "Kasaï Oriental", capital: "Mbuji-Mayi" },
    { code: "LOM", name: "Lomami", capital: "Kabinda" },
    { code: "SAN", name: "Sankuru", capital: "Lodja" },
    { code: "MAN", name: "Maniema", capital: "Kindu" },
    { code: "SKI", name: "Sud-Kivu", capital: "Bukavu" },
    { code: "NKI", name: "Nord-Kivu", capital: "Goma" },
    { code: "ITU", name: "Ituri", capital: "Bunia" },
    { code: "HUE", name: "Haut-Uélé", capital: "Isiro" },
    { code: "TSH", name: "Tshopo", capital: "Kisangani" },
    { code: "BUE", name: "Bas-Uélé", capital: "Buta" },
    { code: "NUB", name: "Nord-Ubangi", capital: "Gbadolite" },
    { code: "MON", name: "Mongala", capital: "Lisala" },
    { code: "SUB", name: "Sud-Ubangi", capital: "Gemena" },
    { code: "EQU", name: "Équateur", capital: "Mbandaka" },
    { code: "TSU", name: "Tshuapa", capital: "Boende" },
    { code: "TAN", name: "Tanganyika", capital: "Kalemie" },
    { code: "HLO", name: "Haut-Lomami", capital: "Kamina" },
    { code: "LUA", name: "Lualaba", capital: "Kolwezi" },
    { code: "HKA", name: "Haut-Katanga", capital: "Lubumbashi" },
  ] as const;

  console.log(`  → Seeding ${PROVINCES.length} provinces...`);
  for (const p of PROVINCES) {
    await prisma.province.upsert({
      where: { code: p.code },
      update: { name: p.name, capital: p.capital },
      create: { code: p.code, name: p.name, capital: p.capital },
    });
  }
  console.log(`    ✅ ${PROVINCES.length} provinces seeded`);

  // ── 5. Seed DRC Ministries ───────────────────────────────────────────────
  const MINISTRIES = [
    {
      code: "PRIM",
      name: "Primature",
      nameTranslations: { en: "Prime Minister's Office" },
      description: "Cabinet du Premier Ministre de la République Démocratique du Congo.",
    },
    {
      code: "MAE",
      name: "Ministère des Affaires Étrangères et de la Coopération Internationale",
      nameTranslations: { en: "Ministry of Foreign Affairs and International Cooperation" },
      description: "Gestion des relations diplomatiques et de la coopération internationale.",
    },
    {
      code: "MDN",
      name: "Ministère de la Défense Nationale et Anciens Combattants",
      nameTranslations: { en: "Ministry of National Defence and Veterans" },
      description: "Défense nationale et sécurité des frontières.",
    },
    {
      code: "MINT",
      name: "Ministère de l'Intérieur, Sécurité, Décentralisation et Affaires Coutumières",
      nameTranslations: {
        en: "Ministry of Interior, Security, Decentralisation and Customary Affairs",
      },
      description: "Ordre public, sécurité intérieure et décentralisation.",
    },
    {
      code: "MFIN",
      name: "Ministère des Finances",
      nameTranslations: { en: "Ministry of Finance" },
      description: "Gestion des finances publiques et de la politique fiscale.",
    },
    {
      code: "MBUD",
      name: "Ministère du Budget",
      nameTranslations: { en: "Ministry of Budget" },
      description: "Élaboration et exécution du budget national.",
    },
    {
      code: "MPLAN",
      name: "Ministère du Plan et Coordination de l'Aide au Développement",
      nameTranslations: { en: "Ministry of Planning and Development Aid Coordination" },
      description: "Planification nationale et coordination de l'aide au développement.",
    },
    {
      code: "MJUS",
      name: "Ministère de la Justice et Garde des Sceaux",
      nameTranslations: { en: "Ministry of Justice and Keeper of the Seals" },
      description: "Système judiciaire, état civil et garde des sceaux.",
    },
    {
      code: "MSANTE",
      name: "Ministère de la Santé Publique, Hygiène et Prévention",
      nameTranslations: { en: "Ministry of Public Health, Hygiene and Prevention" },
      description: "Politique nationale de santé et prévention sanitaire.",
    },
    {
      code: "MEPST",
      name: "Ministère de l'Enseignement Primaire, Secondaire et Technique",
      nameTranslations: { en: "Ministry of Primary, Secondary and Technical Education" },
      description: "Éducation de base, secondaire et formation technique.",
    },
    {
      code: "MESU",
      name: "Ministère de l'Enseignement Supérieur et Universitaire",
      nameTranslations: { en: "Ministry of Higher and University Education" },
      description: "Enseignement supérieur, universités et instituts supérieurs.",
    },
    {
      code: "MAPE",
      name: "Ministère de l'Agriculture, Pêche et Élevage",
      nameTranslations: { en: "Ministry of Agriculture, Fishing and Livestock" },
      description: "Développement agricole, halieutique et pastoral.",
    },
    {
      code: "MMINES",
      name: "Ministère des Mines",
      nameTranslations: { en: "Ministry of Mines" },
      description: "Exploitation et régulation du secteur minier national.",
    },
    {
      code: "MHYD",
      name: "Ministère des Hydrocarbures",
      nameTranslations: { en: "Ministry of Hydrocarbons" },
      description: "Gestion des ressources pétrolières et gazières.",
    },
    {
      code: "MENER",
      name: "Ministère de l'Énergie et Ressources Hydrauliques",
      nameTranslations: { en: "Ministry of Energy and Hydraulic Resources" },
      description: "Production et distribution d'énergie, et gestion hydraulique.",
    },
    {
      code: "MTRANS",
      name: "Ministère des Transports, Voies de Communication et Désenclavement du Territoire",
      nameTranslations: {
        en: "Ministry of Transport, Communication Routes and Territory Accessibility",
      },
      description: "Infrastructure de transport, aviation civile et fluviale.",
    },
    {
      code: "MINFRA",
      name: "Ministère des Infrastructures et Travaux Publics",
      nameTranslations: { en: "Ministry of Infrastructure and Public Works" },
      description: "Construction et entretien des infrastructures publiques.",
    },
    {
      code: "MCOM",
      name: "Ministère de la Communication et Médias",
      nameTranslations: { en: "Ministry of Communication and Media" },
      description: "Politique de communication gouvernementale et régulation des médias.",
    },
    {
      code: "MNUEM",
      name: "Ministère du Numérique, des Postes et des Télécommunications",
      nameTranslations: { en: "Ministry of Digital Affairs, Posts and Telecommunications" },
      description: "Transformation numérique, télécommunications et services postaux.",
    },
    {
      code: "MTRAV",
      name: "Ministère du Travail, Emploi et Prévoyance Sociale",
      nameTranslations: { en: "Ministry of Labour, Employment and Social Security" },
      description: "Droit du travail, emploi et protection sociale.",
    },
    {
      code: "MASHS",
      name: "Ministère des Affaires Sociales, Humanitaires et Solidarité Nationale",
      nameTranslations: {
        en: "Ministry of Social Affairs, Humanitarian Affairs and National Solidarity",
      },
      description: "Protection sociale, aide humanitaire et solidarité nationale.",
    },
    {
      code: "MGENRE",
      name: "Ministère du Genre, Famille et Enfant",
      nameTranslations: { en: "Ministry of Gender, Family and Child" },
      description: "Promotion du genre, protection de la famille et de l'enfant.",
    },
    {
      code: "MJEUN",
      name: "Ministère de la Jeunesse, Initiations Civique et Patriotique",
      nameTranslations: { en: "Ministry of Youth, Civic and Patriotic Initiatives" },
      description: "Politique de jeunesse et éducation civique.",
    },
    {
      code: "MSPORT",
      name: "Ministère des Sports et Loisirs",
      nameTranslations: { en: "Ministry of Sports and Leisure" },
      description: "Développement du sport national et des loisirs.",
    },
    {
      code: "MCULT",
      name: "Ministère de la Culture, Arts et Patrimoines",
      nameTranslations: { en: "Ministry of Culture, Arts and Heritage" },
      description: "Préservation du patrimoine culturel et promotion des arts.",
    },
    {
      code: "MENV",
      name: "Ministère de l'Environnement et Développement Durable",
      nameTranslations: { en: "Ministry of Environment and Sustainable Development" },
      description: "Protection de l'environnement et développement durable.",
    },
    {
      code: "MTOUR",
      name: "Ministère du Tourisme",
      nameTranslations: { en: "Ministry of Tourism" },
      description: "Promotion du tourisme national et du patrimoine naturel.",
    },
    {
      code: "MCOMEXT",
      name: "Ministère du Commerce Extérieur",
      nameTranslations: { en: "Ministry of External Trade" },
      description: "Régulation du commerce extérieur et accords commerciaux.",
    },
    {
      code: "MIND",
      name: "Ministère de l'Industrie",
      nameTranslations: { en: "Ministry of Industry" },
      description: "Développement industriel et promotion de l'entrepreneuriat.",
    },
    {
      code: "MRST",
      name: "Ministère de la Recherche Scientifique et Technologie",
      nameTranslations: { en: "Ministry of Scientific Research and Technology" },
      description: "Promotion de la recherche scientifique et innovation technologique.",
    },
    {
      code: "MURB",
      name: "Ministère de l'Urbanisme et Habitat",
      nameTranslations: { en: "Ministry of Urban Planning and Housing" },
      description: "Planification urbaine et politique du logement.",
    },
    {
      code: "MDEC",
      name: "Ministère de la Décentralisation et Réformes Institutionnelles",
      nameTranslations: { en: "Ministry of Decentralisation and Institutional Reforms" },
      description: "Mise en œuvre de la décentralisation et réformes de l'État.",
    },
    {
      code: "MPORT",
      name: "Ministère du Portefeuille",
      nameTranslations: { en: "Ministry of Portfolio" },
      description: "Gestion des entreprises publiques et participations de l'État.",
    },
    {
      code: "MDH",
      name: "Ministère des Droits Humains",
      nameTranslations: { en: "Ministry of Human Rights" },
      description: "Promotion et protection des droits humains.",
    },
    {
      code: "MCIF",
      name: "Ministère de la Coopération Internationale et Francophonie",
      nameTranslations: { en: "Ministry of International Cooperation and Francophonie" },
      description: "Coopération multilatérale et promotion de la Francophonie.",
    },
    {
      code: "MFPD",
      name: "Ministère de la Fonction Publique et Digitalisation",
      nameTranslations: { en: "Ministry of Civil Service and Digitalisation" },
      description: "Gestion de la fonction publique et modernisation administrative.",
    },
  ] as const;

  console.log(`  → Seeding ${MINISTRIES.length} DRC ministries...`);
  for (const m of MINISTRIES) {
    await prisma.ministry.upsert({
      where: { code: m.code },
      update: { name: m.name, nameTranslations: m.nameTranslations, description: m.description },
      create: {
        code: m.code,
        name: m.name,
        nameTranslations: m.nameTranslations,
        description: m.description,
      },
    });
  }
  console.log(`    ✅ ${MINISTRIES.length} ministries seeded`);

  console.log("🌱 Seed complete.");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
