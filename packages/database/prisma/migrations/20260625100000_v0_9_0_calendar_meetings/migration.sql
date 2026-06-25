-- GovSphere v0.9.0 — Calendar, Meetings & Events Platform
-- Migration: 20260625100000_v0_9_0_calendar_meetings

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "CalendarScope" AS ENUM ('PERSONAL','TEAM','DEPARTMENT','MINISTRY','PROVINCE','NATIONAL');
CREATE TYPE "EventStatus" AS ENUM ('TENTATIVE','CONFIRMED','CANCELLED');
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','POSTPONED');
CREATE TYPE "MeetingType" AS ENUM ('REGULAR','EMERGENCY','CABINET','MINISTERIAL','COMMITTEE','WORKING_GROUP','BILATERAL','TRILATERAL','VIRTUAL','HYBRID');
CREATE TYPE "MeetingClassification" AS ENUM ('PUBLIC','INTERNAL','CONFIDENTIAL','SECRET');
CREATE TYPE "ParticipantRole" AS ENUM ('ORGANIZER','REQUIRED','OPTIONAL','PRESENTER','OBSERVER','SECRETARY');
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED','TENTATIVE','DELEGATED');
CREATE TYPE "AttendanceStatus" AS ENUM ('ABSENT','PRESENT','LATE','EXCUSED','DELEGATED');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY','WEEKLY','MONTHLY','YEARLY');
CREATE TYPE "ResourceType" AS ENUM ('MEETING_ROOM','PROJECTOR','VEHICLE','FACILITY','EQUIPMENT');
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP','EMAIL','SMS');

-- ─── AuditAction additions ────────────────────────────────────────────────────

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EVENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EVENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EVENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EVENT_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_PARTICIPANT_INVITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_RSVP_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_RSVP_DECLINED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_RSVP_DELEGATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_ATTENDANCE_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_MINUTES_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_MINUTES_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEETING_ACTION_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ROOM_BOOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ROOM_BOOKING_CANCELLED';

-- ─── Recurring Rules ──────────────────────────────────────────────────────────

CREATE TABLE "recurring_rules" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "frequency"   "RecurrenceFrequency" NOT NULL,
  "interval"    INTEGER NOT NULL DEFAULT 1,
  "daysOfWeek"  INTEGER[] NOT NULL DEFAULT '{}',
  "dayOfMonth"  INTEGER,
  "monthOfYear" INTEGER,
  "untilDate"   TIMESTAMP(3),
  "occurrences" INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- ─── Calendar Events ──────────────────────────────────────────────────────────

CREATE TABLE "calendar_events" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid(),
  "title"            VARCHAR(500) NOT NULL,
  "description"      TEXT,
  "location"         VARCHAR(500),
  "onlineMeetingUrl" VARCHAR(2000),
  "startAt"          TIMESTAMP(3) NOT NULL,
  "endAt"            TIMESTAMP(3) NOT NULL,
  "allDay"           BOOLEAN NOT NULL DEFAULT false,
  "timezone"         VARCHAR(100) NOT NULL DEFAULT 'Africa/Kinshasa',
  "status"           "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
  "scope"            "CalendarScope" NOT NULL DEFAULT 'PERSONAL',
  "classification"   "MeetingClassification" NOT NULL DEFAULT 'INTERNAL',
  "color"            VARCHAR(20),
  "createdById"      TEXT NOT NULL,
  "ministryId"       TEXT,
  "departmentId"     TEXT,
  "divisionId"       TEXT,
  "provinceId"       TEXT,
  "recurringRuleId"  TEXT,
  "parentEventId"    TEXT,
  "deletedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_createdById_idx" ON "calendar_events"("createdById");
CREATE INDEX "calendar_events_startAt_endAt_idx" ON "calendar_events"("startAt","endAt");
CREATE INDEX "calendar_events_ministryId_idx" ON "calendar_events"("ministryId");
CREATE INDEX "calendar_events_departmentId_idx" ON "calendar_events"("departmentId");
CREATE INDEX "calendar_events_provinceId_idx" ON "calendar_events"("provinceId");
CREATE INDEX "calendar_events_scope_idx" ON "calendar_events"("scope");
CREATE INDEX "calendar_events_status_idx" ON "calendar_events"("status");

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Event Reminders ──────────────────────────────────────────────────────────

CREATE TABLE "event_reminders" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "eventId"       TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "minutesBefore" INTEGER NOT NULL,
  "channel"       "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
  "sentAt"        TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_reminders_eventId_idx" ON "event_reminders"("eventId");
CREATE INDEX "event_reminders_userId_idx" ON "event_reminders"("userId");
CREATE INDEX "event_reminders_sentAt_idx" ON "event_reminders"("sentAt");

ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Rooms ────────────────────────────────────────────────────────────────────

CREATE TABLE "rooms" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name"        VARCHAR(200) NOT NULL,
  "code"        VARCHAR(50),
  "type"        "ResourceType" NOT NULL DEFAULT 'MEETING_ROOM',
  "capacity"    INTEGER,
  "location"    VARCHAR(500),
  "description" TEXT,
  "amenities"   TEXT[] NOT NULL DEFAULT '{}',
  "ministryId"  TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rooms_ministryId_idx" ON "rooms"("ministryId");
CREATE INDEX "rooms_type_idx" ON "rooms"("type");

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Meetings ─────────────────────────────────────────────────────────────────

