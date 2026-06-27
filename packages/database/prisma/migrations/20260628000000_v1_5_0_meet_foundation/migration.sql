-- =============================================================================
-- Prinodia Workspace v1.5.0 — Meet Foundation
-- Migration: 20260628000000_v1_5_0_meet_foundation
--
-- Strategy: fully additive — no existing tables, columns, or constraints are
-- removed. All new enums use DO $$ blocks so they are safe to re-run.
-- All new columns on existing tables use IF NOT EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "LiveMeetRole" AS ENUM (
    'HOST', 'CO_HOST', 'PRESENTER', 'PARTICIPANT', 'GUEST'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RecordingStatus" AS ENUM (
    'PENDING', 'RECORDING', 'PROCESSING', 'READY', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PollStatus" AS ENUM (
    'DRAFT', 'ACTIVE', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BreakoutStatus" AS ENUM (
    'OPEN', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TranscriptStatus" AS ENUM (
    'IN_PROGRESS', 'COMPLETED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Extend meetings table
-- ---------------------------------------------------------------------------

ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "channelId"          TEXT,
  ADD COLUMN IF NOT EXISTS "joinToken"          VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "isLocked"           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "waitingRoomEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "maxParticipants"    INTEGER,
  ADD COLUMN IF NOT EXISTS "recordingEnabled"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "videoEnabled"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "audioEnabled"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "screenShareEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "liveStartedAt"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "liveEndedAt"        TIMESTAMPTZ;

-- FK: meetings.channelId → channels.id
DO $$ BEGIN
  ALTER TABLE "meetings"
    ADD CONSTRAINT "meetings_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unique constraint on joinToken
DO $$ BEGIN
  ALTER TABLE "meetings"
    ADD CONSTRAINT "meetings_joinToken_key" UNIQUE ("joinToken");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "meetings_channelId_idx" ON "meetings"("channelId");

-- ---------------------------------------------------------------------------
-- 3. Extend meeting_participants table
-- ---------------------------------------------------------------------------

ALTER TABLE "meeting_participants"
  ADD COLUMN IF NOT EXISTS "liveRole"          "LiveMeetRole" NOT NULL DEFAULT 'PARTICIPANT',
  ADD COLUMN IF NOT EXISTS "joinedAt"          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "leftAt"            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "isAudioMuted"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isVideoOff"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isHandRaised"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isInWaitingRoom"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "connectionQuality" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "deviceInfo"        JSONB NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 4. Create meeting_sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_sessions" (
  "id"                   TEXT NOT NULL,
  "meetingId"            TEXT NOT NULL,
  "hostId"               TEXT NOT NULL,
  "startedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endedAt"              TIMESTAMPTZ,
  "durationSeconds"      INTEGER,
  "participantCount"     INTEGER NOT NULL DEFAULT 0,
  "peakParticipantCount" INTEGER NOT NULL DEFAULT 0,
  "roomSid"              VARCHAR(500),
  "metadata"             JSONB NOT NULL DEFAULT '{}',
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_sessions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_sessions"
    ADD CONSTRAINT "meeting_sessions_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_sessions"
    ADD CONSTRAINT "meeting_sessions_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_sessions_meetingId_idx" ON "meeting_sessions"("meetingId");
CREATE INDEX IF NOT EXISTS "meeting_sessions_hostId_idx"    ON "meeting_sessions"("hostId");

-- ---------------------------------------------------------------------------
-- 5. Create meeting_recordings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_recordings" (
  "id"              TEXT NOT NULL,
  "meetingId"       TEXT NOT NULL,
  "startedById"     TEXT NOT NULL,
  "status"          "RecordingStatus" NOT NULL DEFAULT 'PENDING',
  "storageKey"      VARCHAR(1000),
  "filename"        VARCHAR(500),
  "durationSeconds" INTEGER,
  "sizeBytes"       BIGINT,
  "mimeType"        VARCHAR(100),
  "startedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "stoppedAt"       TIMESTAMPTZ,
  "processedAt"     TIMESTAMPTZ,
  "downloadUrl"     VARCHAR(2000),
  "expiresAt"       TIMESTAMPTZ,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_recordings"
    ADD CONSTRAINT "meeting_recordings_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_recordings"
    ADD CONSTRAINT "meeting_recordings_startedById_fkey"
    FOREIGN KEY ("startedById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_recordings_meetingId_idx" ON "meeting_recordings"("meetingId");
CREATE INDEX IF NOT EXISTS "meeting_recordings_status_idx"    ON "meeting_recordings"("status");

-- ---------------------------------------------------------------------------
-- 6. Create meeting_transcripts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_transcripts" (
  "id"          TEXT NOT NULL,
  "meetingId"   TEXT NOT NULL,
  "recordingId" TEXT,
  "status"      "TranscriptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "content"     TEXT,
  "segments"    JSONB NOT NULL DEFAULT '[]',
  "language"    VARCHAR(10) NOT NULL DEFAULT 'fr',
  "generatedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_transcripts_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_transcripts"
    ADD CONSTRAINT "meeting_transcripts_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_transcripts"
    ADD CONSTRAINT "meeting_transcripts_recordingId_fkey"
    FOREIGN KEY ("recordingId") REFERENCES "meeting_recordings"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_transcripts_meetingId_idx" ON "meeting_transcripts"("meetingId");

-- ---------------------------------------------------------------------------
-- 7. Create meeting_summaries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_summaries" (
  "id"          TEXT NOT NULL,
  "meetingId"   TEXT NOT NULL,
  "authorId"    TEXT,
  "overview"    TEXT,
  "decisions"   JSONB NOT NULL DEFAULT '[]',
  "actionItems" JSONB NOT NULL DEFAULT '[]',
  "keyPoints"   JSONB NOT NULL DEFAULT '[]',
  "nextSteps"   TEXT,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT FALSE,
  "publishedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_summaries_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_summaries"
    ADD CONSTRAINT "meeting_summaries_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_summaries"
    ADD CONSTRAINT "meeting_summaries_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_summaries_meetingId_idx" ON "meeting_summaries"("meetingId");

-- ---------------------------------------------------------------------------
-- 8. Create meeting_polls
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_polls" (
  "id"            TEXT NOT NULL,
  "meetingId"     TEXT NOT NULL,
  "createdById"   TEXT NOT NULL,
  "question"      VARCHAR(1000) NOT NULL,
  "status"        "PollStatus" NOT NULL DEFAULT 'DRAFT',
  "isAnonymous"   BOOLEAN NOT NULL DEFAULT FALSE,
  "allowMultiple" BOOLEAN NOT NULL DEFAULT FALSE,
  "startedAt"     TIMESTAMPTZ,
  "closedAt"      TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_polls_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_polls"
    ADD CONSTRAINT "meeting_polls_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_polls"
    ADD CONSTRAINT "meeting_polls_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_polls_meetingId_idx" ON "meeting_polls"("meetingId");

-- ---------------------------------------------------------------------------
-- 9. Create meeting_poll_options
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_poll_options" (
  "id"     TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "text"   VARCHAR(500) NOT NULL,
  "order"  INTEGER NOT NULL,

  CONSTRAINT "meeting_poll_options_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_poll_options"
    ADD CONSTRAINT "meeting_poll_options_pollId_fkey"
    FOREIGN KEY ("pollId") REFERENCES "meeting_polls"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_poll_options_pollId_idx" ON "meeting_poll_options"("pollId");

-- ---------------------------------------------------------------------------
-- 10. Create meeting_poll_votes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_poll_votes" (
  "id"       TEXT NOT NULL,
  "pollId"   TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "votedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_poll_votes_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_poll_votes"
    ADD CONSTRAINT "meeting_poll_votes_pollId_fkey"
    FOREIGN KEY ("pollId") REFERENCES "meeting_polls"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_poll_votes"
    ADD CONSTRAINT "meeting_poll_votes_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "meeting_poll_options"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_poll_votes"
    ADD CONSTRAINT "meeting_poll_votes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_poll_votes"
    ADD CONSTRAINT "meeting_poll_votes_pollId_optionId_userId_key"
    UNIQUE ("pollId", "optionId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_poll_votes_pollId_idx" ON "meeting_poll_votes"("pollId");

-- ---------------------------------------------------------------------------
-- 11. Create meeting_breakout_rooms
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_breakout_rooms" (
  "id"        TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "name"      VARCHAR(200) NOT NULL,
  "capacity"  INTEGER,
  "status"    "BreakoutStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "closedAt"  TIMESTAMPTZ,

  CONSTRAINT "meeting_breakout_rooms_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_breakout_rooms"
    ADD CONSTRAINT "meeting_breakout_rooms_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_breakout_rooms_meetingId_idx" ON "meeting_breakout_rooms"("meetingId");

-- ---------------------------------------------------------------------------
-- 12. Create meeting_breakout_room_participants
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_breakout_room_participants" (
  "id"       TEXT NOT NULL,
  "roomId"   TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "leftAt"   TIMESTAMPTZ,

  CONSTRAINT "meeting_breakout_room_participants_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_breakout_room_participants"
    ADD CONSTRAINT "meeting_breakout_room_participants_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "meeting_breakout_rooms"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_breakout_room_participants"
    ADD CONSTRAINT "meeting_breakout_room_participants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_breakout_room_participants"
    ADD CONSTRAINT "meeting_breakout_room_participants_roomId_userId_key"
    UNIQUE ("roomId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_breakout_room_participants_roomId_idx"
  ON "meeting_breakout_room_participants"("roomId");

-- ---------------------------------------------------------------------------
-- 13. Create meeting_reactions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_reactions" (
  "id"        TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "emoji"     VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_reactions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_reactions"
    ADD CONSTRAINT "meeting_reactions_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_reactions"
    ADD CONSTRAINT "meeting_reactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_reactions_meetingId_idx" ON "meeting_reactions"("meetingId");
CREATE INDEX IF NOT EXISTS "meeting_reactions_userId_idx"    ON "meeting_reactions"("userId");

-- ---------------------------------------------------------------------------
-- 14. Create meeting_invites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "meeting_invites" (
  "id"          TEXT NOT NULL,
  "meetingId"   TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "email"       VARCHAR(500),
  "maxUses"     INTEGER,
  "uses"        INTEGER NOT NULL DEFAULT 0,
  "expiresAt"   TIMESTAMPTZ,
  "revokedAt"   TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "meeting_invites_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "meeting_invites"
    ADD CONSTRAINT "meeting_invites_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_invites"
    ADD CONSTRAINT "meeting_invites_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "meeting_invites"
    ADD CONSTRAINT "meeting_invites_token_key" UNIQUE ("token");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "meeting_invites_meetingId_idx" ON "meeting_invites"("meetingId");
CREATE INDEX IF NOT EXISTS "meeting_invites_token_idx"     ON "meeting_invites"("token");
