/**
 * Prinodia Workspace — ConnectionManagerService unit tests v1.2.0
 */

import { Test, TestingModule } from "@nestjs/testing";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ConnectionManagerService } from "./connection-manager.service";

import type { ConnectionMeta } from "./connection-manager.service";

const META: ConnectionMeta = {
  socketId: "sock-1",
  userId: "user-1",
  orgId: "org-1",
  deviceType: "WEB",
  connectedAt: new Date().toISOString(),
  lastHeartbeatAt: new Date().toISOString(),
  userAgent: "Mozilla/5.0",
  ipAddress: "127.0.0.1",
};

const makeRedis = () => ({
  hSet: jest.fn(),
  hGet: jest.fn(),
  hDel: jest.fn(),
  hGetAll: jest.fn(),
  hLen: jest.fn(),
  expire: jest.fn(),
});

const makeDb = () => ({
  userConnection: {
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

describe("ConnectionManagerService", () => {
  let service: ConnectionManagerService;
  let redis: ReturnType<typeof makeRedis>;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    redis = makeRedis();
    db = makeDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionManagerService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    service = module.get(ConnectionManagerService);
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe("register", () => {
    it("stores connection in Redis hash and DB", async () => {
      redis.hSet.mockResolvedValue(undefined);
      redis.expire.mockResolvedValue(1);

      await service.register(META);

      expect(redis.hSet).toHaveBeenCalledWith(
        "connections:user-1",
        "sock-1",
        expect.stringContaining('"socketId":"sock-1"'),
      );
      expect(redis.expire).toHaveBeenCalledWith("connections:user-1", 3600);
      expect(db.userConnection.upsert).toHaveBeenCalled();
    });

    it("does not throw when DB upsert fails (graceful degradation)", async () => {
      redis.hSet.mockResolvedValue(undefined);
      redis.expire.mockResolvedValue(1);
      db.userConnection.upsert.mockRejectedValue(new Error("DB down"));

      await expect(service.register(META)).resolves.not.toThrow();
    });
  });

  // ─── unregister ─────────────────────────────────────────────────────────────

  describe("unregister", () => {
    it("removes from Redis hash and DB", async () => {
      redis.hDel.mockResolvedValue(1);

      await service.unregister("sock-1", "user-1");

      expect(redis.hDel).toHaveBeenCalledWith("connections:user-1", "sock-1");
      expect(db.userConnection.deleteMany).toHaveBeenCalledWith({ where: { socketId: "sock-1" } });
    });

    it("does not throw when DB delete fails", async () => {
      redis.hDel.mockResolvedValue(1);
      db.userConnection.deleteMany.mockRejectedValue(new Error("DB down"));

      await expect(service.unregister("sock-1", "user-1")).resolves.not.toThrow();
    });
  });

  // ─── heartbeat ──────────────────────────────────────────────────────────────

  describe("heartbeat", () => {
    it("updates lastHeartbeatAt in Redis when entry exists", async () => {
      redis.hGet.mockResolvedValue(JSON.stringify(META));
      redis.hSet.mockResolvedValue(undefined);
      redis.expire.mockResolvedValue(1);

      await service.heartbeat("sock-1", "user-1");

      expect(redis.hSet).toHaveBeenCalledWith(
        "connections:user-1",
        "sock-1",
        expect.stringContaining('"lastHeartbeatAt"'),
      );
    });

    it("skips Redis update when entry not found", async () => {
      redis.hGet.mockResolvedValue(null);

      await service.heartbeat("sock-1", "user-1");

      expect(redis.hSet).not.toHaveBeenCalled();
    });
  });

  // ─── isOnline ───────────────────────────────────────────────────────────────

  describe("isOnline", () => {
    it("returns true when hLen > 0", async () => {
      redis.hLen.mockResolvedValue(2);
      expect(await service.isOnline("user-1")).toBe(true);
    });

    it("returns false when hLen === 0", async () => {
      redis.hLen.mockResolvedValue(0);
      expect(await service.isOnline("user-1")).toBe(false);
    });
  });

  // ─── connectionCount ────────────────────────────────────────────────────────

  describe("connectionCount", () => {
    it("delegates to hLen", async () => {
      redis.hLen.mockResolvedValue(3);
      expect(await service.connectionCount("user-1")).toBe(3);
    });
  });

  // ─── getConnections ─────────────────────────────────────────────────────────

  describe("getConnections", () => {
    it("parses all connection metas from Redis hash", async () => {
      redis.hGetAll.mockResolvedValue({
        "sock-1": JSON.stringify(META),
        "sock-2": JSON.stringify({ ...META, socketId: "sock-2" }),
      });

      const connections = await service.getConnections("user-1");

      expect(connections).toHaveLength(2);
      expect(connections[0]?.socketId).toBe("sock-1");
    });

    it("skips malformed JSON entries", async () => {
      redis.hGetAll.mockResolvedValue({
        "sock-1": JSON.stringify(META),
        "bad-entry": "not-json{{{",
      });

      const connections = await service.getConnections("user-1");

      expect(connections).toHaveLength(1);
    });

    it("returns empty array when no connections", async () => {
      redis.hGetAll.mockResolvedValue({});
      const connections = await service.getConnections("user-1");
      expect(connections).toEqual([]);
    });
  });

  // ─── getOnlineUsers ─────────────────────────────────────────────────────────

  describe("getOnlineUsers", () => {
    it("returns Set of online user IDs", async () => {
      redis.hLen.mockImplementation((key: string) =>
        Promise.resolve(key.includes("user-1") ? 1 : 0),
      );

      const online = await service.getOnlineUsers(["user-1", "user-2", "user-3"]);

      expect(online.has("user-1")).toBe(true);
      expect(online.has("user-2")).toBe(false);
    });
  });

  // ─── sweepStaleConnections ──────────────────────────────────────────────────

  describe("sweepStaleConnections", () => {
    it("deletes stale connections older than cutoff", async () => {
      db.userConnection.deleteMany.mockResolvedValue({ count: 5 });

      const count = await service.sweepStaleConnections(90);

      expect(count).toBe(5);
      expect(db.userConnection.deleteMany).toHaveBeenCalledWith({
        where: { lastHeartbeatAt: { lt: expect.any(Date) } },
      });
    });

    it("returns 0 when nothing to sweep", async () => {
      db.userConnection.deleteMany.mockResolvedValue({ count: 0 });

      const count = await service.sweepStaleConnections();

      expect(count).toBe(0);
    });
  });
});
