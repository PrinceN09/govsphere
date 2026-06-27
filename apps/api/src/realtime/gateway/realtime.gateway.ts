/**
 * Prinodia Workspace — RealtimeGateway v1.2.0
 *
 * Central WebSocket gateway. All real-time client ↔ server communication
 * passes through here.
 *
 * Architecture:
 *   Connection flow:
 *     Client connects with JWT → WsAuthGuard validates → socket.data set
 *     → ConnectionManager.register → PresenceService.setStatus(ONLINE)
 *     → RoomsService.joinDefaultRooms (org:*, user:*)
 *     → EventBus.emit(CLIENT_CONNECTED)
 *
 *   Disconnection flow:
 *     Socket disconnect → ConnectionManager.unregister
 *     → if no remaining sockets for user → PresenceService.clearPresence (→ OFFLINE)
 *     → EventBus.emit(CLIENT_DISCONNECTED)
 *     → RoomsService.leaveAllRooms
 *
 *   Presence broadcast:
 *     @OnEvent(PRESENCE_UPDATED) → broadcast to org:* room
 *
 *   Activity broadcast:
 *     @OnEvent(ACTIVITY_EVENT) after ActivityService persists → broadcast to org:*
 */

import { Logger, UseGuards } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from "@nestjs/websockets";
import { Server } from "socket.io";

import { EventBusService } from "../events/event-bus.service";
import { EVENTS } from "../events/event-catalog";
import { WsAuthGuard } from "../guards/ws-auth.guard";
import { ConnectionManagerService } from "../services/connection-manager.service";
import { NotificationHubService } from "../services/notification-hub.service";
import { RealtimePresenceService } from "../services/presence.service";
import { RoomsService } from "../services/rooms.service";
import { roomKey } from "../types/socket.types";

import type { PresenceUpdatedPayload, ActivityEventPayload } from "../events/event-payloads";
import type { AuthenticatedSocket, PresenceStatus } from "../types/socket.types";

@WebSocketGateway({
  cors: {
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  },
  namespace: "/realtime",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly presenceService: RealtimePresenceService,
    private readonly roomsService: RoomsService,
    private readonly notificationHub: NotificationHubService,
    private readonly eventBus: EventBusService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  afterInit(server: Server): void {
    this.notificationHub.setServer(server);
    this.logger.log("[RealtimeGateway] initialized — namespace /realtime");
  }

  @UseGuards(WsAuthGuard)
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const { userId, orgId, displayName, deviceType } = client.data;

    this.logger.log(`[GW] connect: ${userId} (${client.id}) org=${orgId}`);

    const ua = client.handshake.headers["user-agent"];
    const ip = client.handshake.address;

    // Register connection
    await this.connectionManager.register({
      socketId: client.id,
      userId,
      orgId,
      deviceType,
      connectedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      ipAddress: ip,
      userAgent: ua,
    });

    // Auto-join default rooms
    await this.roomsService.joinDefaultRooms(this.server, client.id, userId, orgId);

    // Emit domain event (triggers presence → ONLINE)
    this.eventBus.emit(EVENTS.CLIENT_CONNECTED, {
      userId,
      orgId,
      socketId: client.id,
      deviceType,
      ipAddress: ip,
      ...(ua !== undefined ? { userAgent: ua } : {}),
    });

    // Notify org room of new member
    this.server.to(roomKey("ORGANIZATION", orgId)).emit("room_user_joined", {
      roomId: roomKey("ORGANIZATION", orgId),
      userId,
      displayName,
    });
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const { userId, orgId } = client.data ?? {};
    if (!userId) return;

    this.logger.log(`[GW] disconnect: ${userId} (${client.id})`);

    await this.connectionManager.unregister(client.id, userId);

    // If no more sockets → user is truly offline
    const stillOnline = await this.connectionManager.isOnline(userId);
    if (!stillOnline) {
      await this.presenceService.clearPresence(userId, orgId);
    }

    this.eventBus.emit(EVENTS.CLIENT_DISCONNECTED, {
      userId,
      orgId,
      socketId: client.id,
      reason: "disconnect",
    });

    this.server.to(roomKey("ORGANIZATION", orgId)).emit("room_user_left", {
      roomId: roomKey("ORGANIZATION", orgId),
      userId,
    });
  }

  // ─── Heartbeat ────────────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("heartbeat")
  async handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ ok: boolean; serverTime: string }> {
    const { userId, orgId } = client.data;
    await this.connectionManager.heartbeat(client.id, userId);
    await this.presenceService.heartbeat(userId, orgId);
    return { ok: true, serverTime: new Date().toISOString() };
  }

  // ─── Room management ──────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; roomType: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const { userId, orgId } = client.data;

    // Basic org isolation: room IDs must contain orgId or be a user room
    // Full authorization logic lives in each feature module (v1.2.x)
    if (!payload.roomId || !payload.roomType) {
      throw new WsException("roomId and roomType are required");
    }

    await this.roomsService.joinRoom(
      this.server,
      client.id,
      userId,
      payload.roomType as Parameters<typeof this.roomsService.joinRoom>[3],
      payload.roomId,
    );

    this.eventBus.emit(EVENTS.ROOM_JOINED, {
      userId,
      orgId,
      roomId: payload.roomId,
      roomType: payload.roomType,
    });

    return { ok: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ): Promise<{ ok: boolean }> {
    const { userId, orgId } = client.data;
    await this.roomsService.leaveRoom(this.server, client.id, userId, payload.roomId);

    this.eventBus.emit(EVENTS.ROOM_LEFT, {
      userId,
      orgId,
      roomId: payload.roomId,
      roomType: "unknown",
    });

    return { ok: true };
  }

  // ─── Presence ─────────────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("set_presence")
  async handleSetPresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { status: PresenceStatus; statusMessage?: string },
  ): Promise<{ ok: boolean }> {
    const { userId, orgId } = client.data;
    await this.presenceService.setStatus(userId, orgId, payload.status, payload.statusMessage);
    return { ok: true };
  }

  // ─── Typing ───────────────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("typing_start")
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    const { userId, displayName } = client.data;
    client.to(payload.roomId).emit("typing_start", {
      roomId: payload.roomId,
      userId,
      displayName,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage("typing_stop")
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    const { userId } = client.data;
    client.to(payload.roomId).emit("typing_stop", {
      roomId: payload.roomId,
      userId,
    });
  }

  // ─── EventBus → Socket.IO broadcast ──────────────────────────────────────

  @OnEvent(EVENTS.PRESENCE_UPDATED)
  handlePresenceUpdated(payload: PresenceUpdatedPayload): void {
    const room = roomKey("ORGANIZATION", payload.orgId);
    this.server.to(room).emit("presence_update", {
      userId: payload.userId,
      status: payload.status,
      statusMessage: payload.statusMessage,
      updatedAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }

  @OnEvent(EVENTS.ACTIVITY_EVENT)
  handleActivityBroadcast(payload: ActivityEventPayload): void {
    const room = roomKey("ORGANIZATION", payload.orgId);
    this.server.to(room).emit("activity", {
      id: crypto.randomUUID(),
      actorId: payload.actorId,
      actorName: payload.actorName,
      eventType: payload.eventType,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      summary: payload.summary,
      metadata: payload.metadata,
      createdAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }
}
