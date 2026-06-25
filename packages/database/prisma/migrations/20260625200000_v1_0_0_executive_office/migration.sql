-- GovSphere v1.0.0 — Executive Office & Cabinet Management Platform
-- Migration: 20260625200000_v1_0_0_executive_office

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "ExecutiveOfficeType" AS ENUM (
  'PRESIDENCY',
  'PRIME_MINISTER_OFFICE',
  'CABINET_SECRETARIAT',
  'MINISTERIAL',
  'DEPUTY_MINISTERIAL',
  'PERMANENT_SECRETARY_OFFICE',
  'CHIEF_OF_STAFF_OFFICE',
  'EXECUTIVE_ASSISTANT_OFFICE'
);

CREATE TYPE "CabinetSessionStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "DecisionStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'ADOPTED',
  'REJECTED',
  'DEFERRED',
  'WITHDRAWN'
);

CREATE TYPE "DecisionPriority" AS ENUM (
  'URGENT',
  'HIGH',
  'NORMAL',
  'LOW'
);

CREATE TYPE "ImplementationStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'OVERDUE'
);

CREATE TYPE "BriefingType" AS ENUM (
  'DAILY',
  'WEEKLY',
  'CABINET',
  'EMERGENCY',
  'SPECIAL'
);

CREATE TYPE "BriefingStatus" AS ENUM (
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'DISTRIBUTED'
);

CREATE TYPE "CorrespondenceType" AS ENUM (
  'OFFICIAL_LETTER',
  'PRESIDENTIAL_DIRECTIVE',
  'MINISTERIAL_MEMO',
  'CABINET_CIRCULAR',
  'EXECUTIVE_NOTE',
  'COMMUNIQUE'
);

CREATE TYPE "CorrespondenceClassification" AS ENUM (
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET'
);

CREATE TYPE "AnnouncementAudience" AS ENUM (
  'ALL_STAFF',
  'MINISTERS',
  'DIRECTORS',
  'CABINET_MEMBERS',
  'SPECIFIC_MINISTRY',
  'PUBLIC'
);

-- ─── Extend AuditAction enum ─────────────────────────────────────────────────

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXECUTIVE_OFFICE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXECUTIVE_OFFICE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_SESSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_SESSION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_SESSION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_SESSION_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_DECISION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_DECISION_ADOPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_DECISION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CABINET_DECISION_DEFERRED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DECISION_IMPLEMENTATION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DECISION_IMPLEMENTATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DECISION_IMPLEMENTATION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRIEFING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRIEFING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRIEFING_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRIEFING_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CORRESPONDENCE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CORRESPONDENCE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CORRESPONDENCE_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXECUTIVE_ANNOUNCEMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXECUTIVE_ANNOUNCEMENT_PUBLISHED';

-- ─── executive_offices ────────────────────────────────────────────────────────

CREATE TABLE "executive_offices" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        VARCHAR(255) NOT NULL,
  "officeType"  "ExecutiveOfficeType" NOT NULL,
  "code"        VARCHAR(50)  NOT NULL,
  "description" TEXT,
  "location"    VARCHAR(500),
  "isActive"    BOOLEAN      NOT NULL DEFAULT true,
  "headId"      TEXT,
  "ministryId"  TEXT,
  "metadata"    JSONB        NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "executive_offices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_offices_code_key" UNIQUE ("code"),
  CONSTRAINT "executive_offices_headId_fkey"
    FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_offices_ministryId_fkey"
    FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "executive_offices_officeType_idx" ON "executive_offices"("officeType");
CREATE INDEX "executive_offices_headId_idx" ON "executive_offices"("headId");
CREATE INDEX "executive_offices_ministryId_idx" ON "executive_offices"("ministryId");

-- ─── executive_office_staff ───────────────────────────────────────────────────

