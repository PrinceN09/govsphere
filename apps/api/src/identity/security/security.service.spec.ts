import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { SecurityService } from "./security.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

import type { AuthenticatedUser } from "../../common/types/auth.types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  userSession: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  userDevice: { count: jest.fn() },
  user: {
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  loginHistory: { count: jest.fn(), findMany: jest.fn() },
  passwordResetToken: { count: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
  getTimelineForUser: jest.fn(),
};

const superAdmin: AuthenticatedUser = {
  id: "admin-1",
  email: "admin@gov.cd",
  matriculeNumber: null,
  role: "SUPER_ADMIN",
  roleWeight: 100,
  ministryId: null,
  departmentId: null,
  divisionId: null,
  sessionId: "session-admin",
  permissions: ["ADMIN:VIEW_AUDIT_LOGS_ALL", "AUTH:MANAGE_SESSIONS"],
  mfaEnabled: true,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("SecurityService", () => {
  let service: SecurityService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  // ── revokeSessionById ───────────────────────────────────────────────────────

  describe("revokeSessionById", () => {
    it("revokes an active session and logs SESSION_REVOKED", async () => {
      mockPrisma.userSession.findUnique.mockResolvedValueOnce({
        id: "session-1",
        userId: "user-1",
        isActive: true,
      });
      mockPrisma.userSession.update.mockResolvedValueOnce({});

      await service.revokeSessionById("session-1", superAdmin, "192.0.2.1");

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session-1" },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SESSION_REVOKED" }),
      );
    });

    it("throws NotFoundException when session does not exist", async () => {
      mockPrisma.userSession.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.revokeSessionById("ghost-session", superAdmin, "192.0.2.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── revokeAllSessionsForUser ────────────────────────────────────────────────

  describe("revokeAllSessionsForUser", () => {
    it("revokes all active sessions for the target user", async () => {
      mockPrisma.userSession.updateMany.mockResolvedValueOnce({ count: 3 });

      const result = await service.revokeAllSessionsForUser("user-1", superAdmin, "192.0.2.1");

      expect(result).toEqual({ count: 3 });
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", isActive: true },
        }),
      );
    });

    it("returns 0 when user has no active sessions", async () => {
      mockPrisma.userSession.updateMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.revokeAllSessionsForUser("user-no-sessions", superAdmin, "");

      expect(result).toEqual({ count: 0 });
    });
  });

  // ── findAllSessions ─────────────────────────────────────────────────────────

  describe("findAllSessions", () => {
    it("returns paginated sessions with meta", async () => {
      const mockSessions = [
        {
          id: "s1",
          platform: "web",
          ipAddress: "1.2.3.4",
          userAgent: "Mozilla",
          lastUsedAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(),
          revokedAt: null,
          user: {
            id: "u1",
            displayName: "Agent Test",
            email: "agent@gov.cd",
            matriculeNumber: null,
            ministry: null,
          },
          device: null,
        },
      ];

      mockPrisma.userSession.findMany.mockResolvedValueOnce(mockSessions);
      mockPrisma.userSession.count.mockResolvedValueOnce(1);

      const result = await service.findAllSessions({ page: 1, limit: 25 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });
});
