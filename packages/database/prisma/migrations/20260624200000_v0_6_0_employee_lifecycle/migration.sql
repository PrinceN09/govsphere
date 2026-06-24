-- GovSphere v0.6.0 — User Lifecycle Management
-- Migration: employee lifecycle fields + invitation model

-- ─── Audit action enum values ────────────────────────────────────────────────
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_INVITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_INVITATION_RESENT';

-- ─── users: add phone, officeId, managerId ───────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone"     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "officeId"  TEXT,
  ADD COLUMN IF NOT EXISTS "managerId" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_officeId_fkey"
    FOREIGN KEY ("officeId") REFERENCES "offices"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "users_officeId_idx"  ON "users"("officeId");
CREATE INDEX IF NOT EXISTS "users_managerId_idx" ON "users"("managerId");

-- ─── offices: add users back-relation (no DDL change — handled by FK above) ─

-- ─── employee_invitations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "employee_invitations" (
  "id"          TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "tokenHash"   VARCHAR(255) NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "used"        BOOLEAN     NOT NULL DEFAULT false,
  "usedAt"      TIMESTAMP(3),
  "invitedById" TEXT        NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_invitations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "employee_invitations"
  ADD CONSTRAINT "employee_invitations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "employee_invitations_tokenHash_key"
  ON "employee_invitations"("tokenHash");

CREATE INDEX IF NOT EXISTS "employee_invitations_userId_idx"
  ON "employee_invitations"("userId");
