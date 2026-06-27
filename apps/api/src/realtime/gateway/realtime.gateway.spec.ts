/**
 * Prinodia Workspace — RealtimeGateway unit tests v1.2.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { JwtService } from "@nestjs/jwt";

import { EventBusService } from "../events/event-bus.service";
import { EVENTS } from "../events/event-catalog";
import { WsAuthGuard } from "../guards/ws-auth.guard";
import { ConnectionManagerService } from "../services/connection-manager.service";
import { NotificationHubService } from "../services/notification-hub.service";
import { RealtimePresenceService } from "../services/presence.service";
import { RoomsService } from "../services/rooms.service";
import { RealtimeGateway } from "./realtime.gateway";

import type { AuthenticatedSocket } from "../types/socket.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSocket(overrides: Partial<AuthenticatedSocket["data"]> = {}): AuthenticatedSocket {
  return {
    id: "sock-1",
    data: {
      userId: "user-1",
      orgId: "org-1",
      displayName: "Alice",
      email: "alice@example.com",
      role: "ADMIN",
      deviceType: "WEB",
      ...overrides,
    },
    handshake: {
      headers: { "user-agent": "test-agent" },
      address: "127.0.0.1",
    },
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as AuthenticatedSocket;
}

function makeServer() {
  const emitFn = jest.fn();
  return {
    to: jest.fn().mockReturnValue({ emit: emitFn }),
    _toEmit: emitFn,
  };
}

// ─── Service mocks ───────────────────────────────────────────────────────────

const makeConnectionManager = () => ({
  register: jest.fn().mockResolvedValue(undefined),
  unregister: jest.fn().mockResolvedValue(undefined),
  heartbeat: jest.fn().mockResolvedValue(undefined),
  isOnline: jest.fn().mockResolvedValue(false),
});

const makePresenceService = () => ({
  setStatus: jest.fn().mockResolvedValue({ status: "ONLINE" }),
  clearPresence: jest.fn().mockResolvedValue(undefined),
  heartbeat: jest.fn().mockResolvedValue(undefined),
});

const makeRoomsService = () => ({
  joinDefaultRooms: jest.fn().mockResolvedValue(undefined),
  joinRoom: jest.fn().mockResolvedValue(undefined),
  leaveRoom: jest.fn().mockResolvedValue(undefined),
  leaveAllRooms: jest.fn().mockResolvedValue(undefined),
});

const makeNotificationHub = () => ({
  setServer: jest.fn(),
});

const makeEventBus = () => ({
  emit: jest.fn(),
  emitAsync: jest.fn(),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RealtimeGateway", () => {
  let gateway: RealtimeGateway;
  let connectionManager: ReturnType<typeof makeConnectionManager>;
  let presenceService: ReturnType<typeof makePresenceService>;
  let roomsService: ReturnType<typeof makeRoomsService>;
  let notificationHub: ReturnType<typeof makeNotificationHub>;
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(async () => {
    connectionManager = makeConnectionManager();
    presenceService = makePresenceService();
    roomsService = makeRoomsService();
    notificationHub = makeNotificationHub();
    eventBus = makeEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: ConnectionManagerService, useValue: connectionManager },
        { provide: RealtimePresenceService, useValue: presenceService },
        { provide: RoomsService, useValue: roomsService },
        { provide: NotificationHubService, useValue: notificationHub },
        { provide: EventBusService, useValue: eventBus },
        { provide: EventEmitter2, useValue: new EventEmitter2() },
        // WsAuthGuard requires JwtService — mock both for unit test isolation
        { provide: JwtService, useValue: { verify: jest.fn() } },
        WsAuthGuard,
      ],
    }).compile();

    gateway = module.get(RealtimeGateway);
    // Inject mock server
    const server = makeServer();
    gateway.server = server as unknown as typeof gateway.server;
  });

  // ─── afterInit ─────────────────────────────────────────────────────────────

  describe("afterInit", () => {
    it("passes server to NotificationHubService", () => {
      const mockServer = makeServer();
      gateway.afterInit(mockServer as unknown as typeof gateway.server);
      expect(notificationHub.setServer).toHaveBeenCalledWith(mockServer);
    });
  });

  // ─── handleConnection ──────────────────────────────────────────────────────

  describe("handleConnection", () => {
    it("registers connection and joins default rooms", async () => {
      const client = makeSocket();

      await gateway.handleConnection(client);

      expect(connectionManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ socketId: "sock-1", userId: "user-1", orgId: "org-1" }),
      );
      expect(roomsService.joinDefaultRooms).toHaveBeenCalledWith(
        gateway.server,
        "sock-1",
        "user-1",
        "org-1",
      );
    });

    it("emits CLIENT_CONNECTED event", async () => {
      const client = makeSocket();

      await gateway.handleConnection(client);

      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.CLIENT_CONNECTED,
        expect.objectContaining({ userId: "user-1", orgId: "org-1", socketId: "sock-1" }),
      );
    });

    it("broadcasts room_user_joined to org room", async () => {
      const client = makeSocket();
      const emitFn = jest.fn();
      (gateway.server as unknown as { to: jest.Mock }).to = jest.fn().mockReturnValue({ emit: emitFn });

      await gateway.handleConnection(client);

      expect(emitFn).toHaveBeenCalledWith(
        "room_user_joined",
        expect.objectContaining({ userId: "user-1", displayName: "Alice" }),
      );
    });
  });

  // ─── handleDisconnect ──────────────────────────────────────────────────────

  describe("handleDisconnect", () => {
    it("unregisters connection and emits CLIENT_DISCONNECTED", async () => {
      const client = makeSocket();
      connectionManager.isOnline.mockResolvedValue(false);

      await gateway.handleDisconnect(client);

      expect(connectionManager.unregister).toHaveBeenCalledWith("sock-1", "user-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.CLIENT_DISCONNECTED,
        expect.objectContaining({ userId: "user-1", socketId: "sock-1" }),
      );
    });

    it("clears presence when no more connections remain", async () => {
      const client = makeSocket();
      connectionManager.isOnline.mockResolvedValue(false);

      await gateway.handleDisconnect(client);

      expect(presenceService.clearPresence).toHaveBeenCalledWith("user-1", "org-1");
    });

    it("does NOT clear presence when other sockets remain", async () => {
      const client = makeSocket();
      connectionManager.isOnline.mockResolvedValue(true);

      await gateway.handleDisconnect(client);

      expect(presenceService.clearPresence).not.toHaveBeenCalled();
    });

    it("no-ops when socket has no user data", async () => {
      const client = {
        id: "sock-anon",
        data: {},
      } as unknown as AuthenticatedSocket;

      await expect(gateway.handleDisconnect(client)).resolves.not.toThrow();
      expect(connectionManager.unregister).not.toHaveBeenCalled();
    });
  });

  // ─── handleHeartbeat ───────────────────────────────────────────────────────

  describe("handleHeartbeat", () => {
    it("returns ok with serverTime", async () => {
      const client = makeSocket();

      const result = await gateway.handleHeartbeat(client);

      expect(result.ok).toBe(true);
      expect(result.serverTime).toBeDefined();
      expect(connectionManager.heartbeat).toHaveBeenCalledWith("sock-1", "user-1");
      expect(presenceService.heartbeat).toHaveBeenCalledWith("user-1", "org-1");
    });
  });

  // ─── handleJoinRoom ────────────────────────────────────────────────────────

  describe("handleJoinRoom", () => {
    it("joins the requested room and emits ROOM_JOINED", async () => {
      const client = makeSocket();

      const result = await gateway.handleJoinRoom(client, {
        roomId: "ch-123",
        roomType: "CHANNEL",
      });

      expect(result.ok).toBe(true);
      expect(roomsService.joinRoom).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.ROOM_JOINED,
        expect.objectContaining({ roomId: "ch-123", roomType: "CHANNEL" }),
      );
    });

    it("throws WsException when roomId is missing", async () => {
      const client = makeSocket();

      await expect(
        gateway.handleJoinRoom(client, { roomId: "", roomType: "CHANNEL" }),
      ).rejects.toThrow();
    });
  });

  // ─── handleLeaveRoom ───────────────────────────────────────────────────────

  describe("handleLeaveRoom", () => {
    it("leaves the room and emits ROOM_LEFT", async () => {
      const client = makeSocket();

      const result = await gateway.handleLeaveRoom(client, { roomId: "ch-123" });

      expect(result.ok).toBe(true);
      expect(roomsService.leaveRoom).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.ROOM_LEFT,
        expect.objectContaining({ roomId: "ch-123" }),
      );
    });
  });

  // ─── handleSetPresence ─────────────────────────────────────────────────────

  describe("handleSetPresence", () => {
    it("delegates to presenceService.setStatus", async () => {
      const client = makeSocket();

      const result = await gateway.handleSetPresence(client, {
        status: "BUSY",
        statusMessage: "In a meeting",
      });

      expect(result.ok).toBe(true);
      expect(presenceService.setStatus).toHaveBeenCalledWith(
        "user-1",
        "org-1",
        "BUSY",
        "In a meeting",
      );
    });
  });

  // ─── handlePresenceUpdated ─────────────────────────────────────────────────

  describe("handlePresenceUpdated", () => {
    it("broadcasts presence_update to org room", () => {
      const emitFn = jest.fn();
      (gateway.server as unknown as { to: jest.Mock }).to = jest.fn().mockReturnValue({ emit: emitFn });

      gateway.handlePresenceUpdated({
        userId: "user-1",
        orgId: "org-1",
        status: "AWAY",
        occurredAt: new Date().toISOString(),
      });

      expect(emitFn).toHaveBeenCalledWith(
        "presence_update",
        expect.objectContaining({ userId: "user-1", status: "AWAY" }),
      );
    });
  });

  // ─── handleActivityBroadcast ───────────────────────────────────────────────

  describe("handleActivityBroadcast", () => {
    it("broadcasts activity event to org room", () => {
      const emitFn = jest.fn();
      (gateway.server as unknown as { to: jest.Mock }).to = jest.fn().mockReturnValue({ emit: emitFn });

      gateway.handleActivityBroadcast({
        orgId: "org-1",
        actorId: "user-1",
        actorName: "Alice",
        eventType: "document.created",
        resourceType: "document",
        resourceId: "doc-1",
        summary: "created a document",
        occurredAt: new Date().toISOString(),
      });

      expect(emitFn).toHaveBeenCalledWith(
        "activity",
        expect.objectContaining({ actorId: "user-1", eventType: "document.created" }),
      );
    });
  });

  // ─── handleTypingStart / Stop ──────────────────────────────────────────────

  describe("typing events", () => {
    it("forwards typing_start to room peers", () => {
      const client = makeSocket();
      const emitFn = jest.fn();
      (client.to as jest.Mock).mockReturnValue({ emit: emitFn });

      gateway.handleTypingStart(client, { roomId: "ch-1" });

      expect(client.to).toHaveBeenCalledWith("ch-1");
      expect(emitFn).toHaveBeenCalledWith(
        "typing_start",
        expect.objectContaining({ roomId: "ch-1", userId: "user-1", displayName: "Alice" }),
      );
    });

    it("forwards typing_stop to room peers", () => {
      const client = makeSocket();
      const emitFn = jest.fn();
      (client.to as jest.Mock).mockReturnValue({ emit: emitFn });

      gateway.handleTypingStop(client, { roomId: "ch-1" });

      expect(client.to).toHaveBeenCalledWith("ch-1");
      expect(emitFn).toHaveBeenCalledWith(
        "typing_stop",
        expect.objectContaining({ roomId: "ch-1", userId: "user-1" }),
      );
    });
  });
});
