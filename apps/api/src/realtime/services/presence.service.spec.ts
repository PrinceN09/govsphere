/**
 * Prinodia Workspace — RealtimePresenceService unit tests v1.2.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { EventBusService } from "../events/event-bus.service";
import { EVENTS } from "../events/event-catalog";
import { RealtimePresenceService } from "./presence.service";

const makeRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  mGet: jest.fn(),
});

const makeEventBus = () => ({
  emit: jest.fn(),
  emitAsync: jest.fn(),
});

describe("RealtimePresenceService", () => {
  let service: RealtimePresenceService;
  let redis: ReturnType<typeof makeRedis>;
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(async () => {
    redis = makeRedis();
    eventBus = makeEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimePresenceService,
        { provide: RedisService, useValue: redis },
        { provide: EventBusService, useValue: eventBus },
        { provide: EventEmitter2, useValue: new EventEmitter2() },
      ],
    }).compile();

    service = module.get(RealtimePresenceService);
  });

  // ─── setStatus ──────────────────────────────────────────────────────────────

  describe("setStatus", () => {
    it("stores presence record in Redis and emits PRESENCE_UPDATED", async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue("OK");

      const record = await service.setStatus("user-1", "org-1", "ONLINE");

      expect(record.userId).toBe("user-1");
      expect(record.status).toBe("ONLINE");
      expect(record.previousStatus).toBeUndefined();
      expect(redis.set).toHaveBeenCalledWith(
        "presence:user-1",
        expect.stringContaining('"status":"ONLINE"'),
        600,
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.PRESENCE_UPDATED,
        expect.objectContaining({ userId: "user-1", status: "ONLINE" }),
      );
    });

    it("tracks previousStatus when updating from an existing state", async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ userId: "user-1", orgId: "org-1", status: "AWAY", updatedAt: new Date().toISOString() }),
      );
      redis.set.mockResolvedValue("OK");

      const record = await service.setStatus("user-1", "org-1", "ONLINE");

      expect(record.previousStatus).toBe("AWAY");
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.PRESENCE_UPDATED,
        expect.objectContaining({ previousStatus: "AWAY" }),
      );
    });

    it("includes statusMessage in record when provided", async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue("OK");

      const record = await service.setStatus("user-1", "org-1", "BUSY", "In a call");

      expect(record.statusMessage).toBe("In a call");
    });
  });

  // ─── getStatus ──────────────────────────────────────────────────────────────

  describe("getStatus", () => {
    it("returns OFFLINE record when no Redis entry exists", async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getStatus("user-99");

      expect(result.status).toBe("OFFLINE");
      expect(result.userId).toBe("user-99");
    });

    it("returns parsed record when Redis entry exists", async () => {
      const stored = {
        userId: "user-1",
        orgId: "org-1",
        status: "BUSY",
        statusMessage: "Do not disturb",
        previousStatus: undefined,
        updatedAt: new Date().toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(stored));

      const result = await service.getStatus("user-1");

      expect(result.status).toBe("BUSY");
      expect(result.statusMessage).toBe("Do not disturb");
    });
  });

  // ─── getBulkStatus ──────────────────────────────────────────────────────────

  describe("getBulkStatus", () => {
    it("returns OFFLINE for missing users and parsed records for present ones", async () => {
      const stored = JSON.stringify({
        userId: "user-1",
        orgId: "org-1",
        status: "ONLINE",
        updatedAt: new Date().toISOString(),
      });
      redis.mGet.mockResolvedValue([stored, null]);

      const results = await service.getBulkStatus(["user-1", "user-2"]);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe("ONLINE");
      expect(results[1]?.status).toBe("OFFLINE");
    });

    it("returns empty array for empty input", async () => {
      const results = await service.getBulkStatus([]);
      expect(results).toEqual([]);
    });
  });

  // ─── heartbeat ──────────────────────────────────────────────────────────────

  describe("heartbeat", () => {
    it("sets user ONLINE when no existing record", async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue("OK");

      await service.heartbeat("user-1", "org-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.PRESENCE_UPDATED,
        expect.objectContaining({ status: "ONLINE" }),
      );
    });

    it("refreshes TTL when user is already ONLINE", async () => {
      const stored = JSON.stringify({
        userId: "user-1",
        orgId: "org-1",
        status: "ONLINE",
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(stored);
      redis.expire.mockResolvedValue(1);

      await service.heartbeat("user-1", "org-1");

      expect(redis.expire).toHaveBeenCalledWith("presence:user-1", 600);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it("transitions user from AWAY to ONLINE on heartbeat", async () => {
      const stored = JSON.stringify({
        userId: "user-1",
        orgId: "org-1",
        status: "AWAY",
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(stored);
      redis.set.mockResolvedValue("OK");

      await service.heartbeat("user-1", "org-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.PRESENCE_UPDATED,
        expect.objectContaining({ status: "ONLINE" }),
      );
    });
  });

  // ─── clearPresence ──────────────────────────────────────────────────────────

  describe("clearPresence", () => {
    it("deletes Redis key and emits USER_OFFLINE", async () => {
      redis.del.mockResolvedValue(1);

      await service.clearPresence("user-1", "org-1");

      expect(redis.del).toHaveBeenCalledWith("presence:user-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.USER_OFFLINE,
        expect.objectContaining({ userId: "user-1", status: "OFFLINE" }),
      );
    });
  });

  // ─── Event handlers ─────────────────────────────────────────────────────────

  describe("handleClientConnected", () => {
    it("sets ONLINE when no existing presence", async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue("OK");

      await service.handleClientConnected({
        userId: "user-1",
        orgId: "org-1",
        socketId: "sock-1",
        deviceType: "WEB",
        occurredAt: new Date().toISOString(),
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.PRESENCE_UPDATED,
        expect.objectContaining({ status: "ONLINE" }),
      );
    });

    it("does NOT override IN_MEETING status on reconnect", async () => {
      const stored = JSON.stringify({
        userId: "user-1",
        orgId: "org-1",
        status: "IN_MEETING",
        updatedAt: new Date().toISOString(),
      });
      redis.get.mockResolvedValue(stored);

      await service.handleClientConnected({
        userId: "user-1",
        orgId: "org-1",
        socketId: "sock-2",
        deviceType: "WEB",
        occurredAt: new Date().toISOString(),
      });

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
