/**
 * Client-side permission utilities.
 * Works with the permissions array stored in the NextAuth session.
 */

/** Returns true if the session's permission list contains the given permission. */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

/** Returns true if the session has ALL of the given permissions. */
export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every((p) => permissions.includes(p));
}

/** Returns true if the session has ANY of the given permissions. */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((p) => permissions.includes(p));
}

// ─── Well-known permission constants ─────────────────────────────────────────

export const PERMS = {
  MINISTRY_READ: "MINISTRY:READ",
  MINISTRY_CREATE: "MINISTRY:CREATE",
  MINISTRY_UPDATE: "MINISTRY:UPDATE",
  MINISTRY_DEACTIVATE: "MINISTRY:DEACTIVATE",

  DEPARTMENT_READ: "DEPARTMENT:READ",
  DEPARTMENT_CREATE: "DEPARTMENT:CREATE",
  DEPARTMENT_UPDATE: "DEPARTMENT:UPDATE",
  DEPARTMENT_DEACTIVATE: "DEPARTMENT:DEACTIVATE",

  DIVISION_READ: "DIVISION:READ",
  DIVISION_CREATE: "DIVISION:CREATE",
  DIVISION_UPDATE: "DIVISION:UPDATE",
  DIVISION_DEACTIVATE: "DIVISION:DEACTIVATE",

  PROVINCE_READ: "PROVINCE:READ",
  PROVINCE_CREATE: "PROVINCE:CREATE",
  PROVINCE_UPDATE: "PROVINCE:UPDATE",

  POSITION_READ: "POSITION:READ",
  POSITION_CREATE: "POSITION:CREATE",
  POSITION_UPDATE: "POSITION:UPDATE",

  ASSIGNMENT_READ: "EMPLOYEE_ASSIGNMENT:READ",
  ASSIGNMENT_CREATE: "EMPLOYEE_ASSIGNMENT:CREATE",
  ASSIGNMENT_UPDATE: "EMPLOYEE_ASSIGNMENT:UPDATE",

  USER_READ: "USER:READ",
  USER_CREATE: "USER:CREATE",
  USER_UPDATE: "USER:UPDATE",
  USER_DEACTIVATE: "USER:DEACTIVATE",

  ADMIN_VIEW_AUDIT_LOGS_ALL: "ADMIN:VIEW_AUDIT_LOGS_ALL",
  ADMIN_VIEW_AUDIT_LOGS_MINISTRY: "ADMIN:VIEW_AUDIT_LOGS_MINISTRY",
  AUTH_MANAGE_SESSIONS: "AUTH:MANAGE_SESSIONS",

  // ── Collaboration (v0.7.0) ────────────────────────────────────────────────
  CHANNEL_READ: "CHANNEL:READ",
  CHANNEL_CREATE: "CHANNEL:CREATE",
  CHANNEL_UPDATE: "CHANNEL:UPDATE",
  CHANNEL_ARCHIVE: "CHANNEL:ARCHIVE",
  CHANNEL_MANAGE_MEMBERS: "CHANNEL:MANAGE_MEMBERS",
  MESSAGE_SEND: "MESSAGE:SEND",
  MESSAGE_DELETE_ANY: "MESSAGE:DELETE_ANY",
  NOTIFICATION_READ: "NOTIFICATION:READ",
} as const;
