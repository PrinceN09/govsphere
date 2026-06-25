import { Test, type TestingModule } from "@nestjs/testing";

import { REDIS_CLIENT, RedisService } from "./redis.service";

// ---------------------------------------------------------------------------
// Mock ioredis client
// ---------------------------------------------------------------------------

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ping: jest.fn(),
  disconnect: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService, { provide: REDIS_CLIENT, useValue: mockRedisClient }],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  // ── generic get / set / del ─────────────────────────────────────────────────

  describe("get", () => {
    it("returns the stored value", async () => {
      mockRedisClient.get.mockResolvedValueOnce("hello");
      expect(await service.get("key")).toBe("hello");
    });

    it("returns null when key does not exist", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      expect(await service.get("missing")).toBeNull();
    });
  });

  describe("set", () => {
    it("calls SET when no TTL is provided", async () => {
      mockRedisClient.set.mockResolvedValueOnce("OK");
      await service.set("key", "value");
      expect(mockRedisClient.set).toHaveBeenCalledWith("key", "value");
    });

    it("calls SETEX when TTL is provided", async () => {
      mockRedisClient.setex.mockResolvedValueOnce("OK");
      await service.set("key", "value", 60);
      expect(mockRedisClient.setex).toHaveBeenCalledWith("key", 60, "value");
    });
  });

  describe("del", () => {
    it("calls DEL and returns the count", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);
      expect(await service.del("key")).toBe(1);
    });
  });

  describe("exists", () => {
    it("returns true when the key exists", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);
      expect(await service.exists("key")).toBe(true);
    });

    it("returns false when the key does not exist", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(0);
      expect(await service.exists("missing")).toBe(false);
    });
  });

  // ── permission cache ────────────────────────────────────────────────────────

  describe("getPermissions", () => {
    it("returns parsed permissions array on cache hit", async () => {
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(["AUTH:LOGIN", "USER:READ"]));
      const result = await service.getPermissions("user-1");
      expect(result).toEqual(["AUTH:LOGIN", "USER:READ"]);
    });

    it("returns null on cache miss", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      expect(await service.getPermissions("user-2")).toBeNull();
    });

    it("returns null when cached value is not a valid JSON array", async () => {
      mockRedisClient.get.mockResolvedValueOnce("not-json");
      // JSON.parse of "not-json" throws — getPermissions should return null
      expect(await service.getPermissions("user-bad")).toBeNull();
    });
  });

  describe("setPermissions", () => {
    it("calls SETEX with the serialized permissions and correct key format", async () => {
      mockRedisClient.setex.mockResolvedValueOnce("OK");
      await service.setPermissions("user-1", ["AUTH:LOGIN"], 60);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        "perm:user-1",
        60,
        JSON.stringify(["AUTH:LOGIN"]),
      );
    });
  });

  describe("invalidatePermissions", () => {
    it("deletes the permission key for the given user", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);
      await service.invalidatePermissions("user-1");
      expect(mockRedisClient.del).toHaveBeenCalledWith("perm:user-1");
    });
  });

  // ── JWT blacklist ───────────────────────────────────────────────────────────

  describe("blacklistToken / isTokenBlacklisted", () => {
    it("blacklists a token using SETEX with the correct key", async () => {
      mockRedisClient.setex.mockResolvedValueOnce("OK");
      await service.blacklistToken("jti-abc", 900);
      expect(mockRedisClient.setex).toHaveBeenCalledWith("bl:jti-abc", 900, "1");
    });

    it("returns true for a blacklisted token", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);
      expect(await service.isTokenBlacklisted("jti-abc")).toBe(true);
    });

    it("returns false for a token that is not blacklisted", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(0);
      expect(await service.isTokenBlacklisted("jti-xyz")).toBe(false);
    });
  });

  // ── login rate-limit ────────────────────────────────────────────────────────

  describe("login rate-limit", () => {
    it("increments the failure counter and sets 30-min expiry on first call", async () => {
      mockRedisClient.incr.mockResolvedValueOnce(1);
      mockRedisClient.expire.mockResolvedValueOnce(1);

      const count = await service.incrementLoginFailures("192.0.2.1", "user@gov.cd");

      expect(count).toBe(1);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expect.stringContaining("192.0.2.1"),
        1800,
      );
    });

    it("does not reset expiry on subsequent failures", async () => {
      mockRedisClient.incr.mockResolvedValueOnce(3);

      await service.incrementLoginFailures("192.0.2.1", "user@gov.cd");

      // expire should NOT be called again (count > 1)
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it("resets failure counter", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);
      await service.resetLoginFailures("192.0.2.1", "user@gov.cd");
      expect(mockRedisClient.del).toHaveBeenCalledWith(expect.stringContaining("192.0.2.1"));
    });
  });

  // ── health ──────────────────────────────────────────────────────────────────

  describe("ping", () => {
    it("returns PONG when Redis is healthy", async () => {
      mockRedisClient.ping.mockResolvedValueOnce("PONG");
      expect(await service.ping()).toBe("PONG");
    });
  });

  // ── lifecycle ───────────────────────────────────────────────────────────────

  describe("onModuleDestroy", () => {
    it("disconnects the Redis client", () => {
      service.onModuleDestroy();
      expect(mockRedisClient.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
