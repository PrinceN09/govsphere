-- GovSphere v0.6.1 — Workforce Management
-- Applied: 2026-06-24
-- Adds: EMPLOYEE_TRANSFERRED, EMPLOYEE_MANAGER_CHANGED, EMPLOYEE_POSITION_CHANGED audit actions
--       workforce_transfers table for transfer history

-- ── AuditAction enum additions ────────────────────────────────────────────────
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_TRANSFERRED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_MANAGER_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_POSITION_CHANGED';

-- ── workforce_transfers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workforce_transfers" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "transferredById"  TEXT NOT NULL,
  "fromMinistryId"   TEXT,
  "fromDepartmentId" TEXT,
  "fromDivisionId"   TEXT,
  "fromOfficeId"     TEXT,
  "fromManagerId"    TEXT,
  "fromPositionId"   TEXT,
  "toMinistryId"     TEXT,
  "toDepartmentId"   TEXT,
  "toDivisionId"     TEXT,
  "toOfficeId"       TEXT,
  "toManagerId"      TEXT,
  "toPositionId"     TEXT,
  "reason"           TEXT,
  "effectiveDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workforce_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workforce_transfers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workforce_transfers_userId_idx"
  ON "workforce_transfers"("userId");

CREATE INDEX IF NOT EXISTS "workforce_transfers_createdAt_idx"
  ON "workforce_transfers"("createdAt");