CREATE TABLE "meetings" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid(),
  "eventId"           TEXT NOT NULL,
  "title"             VARCHAR(500) NOT NULL,
  "description"       TEXT,
  "location"          VARCHAR(500),
  "onlineMeetingUrl"  VARCHAR(2000),
  "meetingType"       "MeetingType" NOT NULL DEFAULT 'REGULAR',
  "status"            "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "classification"    "MeetingClassification" NOT NULL DEFAULT 'INTERNAL',
  "organizerId"       TEXT NOT NULL,
  "roomId"            TEXT,
  "briefDocumentId"   TEXT,
  "workflowInstanceId" TEXT,
  "metadata"          JSONB NOT NULL DEFAULT '{}',
  "cancelledAt"       TIMESTAMP(3),
  "cancelReason"      TEXT,
  "completedAt"       TIMESTAMP(3),
  "deletedAt"         TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meetings_eventId_key" ON "meetings"("eventId");
CREATE INDEX "meetings_organizerId_idx" ON "meetings"("organizerId");
CREATE INDEX "meetings_status_idx" ON "meetings"("status");
CREATE INDEX "meetings_meetingType_idx" ON "meetings"("meetingType");
CREATE INDEX "meetings_roomId_idx" ON "meetings"("roomId");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Meeting Participants ─────────────────────────────────────────────────────

CREATE TABLE "meeting_participants" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid(),
  "meetingId"        TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "role"             "ParticipantRole" NOT NULL DEFAULT 'REQUIRED',
  "rsvpStatus"       "RsvpStatus" NOT NULL DEFAULT 'PENDING',
  "attendanceStatus" "AttendanceStatus",
  "rsvpAt"           TIMESTAMP(3),
  "delegatedToId"    TEXT,
  "reminderSentAt"   TIMESTAMP(3),
  "note"             VARCHAR(500),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meeting_participants_meetingId_userId_key" ON "meeting_participants"("meetingId","userId");
CREATE INDEX "meeting_participants_meetingId_idx" ON "meeting_participants"("meetingId");
CREATE INDEX "meeting_participants_userId_idx" ON "meeting_participants"("userId");
CREATE INDEX "meeting_participants_rsvpStatus_idx" ON "meeting_participants"("rsvpStatus");

ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Meeting Agenda Items ─────────────────────────────────────────────────────

CREATE TABLE "meeting_agenda_items" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid(),
  "meetingId"        TEXT NOT NULL,
  "order"            INTEGER NOT NULL,
  "title"            VARCHAR(500) NOT NULL,
  "description"      TEXT,
  "presenterId"      TEXT,
  "durationMinutes"  INTEGER,
  "supportingDocs"   TEXT[] NOT NULL DEFAULT '{}',
  "expectedDecision" TEXT,
  "completed"        BOOLEAN NOT NULL DEFAULT false,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_agenda_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meeting_agenda_items_meetingId_idx" ON "meeting_agenda_items"("meetingId");

ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Meeting Minutes ──────────────────────────────────────────────────────────

CREATE TABLE "meeting_minutes" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid(),
  "meetingId"          TEXT NOT NULL,
  "documentId"         TEXT,
  "authorId"           TEXT NOT NULL,
  "content"            TEXT,
  "isDraft"            BOOLEAN NOT NULL DEFAULT true,
  "publishedAt"        TIMESTAMP(3),
  "publishedById"      TEXT,
  "workflowInstanceId" TEXT,
  "versionHistory"     JSONB NOT NULL DEFAULT '[]',
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meeting_minutes_meetingId_key" ON "meeting_minutes"("meetingId");
CREATE UNIQUE INDEX "meeting_minutes_documentId_key" ON "meeting_minutes"("documentId");
CREATE INDEX "meeting_minutes_meetingId_idx" ON "meeting_minutes"("meetingId");

ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Meeting Action Items ─────────────────────────────────────────────────────

CREATE TABLE "meeting_action_items" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
  "meetingId"    TEXT NOT NULL,
  "taskId"       TEXT NOT NULL,
  "agendaItemId" TEXT,
  "sourceNote"   VARCHAR(1000),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_action_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meeting_action_items_taskId_key" ON "meeting_action_items"("taskId");
CREATE INDEX "meeting_action_items_meetingId_idx" ON "meeting_action_items"("meetingId");

ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Meeting Attachments ──────────────────────────────────────────────────────

CREATE TABLE "meeting_attachments" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
  "meetingId"    TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "filename"     VARCHAR(500) NOT NULL,
  "mimeType"     VARCHAR(100) NOT NULL,
  "sizeBytes"    INTEGER NOT NULL,
  "storageKey"   VARCHAR(1000) NOT NULL,
  "documentId"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meeting_attachments_meetingId_idx" ON "meeting_attachments"("meetingId");

ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Room Bookings ────────────────────────────────────────────────────────────

CREATE TABLE "room_bookings" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "roomId"      TEXT NOT NULL,
  "bookedById"  TEXT NOT NULL,
  "startAt"     TIMESTAMP(3) NOT NULL,
  "endAt"       TIMESTAMP(3) NOT NULL,
  "purpose"     VARCHAR(500),
  "eventId"     TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_bookings_roomId_startAt_endAt_idx" ON "room_bookings"("roomId","startAt","endAt");
CREATE INDEX "room_bookings_bookedById_idx" ON "room_bookings"("bookedById");

ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
