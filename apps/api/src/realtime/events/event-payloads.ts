/**
 * Prinodia Workspace — Realtime Event Payload Interfaces v1.2.0
 *
 * Every event emitted on the EventBus carries a typed payload.
 * These interfaces are the contract between publishers and subscribers.
 */

// Local string-literal types (Prisma sandbox — new enum values not yet generated)
type PresenceStatus =
  | "ONLINE"
  | "AWAY"
  | "BUSY"
  | "DO_NOT_DISTURB"
  | "IN_MEETING"
  | "ON_CALL"
  | "OFFLINE";

type DeviceType = "WEB" | "DESKTOP" | "MOBILE" | "API";

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BaseEventPayload {
  /** ISO timestamp of when the event occurred */
  occurredAt: string;
  /** Correlation ID — matches the HTTP requestId if triggered by an HTTP action */
  correlationId?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserLoggedInPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserLoggedOutPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export interface PresenceUpdatedPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  status: PresenceStatus;
  statusMessage?: string;
  previousStatus?: PresenceStatus;
}

// ─── Connection ───────────────────────────────────────────────────────────────

export interface ClientConnectedPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  socketId: string;
  deviceType: DeviceType;
  ipAddress?: string;
  userAgent?: string;
}

export interface ClientDisconnectedPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  socketId: string;
  reason: string;
}

export interface ClientHeartbeatPayload extends BaseEventPayload {
  userId: string;
  socketId: string;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export interface RoomJoinedPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  roomId: string;
  roomType: string;
}

export interface RoomLeftPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  roomId: string;
  roomType: string;
}

// ─── Typing ───────────────────────────────────────────────────────────────────

export interface TypingPayload extends BaseEventPayload {
  userId: string;
  orgId: string;
  roomId: string;
  displayName: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface MessageSentPayload extends BaseEventPayload {
  messageId: string;
  channelId?: string;
  conversationId?: string;
  senderId: string;
  orgId: string;
  content: string;
  mentionedUserIds?: string[];
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface MeetingCreatedPayload extends BaseEventPayload {
  meetingId: string;
  orgId: string;
  organizerId: string;
  title: string;
}

export interface MeetingStartedPayload extends BaseEventPayload {
  meetingId: string;
  orgId: string;
  organizerId: string;
}

export interface MeetingEndedPayload extends BaseEventPayload {
  meetingId: string;
  orgId: string;
  durationSeconds: number;
}

// ─── Prinodia Meet (v1.5.0) ──────────────────────────────────────────────────

export interface MeetSessionStartedPayload extends BaseEventPayload {
  meetingId: string;
  sessionId: string;
  hostId: string;
  joinToken: string;
}

export interface MeetSessionEndedPayload extends BaseEventPayload {
  meetingId: string;
  sessionId: string;
  durationSeconds: number;
  participantCount: number;
}

export interface MeetParticipantJoinedPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
  displayName: string;
  liveRole: string;
  inWaitingRoom: boolean;
}

export interface MeetParticipantLeftPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
}

export interface MeetParticipantAdmittedPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
  admittedById: string;
}

export interface MeetParticipantMutedPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
  mutedById: string;
}

export interface MeetHandPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
  displayName: string;
}

export interface MeetHostTransferredPayload extends BaseEventPayload {
  meetingId: string;
  previousHostId: string;
  newHostId: string;
}

export interface MeetReactionPayload extends BaseEventPayload {
  meetingId: string;
  userId: string;
  displayName: string;
  emoji: string;
  reactionId: string;
}

export interface MeetRecordingPayload extends BaseEventPayload {
  meetingId: string;
  recordingId: string;
  startedById: string;
}

export interface MeetPollPayload extends BaseEventPayload {
  meetingId: string;
  pollId: string;
  question: string;
}

export interface MeetPollVotedPayload extends BaseEventPayload {
  meetingId: string;
  pollId: string;
  optionId: string;
  userId: string;
}

export interface MeetBreakoutPayload extends BaseEventPayload {
  meetingId: string;
  roomId: string;
  roomName: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface DocumentCreatedPayload extends BaseEventPayload {
  documentId: string;
  orgId: string;
  authorId: string;
  title: string;
}

export interface DocumentUpdatedPayload extends BaseEventPayload {
  documentId: string;
  orgId: string;
  editorId: string;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export interface WorkflowSubmittedPayload extends BaseEventPayload {
  instanceId: string;
  orgId: string;
  submitterId: string;
  title: string;
}

export interface WorkflowApprovedPayload extends BaseEventPayload {
  instanceId: string;
  orgId: string;
  approverId: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationCreatedPayload extends BaseEventPayload {
  notificationId: string;
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityEventPayload extends BaseEventPayload {
  orgId: string;
  actorId: string;
  actorName: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

// ─── Union type for type-safe subscribers ─────────────────────────────────────

export type EventPayloadMap = {
  "auth.user.logged_in": UserLoggedInPayload;
  "auth.user.logged_out": UserLoggedOutPayload;
  "presence.updated": PresenceUpdatedPayload;
  "connection.client_connected": ClientConnectedPayload;
  "connection.client_disconnected": ClientDisconnectedPayload;
  "connection.client_heartbeat": ClientHeartbeatPayload;
  "room.joined": RoomJoinedPayload;
  "room.left": RoomLeftPayload;
  "typing.start": TypingPayload;
  "typing.stop": TypingPayload;
  "message.sent": MessageSentPayload;
  "meeting.created": MeetingCreatedPayload;
  "meeting.started": MeetingStartedPayload;
  "meeting.ended": MeetingEndedPayload;
  "meet.session.started": MeetSessionStartedPayload;
  "meet.session.ended": MeetSessionEndedPayload;
  "meet.participant.joined": MeetParticipantJoinedPayload;
  "meet.participant.left": MeetParticipantLeftPayload;
  "meet.participant.admitted": MeetParticipantAdmittedPayload;
  "meet.participant.muted": MeetParticipantMutedPayload;
  "meet.participant.muted_all": MeetParticipantMutedPayload;
  "meet.hand.raised": MeetHandPayload;
  "meet.hand.lowered": MeetHandPayload;
  "meet.host.transferred": MeetHostTransferredPayload;
  "meet.reaction": MeetReactionPayload;
  "meet.locked": BaseEventPayload & { meetingId: string };
  "meet.unlocked": BaseEventPayload & { meetingId: string };
  "meet.recording.started": MeetRecordingPayload;
  "meet.recording.stopped": MeetRecordingPayload;
  "meet.poll.started": MeetPollPayload;
  "meet.poll.closed": MeetPollPayload;
  "meet.poll.voted": MeetPollVotedPayload;
  "meet.breakout.created": MeetBreakoutPayload;
  "meet.breakout.closed": MeetBreakoutPayload;
  "document.created": DocumentCreatedPayload;
  "document.updated": DocumentUpdatedPayload;
  "workflow.submitted": WorkflowSubmittedPayload;
  "workflow.approved": WorkflowApprovedPayload;
  "notification.created": NotificationCreatedPayload;
  "activity.event": ActivityEventPayload;
};
