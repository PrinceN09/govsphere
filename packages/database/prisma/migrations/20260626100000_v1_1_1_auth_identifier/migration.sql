-- ============================================================================
-- Migration: v1.1.1 — Authentication Identifier Modernization
-- Adds universal `username` field to the User model.
-- Backward compatible: matriculeNumber is preserved, not renamed or removed.
-- ============================================================================

-- Add username column (nullable, unique)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username" VARCHAR(100);

-- Unique constraint on username (nulls are not considered duplicates in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");