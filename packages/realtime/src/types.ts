/**
 * @prinodia/realtime — Type Definitions
 *
 * Shared types for the client SDK.
 * Mirrors apps/api/src/realtime/types/socket.types.ts (client side).
 */

export type PresenceStatus =
  | "ONLINE"
  | "AWAY"
  | "BUSY"
  | "DO_NOT_DISTURB"
  | "IN_MEETING"
  | "ON_CALL"
  | "OFFLINE";

export type DeviceType = "WEB" | "DESKTOP" | "MOBILE" | "API";

export type RoomType =
  | "WORKSPACE"
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "CHANNEL"
  | "MEETING"
  | "CANVAS"
  | "PROJECT"
  | "DOCUMENT"
  | "USER";

// ─── Events: Server → Client ──────────────────────────────────────────────────

export interface PresenceUpdateEvent {
  userId: string;
  status: PresenceStatus;
  statusMessage?: string;
  updatedAt: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  actorId: string;
  actorName: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RoomUserJoinedEvent {
  roomId: string;
  userId: string;
  displayName: string;
}

export interface RoomUserLeftEvent {
  roomId: string;
  userId: string;
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  displayName?: string;
}

// ─── SDK options ──────────────────────────────────────────────────────────────

export interface RealtimeClientOptions {
  /** WebSocket server URL, e.g. "https://api.prinodia.gov.cd" */
  url: string;
  /** JWT access token */
  token: string;
  /** Device type — defaults to WEB */
  deviceType?: DeviceType;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Heartbeat interval in milliseconds (default: 30_000) */
  heartbeatInterval?: number;
}

// ─── Subscription callback map ────────────────────────────────────────────────

export interface RealtimeEventMap {
  connect: () => void;
  disconnect: (reason: string) => void;
  presence_update: (event: PresenceUpdateEvent) => void;
  notification: (event: NotificationEvent) => void;
  activity: (event: ActivityEvent) => void;
  room_user_joined: (event: RoomUserJoinedEvent) => void;
  room_user_left: (event: RoomUserLeftEvent) => void;
  typing_start: (event: TypingEvent) => void;
  typing_stop: (event: TypingEvent) => void;
  error: (event: { code: string; message: string }) => void;
}
