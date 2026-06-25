-- ============================================================
-- v0.6.3 — Performance: compound indexes
-- ============================================================
-- CONCURRENTLY avoids table-lock during index build on live DB.
-- Note: Prisma CLI does not support CONCURRENTLY — run manually
-- on production after applying this migration.

-- audit_logs: filter by user + date range (timeline queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_userId_createdAt_idx"
  ON "audit_logs"("userId", "createdAt" DESC);

-- audit_logs: filter by action + date range (dashboard stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_action_createdAt_idx"
  ON "audit_logs"("action", "createdAt" DESC);

-- user_sessions: active sessions per user (session management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_sessions_userId_isActive_idx"
  ON "user_sessions"("userId", "isActive");
