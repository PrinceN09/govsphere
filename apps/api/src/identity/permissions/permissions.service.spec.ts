import { Test, type TestingModule } from "@nestjs/testing";

import { PermissionsService } from "./permissions.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  userRoleAssignment: { findMany: jest.fn() },
  role: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  permission: { findMany: jest.fn() },
};

const mockRedis = {
  getPermissions: jest.fn(),
  setPermissions: jest.fn(),
  invalidatePermissions: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAssignments = (...keys: string[]) => [
  {
    role: {
      permissions: keys.map((key) => ({ permission: { key } })),
    },
  },
];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("PermissionsService", () => {
  let service: PermissionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: cache miss
    mockRedis.getPermissions.mockResolvedValue(null);
    mockRedis.setPermissions.mockResolvedValue(undefined);
    mockRedis.invalidatePermissions.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  // ── resolvePermissionsForUser ───────────────────────────────────────────────

  describe("resolvePermissionsForUser", () => {
    it("returns permissions from active role assignments (cache miss path)", async () => {
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce(
        makeAssignments("AUTH:LOGIN", "USER:READ_OWN"),
      );

      const result = await service.resolvePermissionsForUser("user-123");

      expect(result).toContain("AUTH:LOGIN");
      expect(result).toContain("USER:READ_OWN");
      expect(mockPrisma.userRoleAssignment.findMany).toHaveBeenCalledTimes(1);
    });

    it("returns cached permissions without hitting the DB on cache hit", async () => {
      mockRedis.getPermissions.mockResolvedValueOnce(["AUTH:LOGIN", "USER:READ_OWN"]);

      const result = await service.resolvePermissionsForUser("user-123");

      expect(result).toEqual(["AUTH:LOGIN", "USER:READ_OWN"]);
      expect(mockPrisma.userRoleAssignment.findMany).not.toHaveBeenCalled();
    });

    it("writes resolved permissions to Redis after DB query", async () => {
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce(makeAssignments("AUTH:LOGIN"));

      await service.resolvePermissionsForUser("user-123");

      expect(mockRedis.setPermissions).toHaveBeenCalledWith("user-123", ["AUTH:LOGIN"], 60);
    });

    it("falls back to legacy User.role enum when no role assignments exist", async () => {
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ role: "EMPLOYEE" });
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        permissions: [
          { permission: { key: "AUTH:LOGIN" } },
          { permission: { key: "CHANNEL:SEND_MESSAGE" } },
        ],
      });

      const result = await service.resolvePermissionsForUser("user-456");

      expect(result).toContain("AUTH:LOGIN");
      expect(result).toContain("CHANNEL:SEND_MESSAGE");
    });

    it("deduplicates permissions when user has multiple roles with overlapping permissions", async () => {
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce([
        { role: { permissions: [{ permission: { key: "AUTH:LOGIN" } }] } },
        {
          role: {
            permissions: [
              { permission: { key: "AUTH:LOGIN" } },
              { permission: { key: "USER:CREATE" } },
            ],
          },
        },
      ]);

      const result = await service.resolvePermissionsForUser("user-bbb");
      const loginCount = result.filter((p) => p === "AUTH:LOGIN").length;
      expect(loginCount).toBe(1);
    });

    it("returns empty array and caches it when user has no roles and no legacy role record", async () => {
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ role: "EMPLOYEE" });
      mockPrisma.role.findUnique.mockResolvedValueOnce(null); // no system role

      const result = await service.resolvePermissionsForUser("user-none");

      expect(result).toEqual([]);
      expect(mockRedis.setPermissions).toHaveBeenCalledWith("user-none", [], 60);
    });

    it("falls back to DB query when Redis getPermissions throws", async () => {
      mockRedis.getPermissions.mockRejectedValueOnce(new Error("Redis down"));
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce(makeAssignments("USER:READ"));

      const result = await service.resolvePermissionsForUser("user-redis-down");

      expect(result).toContain("USER:READ");
      expect(mockPrisma.userRoleAssignment.findMany).toHaveBeenCalledTimes(1);
    });

    it("still returns permissions if Redis setPermissions throws (non-fatal)", async () => {
      mockRedis.setPermissions.mockRejectedValueOnce(new Error("Redis write error"));
      mockPrisma.userRoleAssignment.findMany.mockResolvedValueOnce(makeAssignments("AUTH:LOGIN"));

      const result = await service.resolvePermissionsForUser("user-write-fail");

      expect(result).toContain("AUTH:LOGIN");
    });
  });

  // ── invalidateCache ─────────────────────────────────────────────────────────

  describe("invalidateCache", () => {
    it("calls redis.invalidatePermissions with the correct userId", async () => {
      await service.invalidateCache("user-xyz");
      expect(mockRedis.invalidatePermissions).toHaveBeenCalledWith("user-xyz");
    });

    it("does not throw when Redis invalidation fails", async () => {
      mockRedis.invalidatePermissions.mockRejectedValueOnce(new Error("Redis error"));
      await expect(service.invalidateCache("user-xyz")).resolves.not.toThrow();
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns all permissions ordered by resource and action", async () => {
      const permissions = [
        { id: "1", key: "AUTH:LOGIN", displayName: "Login", resource: "AUTH", action: "LOGIN" },
        { id: "2", key: "USER:READ", displayName: "Read User", resource: "USER", action: "READ" },
      ];
      mockPrisma.permission.findMany.mockResolvedValueOnce(permissions);

      const result = await service.findAll();

      expect(result).toEqual(permissions);
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ resource: "asc" }, { action: "asc" }],
        }),
      );
    });
  });
});
