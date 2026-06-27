/**
 * @prinodia/realtime — RealtimeClient
 *
 * Type-safe Socket.IO client SDK for Prinodia Workspace.
 *
 * Usage:
 *   const client = new RealtimeClient({ url, token });
 *   client.connect();
 *   client.subscribe("presence_update", (e) => console.log(e));
 *   client.joinRoom("CHANNEL", channelId);
 *   client.setPresence("BUSY");
 *   client.disconnect();
 */

import { io, Socket } from "socket.io-client";

import type {
  RealtimeClientOptions,
  RealtimeEventMap,
  PresenceStatus,
  RoomType,
} from "./types";

export class RealtimeClient {
  private socket: Socket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly opts: Required<RealtimeClientOptions>;

  constructor(options: RealtimeClientOptions) {
    this.opts = {
      deviceType:        "WEB",
      autoReconnect:     true,
      heartbeatInterval: 30_000,
      ...options,
    };
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(`${this.opts.url}/realtime`, {
      auth:       { token: this.opts.token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: this.opts.autoReconnect,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
    });

    this.socket.on("connect", () => {
      this.startHeartbeat();
    });

    this.socket.on("disconnect", () => {
      this.stopHeartbeat();
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Replace the auth token (e.g. after token refresh) */
  updateToken(token: string): void {
    if (this.socket) {
      (this.socket.auth as Record<string, string>)["token"] = token;
    }
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────

  joinRoom(roomType: RoomType, roomId: string): Promise<{ ok: boolean; error?: string }> {
    return this.emit("join_room", { roomType, roomId });
  }

  leaveRoom(roomId: string): Promise<{ ok: boolean }> {
    return this.emit("leave_room", { roomId });
  }

  // ─── Presence ─────────────────────────────────────────────────────────────

  setPresence(
    status: PresenceStatus,
    statusMessage?: string,
  ): Promise<{ ok: boolean }> {
    return this.emit("set_presence", { status, statusMessage });
  }

  // ─── Typing ───────────────────────────────────────────────────────────────

  startTyping(roomId: string): void {
    this.socket?.emit("typing_start", { roomId });
  }

  stopTyping(roomId: string): void {
    this.socket?.emit("typing_stop", { roomId });
  }

  // ─── Event subscriptions ──────────────────────────────────────────────────

  subscribe<K extends keyof RealtimeEventMap>(
    event: K,
    handler: RealtimeEventMap[K],
  ): () => void {
    this.socket?.on(event as string, handler as (...args: unknown[]) => void);
    return () => {
      this.socket?.off(event as string, handler as (...args: unknown[]) => void);
    };
  }

  on<K extends keyof RealtimeEventMap>(
    event: K,
    handler: RealtimeEventMap[K],
  ): this {
    this.subscribe(event, handler);
    return this;
  }

  off<K extends keyof RealtimeEventMap>(
    event: K,
    handler: RealtimeEventMap[K],
  ): this {
    this.socket?.off(event as string, handler as (...args: unknown[]) => void);
    return this;
  }

  // ─── Notifications shorthand ──────────────────────────────────────────────

  notifications(handler: RealtimeEventMap["notification"]): () => void {
    return this.subscribe("notification", handler);
  }

  presence(handler: RealtimeEventMap["presence_update"]): () => void {
    return this.subscribe("presence_update", handler);
  }

  activity(handler: RealtimeEventMap["activity"]): () => void {
    return this.subscribe("activity", handler);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private emit<T>(event: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }
      this.socket.emit(event, payload, (ack: T) => resolve(ack));
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.socket?.emit("heartbeat", (ack: { ok: boolean }) => {
        if (!ack?.ok) console.warn("[Realtime] heartbeat failed");
      });
    }, this.opts.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
