-- =============================================================================
-- v1.4.0 — Chat Foundation
-- Adds: DEPARTMENT / ORGANIZATION / PROJECT ChannelType values,
--        organizationId on channels,
--        Draft, Bookmark, MessageHistory models.
-- SAFE: all additive. No existing rows affected.
-- =============================================================================

-- 1. Extend ChannelType enum (PostgreSQL ALTER TYPE … ADD VALUE)
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DEPARTMENT';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'ORGANIZATION';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PROJECT';

-- 2. Add organizationId to channels
ALTER TABLE "channels"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "channels"
  ADD CONSTRAINT "channels_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "channels_organizationId_idx"
  ON "channels"("organizationId");

-- 3. Draft table
CREATE TABLE IF NOT EXISTS "drafts" (
  "id"             TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "channelId"      TEXT,
  "conversationId" TEXT,
  "content"        TEXT         NOT NULL,
  "replyToId"      TEXT,
  "updatedAt"      TIMESTAMPTZ  NOT NULL,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "drafts_userId_channelId_key"
  ON "drafts"("userId", "channelId") WHERE "channelId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "drafts_userId_conversationId_key"
  ON "drafts"("userId", "conversationId") WHERE "conversationId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "drafts_userId_idx" ON "drafts"("userId");

-- 4. Bookmark table
CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "messageId" TEXT,
  "dmId"      TEXT,
  "note"      VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_dmId_fkey"
  FOREIGN KEY ("dmId") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_userId_messageId_key"
  ON "bookmarks"("userId", "messageId") WHERE "messageId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_userId_dmId_key"
  ON "bookmarks"("userId", "dmId") WHERE "dmId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "bookmarks_userId_idx" ON "bookmarks"("userId");

-- 5. MessageHistory table
CREATE TABLE IF NOT EXISTS "message_history" (
  "id"         TEXT        NOT NULL,
  "messageId"  TEXT        NOT NULL,
  "content"    TEXT        NOT NULL,
  "editedById" TEXT        NOT NULL,
  "editedAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "message_history"
  ADD CONSTRAINT "message_history_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "message_history_messageId_idx"
  ON "message_history"("messageId");
