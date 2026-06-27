-- =============================================================================
-- v1.2.0 — Real-Time Collaboration Core
-- =============================================================================
-- Extends PresenceStatus enum with IN_MEETING and ON_CALL.
-- Adds DeviceType and RoomType enums.
-- Adds UserConnection model (ephemeral WebSocket connection tracking).
-- Adds ActivityEvent model (persistent org-scoped activity feed).
-- =============================================================================

-- 1. Extend PresenceStatus enum
ALTER TYPE "PresenceStatus" ADD VALUE IF NOT EXISTS 'IN_MEETING';
ALTER TYPE "PresenceStatus" ADD VALUE IF NOT EXISTS 'ON_CALL';

-- 2. Create DeviceType enum
DO $$ BEGIN
  CREATE TYPE "DeviceType" AS ENUM ('WEB', 'DESKTOP', 'MOBILE', 'API');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create RoomType enum
DO $$ BEGIN
  CREATE TYPE "RoomType" AS ENUM (
    'WORKSPACE', 'ORGANIZATION', 'DEPARTMENT', 'CHANNEL',
    'MEETING', 'CANVAS', 'PROJECT', 'DOCUMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create user_connections table
CREATE TABLE IF NOT EXISTS "user_connections" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "socketId"        VARCHAR(100) NOT NULL,
  "deviceType"      "DeviceType" NOT NULL DEFAULT 'WEB',
  "userAgent"       VARCHAR(500),
  "ipAddress"       VARCHAR(45),
  "connectedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_connections_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "user_connections_socketId_key" UNIQUE ("socketId"),
  CONSTRAINT "user_connections_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_connections_userId_idx"          ON "user_connections"("userId");
CREATE INDEX IF NOT EXISTS "user_connections_lastHeartbeatAt_idx" ON "user_connections"("lastHeartbeatAt");

-- 5. Create activity_events table
CREATE TABLE IF NOT EXISTS "activity_events" (
  "id"           TEXT         NOT NULL,
  "orgId"        TEXT         NOT NULL,
  "actorId"      TEXT         NOT NULL,
  "eventType"    VARCHAR(100) NOT NULL,
  "resourceType" VARCHAR(100) NOT NULL,
  "resourceId"   VARCHAR(100) NOT NULL,
  "summary"      VARCHAR(500) NOT NULL,
  "metadata"     JSONB        NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activity_events_orgId_fkey"
    FOREIGN KEY ("orgId")   REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "activity_events_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "activity_events_orgId_createdAt_idx"   ON "activity_events"("orgId",    "createdAt");
CREATE INDEX IF NOT EXISTS "activity_events_actorId_createdAt_idx" ON "activity_events"("actorId",  "createdAt");
CREATE INDEX IF NOT EXISTS "activity_events_eventType_createdAt_idx" ON "activity_events"("eventType", "createdAt");
