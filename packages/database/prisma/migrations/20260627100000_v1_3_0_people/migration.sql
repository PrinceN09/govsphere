-- =============================================================================
-- v1.3.0 — Prinodia People Foundation
-- =============================================================================
-- Additive migration: no existing tables, columns, or enums are modified.
-- Adds: OrgNodeType, WorkloadStatus, VacationStatus, SkillLevel, SkillCategory
--       org_nodes, employee_profiles, skills, employee_skills
-- =============================================================================

-- 1. Enums

DO $$ BEGIN
  CREATE TYPE "OrgNodeType" AS ENUM (
    'ORGANIZATION', 'DIVISION', 'DEPARTMENT', 'TEAM', 'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkloadStatus" AS ENUM (
    'NOT_ASSIGNED', 'AVAILABLE', 'NORMAL', 'BUSY', 'OVERLOADED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VacationStatus" AS ENUM (
    'VACATION', 'SICK_LEAVE', 'REMOTE', 'OFFICE', 'TRAVEL', 'TRAINING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SkillCategory" AS ENUM (
    'TECHNICAL', 'DOMAIN', 'SOFT', 'LANGUAGE', 'CERTIFICATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. org_nodes — recursive hierarchy with materializedPath

CREATE TABLE IF NOT EXISTS "org_nodes" (
  "id"               TEXT          NOT NULL,
  "organizationId"   TEXT          NOT NULL,
  "name"             VARCHAR(200)  NOT NULL,
  "type"             "OrgNodeType" NOT NULL DEFAULT 'DEPARTMENT',
  "parentId"         TEXT,
  "materializedPath" VARCHAR(1000) NOT NULL DEFAULT '/',
  "description"      TEXT,
  "code"             VARCHAR(50),
  "color"            VARCHAR(7),
  "icon"             VARCHAR(50),
  "sortOrder"        INTEGER       NOT NULL DEFAULT 0,
  "isActive"         BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_nodes_parentId_fkey" FOREIGN KEY ("parentId")
    REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "org_nodes_organizationId_idx"
  ON "org_nodes"("organizationId");

CREATE INDEX IF NOT EXISTS "org_nodes_parentId_idx"
  ON "org_nodes"("parentId");

CREATE INDEX IF NOT EXISTS "org_nodes_organizationId_materializedPath_idx"
  ON "org_nodes"("organizationId", "materializedPath");

CREATE INDEX IF NOT EXISTS "org_nodes_isActive_idx"
  ON "org_nodes"("isActive");

-- 3. employee_profiles — extended profile (1:1 with users)

CREATE TABLE IF NOT EXISTS "employee_profiles" (
  "id"                    TEXT              NOT NULL,
  "userId"                TEXT              NOT NULL,
  "organizationId"        TEXT              NOT NULL,
  "bio"                   TEXT,
  "phone"                 VARCHAR(50),
  "mobile"                VARCHAR(50),
  "officeLocation"        VARCHAR(200),
  "timeZone"              VARCHAR(60)       NOT NULL DEFAULT 'UTC',
  "workingHours"          JSONB,
  "orgNodeId"             TEXT,
  "secondaryOrgNodeIds"   TEXT[]            NOT NULL DEFAULT '{}',
  "workloadStatus"        "WorkloadStatus"  NOT NULL DEFAULT 'AVAILABLE',
  "vacationStatus"        "VacationStatus",
  "vacationFrom"          TIMESTAMP(3),
  "vacationUntil"         TIMESTAMP(3),
  "availabilityNote"      VARCHAR(200),
  "languages"             JSONB[]           NOT NULL DEFAULT '{}',
  "createdAt"             TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_profiles_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "employee_profiles_userId_key" UNIQUE ("userId"),
  CONSTRAINT "employee_profiles_orgNodeId_fkey" FOREIGN KEY ("orgNodeId")
    REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "employee_profiles_organizationId_idx"
  ON "employee_profiles"("organizationId");

CREATE INDEX IF NOT EXISTS "employee_profiles_orgNodeId_idx"
  ON "employee_profiles"("orgNodeId");

CREATE INDEX IF NOT EXISTS "employee_profiles_workloadStatus_idx"
  ON "employee_profiles"("workloadStatus");

-- 4. skills — skill catalog

CREATE TABLE IF NOT EXISTS "skills" (
  "id"          TEXT            NOT NULL,
  "name"        VARCHAR(100)    NOT NULL,
  "slug"        VARCHAR(100)    NOT NULL,
  "category"    "SkillCategory" NOT NULL DEFAULT 'TECHNICAL',
  "description" TEXT,
  "icon"        VARCHAR(50),
  "isActive"    BOOLEAN         NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "skills_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "skills_slug_key" UNIQUE ("slug")
);

CREATE INDEX IF NOT EXISTS "skills_category_idx" ON "skills"("category");
CREATE INDEX IF NOT EXISTS "skills_isActive_idx" ON "skills"("isActive");

-- 5. employee_skills — junction table

CREATE TABLE IF NOT EXISTS "employee_skills" (
  "id"        TEXT         NOT NULL,
  "profileId" TEXT         NOT NULL,
  "skillId"   TEXT         NOT NULL,
  "level"     "SkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
  "verified"  BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_skills_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "employee_skills_profileId_skillId_key" UNIQUE ("profileId", "skillId"),
  CONSTRAINT "employee_skills_profileId_fkey" FOREIGN KEY ("profileId")
    REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_skills_skillId_fkey" FOREIGN KEY ("skillId")
    REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "employee_skills_skillId_level_idx"
  ON "employee_skills"("skillId", "level");

-- 6. Seed core skills

INSERT INTO "skills" ("id", "name", "slug", "category") VALUES
  (gen_random_uuid()::text, 'AWS',           'aws',           'TECHNICAL'),
  (gen_random_uuid()::text, 'Docker',        'docker',        'TECHNICAL'),
  (gen_random_uuid()::text, 'Kubernetes',    'kubernetes',    'TECHNICAL'),
  (gen_random_uuid()::text, 'TypeScript',    'typescript',    'TECHNICAL'),
  (gen_random_uuid()::text, 'PostgreSQL',    'postgresql',    'TECHNICAL'),
  (gen_random_uuid()::text, 'Finance',       'finance',       'DOMAIN'),
  (gen_random_uuid()::text, 'Accounting',    'accounting',    'DOMAIN'),
  (gen_random_uuid()::text, 'Procurement',   'procurement',   'DOMAIN'),
  (gen_random_uuid()::text, 'Legal',         'legal',         'DOMAIN'),
  (gen_random_uuid()::text, 'Nursing',       'nursing',       'DOMAIN'),
  (gen_random_uuid()::text, 'Teaching',      'teaching',      'DOMAIN'),
  (gen_random_uuid()::text, 'Project Management', 'project-management', 'SOFT'),
  (gen_random_uuid()::text, 'Communication', 'communication', 'SOFT'),
  (gen_random_uuid()::text, 'Leadership',    'leadership',    'SOFT'),
  (gen_random_uuid()::text, 'French',        'french',        'LANGUAGE'),
  (gen_random_uuid()::text, 'English',       'english',       'LANGUAGE'),
  (gen_random_uuid()::text, 'Swahili',       'swahili',       'LANGUAGE')
ON CONFLICT ("slug") DO NOTHING;
