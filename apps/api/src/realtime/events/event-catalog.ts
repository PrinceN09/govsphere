/**
 * Prinodia Workspace — Realtime Event Catalog v1.2.0
 *
 * Centralized registry of every domain event the platform can emit.
 * All event names follow the pattern:  <Domain>.<Action>
 * All consumers use these constants — never hardcoded strings.
 *
 * Design goals:
 *  - In-process delivery via EventEmitter2 (current)
 *  - Redis pub/sub bridge ready (future horizontal scaling)
 *  - One event triggers: WebSocket broadcast + audit log + activity feed
 */

// ─── Identity & Auth ──────────────────────────────────────────────────────────
export const EVENTS = {
  // Auth
  USER_LOGGED_IN: "auth.user.logged_in",
  USER_LOGGED_OUT: "auth.user.logged_out",
  USER_SESSION_EXPIRED: "auth.user.session_expired",

  // Organization / Workspace
  ORGANIZATION_CREATED: "organization.created",
  ORGANIZATION_UPDATED: "organization.updated",

  // Users
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_INVITED: "user.invited",
  USER_ACTIVATED: "user.activated",
  USER_SUSPENDED: "user.suspended",

  // Presence (v1.2.0)
  USER_ONLINE: "presence.user.online",
  USER_OFFLINE: "presence.user.offline",
  USER_AWAY: "presence.user.away",
  USER_BUSY: "presence.user.busy",
  USER_IN_MEETING: "presence.user.in_meeting",
  USER_ON_CALL: "presence.user.on_call",
  PRESENCE_UPDATED: "presence.updated",

  // Connections (v1.2.0)
  CLIENT_CONNECTED: "connection.client_connected",
  CLIENT_DISCONNECTED: "connection.client_disconnected",
  CLIENT_HEARTBEAT: "connection.client_heartbeat",

  // Rooms (v1.2.0)
  ROOM_JOINED: "room.joined",
  ROOM_LEFT: "room.left",

  // Typing (v1.2.0 — infrastructure for Chat)
  TYPING_START: "typing.start",
  TYPING_STOP: "typing.stop",

  // Chat / Messages (future v1.2.x Chat UI)
  MESSAGE_SENT: "message.sent",
  MESSAGE_EDITED: "message.edited",
  MESSAGE_DELETED: "message.deleted",
  MESSAGE_REACTION_ADDED: "message.reaction_added",

  // Meetings (v0.9.0+)
  MEETING_CREATED: "meeting.created",
  MEETING_STARTED: "meeting.started",
  MEETING_ENDED: "meeting.ended",
  MEETING_PARTICIPANT_JOINED: "meeting.participant_joined",
  MEETING_PARTICIPANT_LEFT: "meeting.participant_left",

  // Canvas (future v1.4.0)
  CANVAS_OPENED: "canvas.opened",
  CANVAS_UPDATED: "canvas.updated",
  CANVAS_CLOSED: "canvas.closed",

  // Documents (v0.8.0+)
  DOCUMENT_CREATED: "document.created",
  DOCUMENT_UPDATED: "document.updated",
  DOCUMENT_SHARED: "document.shared",
  DOCUMENT_APPROVED: "document.approved",

  // Workflows (v0.8.1+)
  WORKFLOW_SUBMITTED: "workflow.submitted",
  WORKFLOW_APPROVED: "workflow.approved",
  WORKFLOW_REJECTED: "workflow.rejected",
  WORKFLOW_COMPLETED: "workflow.completed",

  // Tasks (future v1.6.0)
  TASK_CREATED: "task.created",
  TASK_ASSIGNED: "task.assigned",
  TASK_COMPLETED: "task.completed",
  TASK_UPDATED: "task.updated",

  // Notifications (v1.2.0)
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_READ: "notification.read",

  // Activity (v1.2.0)
  ACTIVITY_EVENT: "activity.event",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