CREATE TABLE "executive_office_staff" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "officeId"  TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "title"     VARCHAR(255),
  "isPrimary" BOOLEAN      NOT NULL DEFAULT false,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate"   TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "executive_office_staff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_office_staff_officeId_userId_key" UNIQUE ("officeId", "userId"),
  CONSTRAINT "executive_office_staff_officeId_fkey"
    FOREIGN KEY ("officeId") REFERENCES "executive_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "executive_office_staff_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "executive_office_staff_officeId_idx" ON "executive_office_staff"("officeId");
CREATE INDEX "executive_office_staff_userId_idx" ON "executive_office_staff"("userId");

-- ─── cabinet_sessions ─────────────────────────────────────────────────────────

CREATE TABLE "cabinet_sessions" (
  "id"                TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionNumber"     INTEGER      NOT NULL,
  "title"             VARCHAR(500) NOT NULL,
  "description"       TEXT,
  "status"            "CabinetSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "location"          VARCHAR(500),
  "scheduledAt"       TIMESTAMP(3) NOT NULL,
  "startedAt"         TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "cancelledAt"       TIMESTAMP(3),
  "cancelReason"      TEXT,
  "chairId"           TEXT         NOT NULL,
  "secretaryId"       TEXT,
  "meetingId"         TEXT,
  "minutesDocumentId" TEXT,
  "metadata"          JSONB        NOT NULL DEFAULT '{}',
  "createdById"       TEXT         NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cabinet_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cabinet_sessions_meetingId_key" UNIQUE ("meetingId"),
  CONSTRAINT "cabinet_sessions_chairId_fkey"
    FOREIGN KEY ("chairId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cabinet_sessions_secretaryId_fkey"
    FOREIGN KEY ("secretaryId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_sessions_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_sessions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "cabinet_sessions_status_idx" ON "cabinet_sessions"("status");
CREATE INDEX "cabinet_sessions_scheduledAt_idx" ON "cabinet_sessions"("scheduledAt");
CREATE INDEX "cabinet_sessions_chairId_idx" ON "cabinet_sessions"("chairId");

-- ─── cabinet_agenda_items ─────────────────────────────────────────────────────

CREATE TABLE "cabinet_agenda_items" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId"       TEXT         NOT NULL,
  "order"           INTEGER      NOT NULL,
  "title"           VARCHAR(500) NOT NULL,
  "description"     TEXT,
  "presentedById"   TEXT,
  "durationMinutes" INTEGER,
  "supportingDocs"  TEXT[]       NOT NULL DEFAULT '{}',
  "completed"       BOOLEAN      NOT NULL DEFAULT false,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cabinet_agenda_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cabinet_agenda_items_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "cabinet_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cabinet_agenda_items_presentedById_fkey"
    FOREIGN KEY ("presentedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "cabinet_agenda_items_sessionId_idx" ON "cabinet_agenda_items"("sessionId");

-- ─── cabinet_decisions ────────────────────────────────────────────────────────

CREATE TABLE "cabinet_decisions" (
  "id"                      TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "decisionNumber"          VARCHAR(100)     NOT NULL,
  "sessionId"               TEXT             NOT NULL,
  "agendaItemId"            TEXT,
  "title"                   VARCHAR(500)     NOT NULL,
  "content"                 TEXT             NOT NULL,
  "status"                  "DecisionStatus" NOT NULL DEFAULT 'DRAFT',
  "priority"                "DecisionPriority" NOT NULL DEFAULT 'NORMAL',
  "votesFor"                INTEGER          NOT NULL DEFAULT 0,
  "votesAgainst"            INTEGER          NOT NULL DEFAULT 0,
  "abstentions"             INTEGER          NOT NULL DEFAULT 0,
  "votingNotes"             TEXT,
  "responsibleMinistryId"   TEXT,
  "ownerId"                 TEXT,
  "dueDate"                 TIMESTAMP(3),
  "adoptedAt"               TIMESTAMP(3),
  "adoptedById"             TEXT,
  "documentId"              TEXT,
  "workflowInstanceId"      TEXT,
  "tags"                    TEXT[]           NOT NULL DEFAULT '{}',
  "metadata"                JSONB            NOT NULL DEFAULT '{}',
  "createdById"             TEXT             NOT NULL,
  "createdAt"               TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cabinet_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cabinet_decisions_decisionNumber_key" UNIQUE ("decisionNumber"),
  CONSTRAINT "cabinet_decisions_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "cabinet_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cabinet_decisions_agendaItemId_fkey"
    FOREIGN KEY ("agendaItemId") REFERENCES "cabinet_agenda_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_decisions_responsibleMinistryId_fkey"
    FOREIGN KEY ("responsibleMinistryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_decisions_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_decisions_adoptedById_fkey"
    FOREIGN KEY ("adoptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cabinet_decisions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "cabinet_decisions_sessionId_idx" ON "cabinet_decisions"("sessionId");
CREATE INDEX "cabinet_decisions_status_idx" ON "cabinet_decisions"("status");
CREATE INDEX "cabinet_decisions_priority_idx" ON "cabinet_decisions"("priority");
CREATE INDEX "cabinet_decisions_responsibleMinistryId_idx" ON "cabinet_decisions"("responsibleMinistryId");
CREATE INDEX "cabinet_decisions_dueDate_idx" ON "cabinet_decisions"("dueDate");

-- ─── decision_implementations ─────────────────────────────────────────────────

CREATE TABLE "decision_implementations" (
  "id"                 TEXT                   NOT NULL DEFAULT gen_random_uuid()::text,
  "decisionId"         TEXT                   NOT NULL,
  "title"              VARCHAR(500)           NOT NULL,
  "description"        TEXT,
  "status"             "ImplementationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPct"        INTEGER                NOT NULL DEFAULT 0,
  "assignedToId"       TEXT,
  "ministryId"         TEXT,
  "dueDate"            TIMESTAMP(3),
  "completedAt"        TIMESTAMP(3),
  "evidence"           TEXT,
  "notes"              TEXT,
  "taskId"             TEXT,
  "workflowInstanceId" TEXT,
  "createdById"        TEXT                   NOT NULL,
  "createdAt"          TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_implementations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "decision_implementations_taskId_key" UNIQUE ("taskId"),
  CONSTRAINT "decision_implementations_decisionId_fkey"
    FOREIGN KEY ("decisionId") REFERENCES "cabinet_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "decision_implementations_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "decision_implementations_ministryId_fkey"
    FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "decision_implementations_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "decision_implementations_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "decision_implementations_decisionId_idx" ON "decision_implementations"("decisionId");
CREATE INDEX "decision_implementations_status_idx" ON "decision_implementations"("status");
CREATE INDEX "decision_implementations_assignedToId_idx" ON "decision_implementations"("assignedToId");
CREATE INDEX "decision_implementations_ministryId_idx" ON "decision_implementations"("ministryId");

-- ─── executive_briefings ──────────────────────────────────────────────────────

CREATE TABLE "executive_briefings" (
  "id"                 TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "title"              VARCHAR(500)     NOT NULL,
  "briefingType"       "BriefingType"   NOT NULL,
  "status"             "BriefingStatus" NOT NULL DEFAULT 'DRAFT',
  "content"            JSONB            NOT NULL DEFAULT '{}',
  "summary"            TEXT,
  "scheduledFor"       TIMESTAMP(3),
  "publishedAt"        TIMESTAMP(3),
  "approvedAt"         TIMESTAMP(3),
  "officeId"           TEXT,
  "authorId"           TEXT             NOT NULL,
  "approvedById"       TEXT,
  "attachments"        TEXT[]           NOT NULL DEFAULT '{}',
  "meetingRefs"        TEXT[]           NOT NULL DEFAULT '{}',
  "workflowInstanceId" TEXT,
  "versionHistory"     JSONB            NOT NULL DEFAULT '[]',
  "metadata"           JSONB            NOT NULL DEFAULT '{}',
  "createdAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "executive_briefings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_briefings_officeId_fkey"
    FOREIGN KEY ("officeId") REFERENCES "executive_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_briefings_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "executive_briefings_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "executive_briefings_briefingType_idx" ON "executive_briefings"("briefingType");
CREATE INDEX "executive_briefings_status_idx" ON "executive_briefings"("status");
CREATE INDEX "executive_briefings_scheduledFor_idx" ON "executive_briefings"("scheduledFor");
CREATE INDEX "executive_briefings_authorId_idx" ON "executive_briefings"("authorId");

-- ─── executive_correspondence ─────────────────────────────────────────────────

CREATE TABLE "executive_correspondence" (
  "id"                     TEXT                           NOT NULL DEFAULT gen_random_uuid()::text,
  "referenceNumber"        VARCHAR(100)                   NOT NULL,
  "subject"                VARCHAR(500)                   NOT NULL,
  "correspondenceType"     "CorrespondenceType"           NOT NULL,
  "classification"         "CorrespondenceClassification" NOT NULL DEFAULT 'INTERNAL',
  "content"                JSONB                          NOT NULL DEFAULT '{}',
  "summary"                TEXT,
  "fromOfficeId"           TEXT,
  "fromUserId"             TEXT                           NOT NULL,
  "toMinistryId"           TEXT,
  "toUserId"               TEXT,
  "toExternal"             VARCHAR(500),
  "sentAt"                 TIMESTAMP(3),
  "receivedAt"             TIMESTAMP(3),
  "acknowledgedAt"         TIMESTAMP(3),
  "documentId"             TEXT,
  "attachments"            TEXT[]                         NOT NULL DEFAULT '{}',
  "workflowInstanceId"     TEXT,
  "parentCorrespondenceId" TEXT,
  "metadata"               JSONB                          NOT NULL DEFAULT '{}',
  "createdAt"              TIMESTAMP(3)                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)                   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "executive_correspondence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_correspondence_referenceNumber_key" UNIQUE ("referenceNumber"),
  CONSTRAINT "executive_correspondence_fromOfficeId_fkey"
    FOREIGN KEY ("fromOfficeId") REFERENCES "executive_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_correspondence_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "executive_correspondence_toMinistryId_fkey"
    FOREIGN KEY ("toMinistryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_correspondence_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_correspondence_parentCorrespondenceId_fkey"
    FOREIGN KEY ("parentCorrespondenceId") REFERENCES "executive_correspondence"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "executive_correspondence_correspondenceType_idx" ON "executive_correspondence"("correspondenceType");
CREATE INDEX "executive_correspondence_classification_idx" ON "executive_correspondence"("classification");
CREATE INDEX "executive_correspondence_fromUserId_idx" ON "executive_correspondence"("fromUserId");
CREATE INDEX "executive_correspondence_toMinistryId_idx" ON "executive_correspondence"("toMinistryId");
CREATE INDEX "executive_correspondence_sentAt_idx" ON "executive_correspondence"("sentAt");

-- ─── executive_announcements ──────────────────────────────────────────────────

CREATE TABLE "executive_announcements" (
  "id"              TEXT                   NOT NULL DEFAULT gen_random_uuid()::text,
  "title"           VARCHAR(500)           NOT NULL,
  "content"         TEXT                   NOT NULL,
  "audience"        "AnnouncementAudience" NOT NULL DEFAULT 'ALL_STAFF',
  "isPublished"     BOOLEAN                NOT NULL DEFAULT false,
  "publishedAt"     TIMESTAMP(3),
  "expiresAt"       TIMESTAMP(3),
  "officeId"        TEXT,
  "authorId"        TEXT                   NOT NULL,
  "targetMinistryId" TEXT,
  "metadata"        JSONB                  NOT NULL DEFAULT '{}',
  "createdAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "executive_announcements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_announcements_officeId_fkey"
    FOREIGN KEY ("officeId") REFERENCES "executive_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "executive_announcements_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "executive_announcements_targetMinistryId_fkey"
    FOREIGN KEY ("targetMinistryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "executive_announcements_audience_idx" ON "executive_announcements"("audience");
CREATE INDEX "executive_announcements_isPublished_idx" ON "executive_announcements"("isPublished");
CREATE INDEX "executive_announcements_publishedAt_idx" ON "executive_announcements"("publishedAt");
CREATE INDEX "executive_announcements_officeId_idx" ON "executive_announcements"("officeId");
