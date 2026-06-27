-- v1.1.1 Workspace Onboarding
-- Safe additive migration: adds columns/indexes only, no renames or drops.

-- 1. User.employeeNumber — org-scoped employee ID for non-government orgs
ALTER TABLE "users"
  ADD COLUMN "employeeNumber" VARCHAR(100);

CREATE INDEX "users_employeeNumber_idx" ON "users"("employeeNumber");
CREATE INDEX "users_organizationId_employeeNumber_idx" ON "users"("organizationId", "employeeNumber");

-- 2. Organization.workspaceSlug — unique URL-safe workspace slug
ALTER TABLE "organizations"
  ADD COLUMN "workspaceSlug" VARCHAR(120);

CREATE UNIQUE INDEX "organizations_workspaceSlug_key" ON "organizations"("workspaceSlug");

-- 3. OrganizationStatus: add PENDING_VERIFICATION value to the enum
--    PostgreSQL requires a transaction-safe ALTER TYPE ... ADD VALUE.
ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

-- 4. AuditAction: add workspace-onboarding audit values
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_SIGNUP';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITATION_ACCEPTED';
