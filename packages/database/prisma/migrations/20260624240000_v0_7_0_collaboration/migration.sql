-- GovSphere v0.7.0 — Collaboration Platform Migration
-- Adds: PresenceStatus, ConversationType enums
--       Conversation, ConversationMember, DirectMessage, DMReaction,
--       ConversationSettings, Mention, ReadReceipt tables
-- Alters: channels (slug, divisionId, provinceId, archivedAt, archivedById, memberCount, lastMessageAt)
--         channel_members (muteNotifications, leftAt)
--         messages (compound index on channelId+createdAt)
-- Extends: AuditAction enum with collaboration values

-- ---------------------------------------------------------------------------
-- 1. New ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE "PresenceStatus" AS ENUM (
  'ONLINE', 'AWAY', 'BUSY', 'DO_NOT_DISTURB', 'OFFLINE'
);

CREATE TYPE "ConversationType" AS ENUM (
  'DIRECT', 'GROUP'
);

-- ---------------------------------------------------------------------------
-- 2. Extend AuditAction enum (Postgres: add values to existing type)
-- ---------------------------------------------------------------------------

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MESSAGE_EDITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CHANNEL_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CHANNEL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONVERSATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DIRECT_MESSAGE_DELETED';

-- ---------------------------------------------------------------------------
-- 3. Alter channels table
-- ---------------------------------------------------------------------------

ALTER TABLE "channels"
  ADD COLUMN IF NOT EXISTS "slug"          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "divisionId"    TEXT,
  ADD COLUMN IF NOT EXISTS "provinceId"    TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedById"  TEXT,
  ADD COLUMN IF NOT EXISTS "memberCount"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);

ALTER TABLE "channels"
  ADD CONSTRAINT IF NOT EXISTS "channels_divisionId_fkey"
    FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS "channels_provinceId_fkey"
    FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE SET NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "channels_divisionId_idx"  ON "channels"("divisionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "channels_provinceId_idx"  ON "channels"("provinceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "channels_isArchived_idx"  ON "channels"("isArchived");

-- ---------------------------------------------------------------------------
-- 4. Alter channel_members table
-- ---------------------------------------------------------------------------

ALTER TABLE "channel_members"
  ADD COLUMN IF NOT EXISTS "muteNotifications" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "leftAt"            TIMESTAMP(3);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "channel_members_channelId_lastReadAt_idx"
  ON "channel_members"("channelId", "lastReadAt");

-- ---------------------------------------------------------------------------
-- 5. Alter messages table — compound index for cursor pagination
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS "messages_channelId_createdAt_idx"
  ON "messages"("channelId", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- 6. Create mentions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "mentions" (
  "id"            TEXT         NOT NULL,
  "messageId"     TEXT         NOT NULL,
  "channelId"     TEXT         NOT NULL,
  "userId"        TEXT         NOT NULL,
  "mentionedById" TEXT         NOT NULL,
  "isRead"        BOOLEAN      NOT NULL DEFAULT FALSE,
  "readAt"        TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mentions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mentions_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE,
  CONSTRAINT "mentions_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE,
  CONSTRAINT "mentions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "mentions_userId_isRead_idx" ON "mentions"("userId", "isRead");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "mentions_messageId_idx"     ON "mentions"("messageId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "mentions_channelId_idx"     ON "mentions"("channelId");

-- ---------------------------------------------------------------------------
-- 7. Create read_receipts table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "read_receipts" (
  "id"        TEXT         NOT NULL,
  "messageId" TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "readAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "read_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "read_receipts_messageId_userId_key" UNIQUE ("messageId", "userId"),
  CONSTRAINT "read_receipts_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE,
  CONSTRAINT "read_receipts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "read_receipts_messageId_idx" ON "read_receipts"("messageId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "read_receipts_userId_idx"    ON "read_receipts"("userId");

-- ---------------------------------------------------------------------------
-- 8. Create conversations table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"            TEXT                  NOT NULL,
  "type"          "ConversationType"    NOT NULL DEFAULT 'DIRECT',
  "name"          VARCHAR(255),
  "avatarUrl"     VARCHAR(500),
  "createdById"   TEXT                  NOT NULL,
  "isArchived"    BOOLEAN               NOT NULL DEFAULT FALSE,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversations_createdById_idx"   ON "conversations"("createdById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- ---------------------------------------------------------------------------
-- 9. Create conversation_members table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "conversation_members" (
  "id"             TEXT         NOT NULL,
  "conversationId" TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt"         TIMESTAMP(3),

  CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_members_conversationId_userId_key" UNIQUE ("conversationId", "userId"),
  CONSTRAINT "conversation_members_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_members_conversationId_idx" ON "conversation_members"("conversationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_members_userId_idx"         ON "conversation_members"("userId");

-- ---------------------------------------------------------------------------
-- 10. Create direct_messages table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id"             TEXT             NOT NULL,
  "conversationId" TEXT             NOT NULL,
  "senderId"       TEXT             NOT NULL,
  "type"           "MessageType"    NOT NULL DEFAULT 'TEXT',
  "content"        TEXT             NOT NULL,
  "replyToId"      TEXT,
  "editedAt"       TIMESTAMP(3),
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "direct_messages_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id"),
  CONSTRAINT "direct_messages_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "direct_messages"("id")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "direct_messages_conversationId_createdAt_idx"
  ON "direct_messages"("conversationId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- ---------------------------------------------------------------------------
-- 11. Create dm_reactions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "dm_reactions" (
  "id"        TEXT         NOT NULL,
  "messageId" TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "emoji"     VARCHAR(20)  NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dm_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dm_reactions_messageId_userId_emoji_key" UNIQUE ("messageId", "userId", "emoji"),
  CONSTRAINT "dm_reactions_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "direct_messages"("id") ON DELETE CASCADE,
  CONSTRAINT "dm_reactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "dm_reactions_messageId_idx" ON "dm_reactions"("messageId");

-- ---------------------------------------------------------------------------
-- 12. Create conversation_settings table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "conversation_settings" (
  "id"                TEXT         NOT NULL,
  "conversationId"    TEXT         NOT NULL,
  "userId"            TEXT         NOT NULL,
  "muteNotifications" BOOLEAN      NOT NULL DEFAULT FALSE,
  "mutedUntil"        TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_settings_conversationId_userId_key" UNIQUE ("conversationId", "userId"),
  CONSTRAINT "conversation_settings_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_settings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_settings_conversationId_idx"
  ON "conversation_settings"("conversationId");
