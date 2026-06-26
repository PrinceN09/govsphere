/**
 * Prinodia Workspace — Queue Name Constants
 *
 * Centralized queue/job name registry to avoid magic strings.
 * Import these constants in both producers (enqueue) and consumers (@Processor).
 */

export const QUEUES = {
  EMAIL: "email",
  INVITATION: "invitation",
  NOTIFICATION: "notification",
  AUDIT: "audit",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ── Email job types ───────────────────────────────────────────────────────────

export const EMAIL_JOBS = {
  PASSWORD_RESET: "password-reset",
  WELCOME: "welcome",
  INVITATION: "invitation",
  MFA_CODE: "mfa-code",
} as const;

// ── Audit job types ───────────────────────────────────────────────────────────

export const AUDIT_JOBS = {
  EXPORT_CSV: "export-csv",
  CLEANUP_OLD_LOGS: "cleanup-old-logs",
} as const;

// ── Notification job types ────────────────────────────────────────────────────

export const NOTIFICATION_JOBS = {
  IN_APP: "in-app",
  SESSION_REVOKED: "session-revoked",
  ACCOUNT_LOCKED: "account-locked",
} as const;
