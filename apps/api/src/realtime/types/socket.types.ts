/**
 * Prinodia Workspace — WebSocket Type Definitions v1.2.0
 *
 * Shared type contracts for the WebSocket gateway.
 * Used by gateway, guards, services, and the client SDK.
 *
 * Note: PresenceStatus and DeviceType are defined as string literals here
 * because the Prisma sandbox (403) blocks prisma generate; the new enum
 * values are not yet in the generated client. Pattern matches v1.1.1.
 */

import type { Socket, Server } from "socket.io";

// Local string-literal types (Prisma sandbox — not yet generated)
export type PresenceStatus =
  | "ONLINE"
  | "AWAY"
  | "BUSY"
  | "DO_NOT_DISTURB"
  | "IN_MEETING"
  | "ON_CALL"
  | "OFFLINE";

export type DeviceType = "WEB" | "DESKTOP" | "MOBILE" | "API";

// ─── Authenticated Socket ─────────────────────────────────────────────────────

/** Extended Socket.IO Socket with authenticated user data attached */
export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    orgId: string;
    displayName: string;
    email: string;
    role: string;
    deviceType: DeviceType;
  };
}

export type RealtimeServer = Server;

// ─── Client → Server Events ────────────────────────────────────────────────────

export interface ClientToServerEvents {
  heartbeat: (cb?: (ack: { ok: boolean; serverTime: string }) => void) => void;
  join_room: (
    payload: { roomId: string; roomType: string },
    cb?: (ack: { ok: boolean; error?: string }) => void,
  ) => void;
  leave_room: (payload: { roomId: string }, cb?: (ack: { ok: boolean }) => void) => void;
  set_presence: (
    payload: { status: PresenceStatus; statusMessage?: string },
    cb?: (ack: { ok: boolean }) => void,
  ) => void;
  typing_start: (payload: { roomId: string }) => void;
  typing_stop: (payload: { roomId: string }) => void;
}

// ─── Server → Client Events ────────────────────────────────────────────────────

export interface ServerToClientEvents {
  presence_update: (payload: {
    userId: string;
    status: PresenceStatus;
    statusMessage?: string;
    updatedAt: string;
  }) => void;

  notification: (payload: {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    createdAt: string;
  }) => void;

  activity: (payload: {
    id: string;
    actorId: string;
    actorName: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    summary: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }) => void;

  room_user_joined: (payload: { roomId: string; userId: string; displayName: string }) => void;

  room_user_left: (payload: { roomId: string; userId: string }) => void;

  typing_start: (payload: { roomId: string; userId: string; displayName: string }) => void;

  typing_stop: (payload: { roomId: string; userId: string }) => void;

  error: (payload: { code: string; message: string }) => void;
  kicked: (payload: { reason: string }) => void;
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

export type RoomId = string;

export function roomKey(type: string, id: string): RoomId {
  const prefixes: Record<string, string> = {
    WORKSPACE: "ws",
    ORGANIZATION: "org",
    DEPARTMENT: "dept",
    CHANNEL: "ch",
    MEETING: "meet",
    CANVAS: "canvas",
    PROJECT: "proj",
    DOCUMENT: "doc",
    USER: "user",
  };
  const prefix = prefixes[type.toUpperCase()] ?? type.toLowerCase();
  return `${prefix}:${id}`;
}
