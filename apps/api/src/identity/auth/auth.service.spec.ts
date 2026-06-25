import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

import { AuthService } from "./auth.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SessionsService } from "../sessions/sessions.service";

import type { User, UserRole, UserStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Pre-declare to avoid a circular self-reference in the $transaction initialiser.
// TypeScript cannot infer the type of `mockPrisma` while the object is still
// being built, so referencing it inside the `$transaction` callback produces
// TS7022 (implicit any from circularity) and TS7024 (implicit any return type).
// Solution: stub the mock first, build the object, then wire the implementation.
const mockTransactionFn: jest.Mock = jest.fn();

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  userDevice: {
    upsert: jest.fn(),
  },
  loginHistory: {
    create: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: mockTransactionFn,
};

// Wire after mockPrisma is fully defined — no circularity, no implicit any.
mockTransactionFn.mockImplementation(
  <T>(fn: (tx: typeof mockPrisma) => Promise<T>): Promise<T> => fn(mockPrisma),
);

const mockJwtService = {
  sign: jest.fn().mockReturnValue("mocked-jwt-token"),
  verify: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue("mock-private-key"),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockPermissionsService = {
  resolvePermissionsForUser: jest.fn().mockResolvedValue(["AUTH:LOGIN"]),
};

const mockSessionsService = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Typed wrapper around expect.objectContaining.
 * Returns T (the input shape) instead of the `any` that some @types/jest
 * versions infer, so nested object-property assignments like
 * `{ data: containing({...}) }` satisfy @typescript-eslint/no-unsafe-assignment.
 * At runtime the value is still a Jest AsymmetricMatcher — behaviour is unchanged.
 */
function containing<T extends Record<string, unknown>>(obj: T): T {
  return expect.objectContaining(obj) as T;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseUser: Partial<User> = {
  id: "user-123",
  email: "jean.mbeki@finances.gouv.cd",
  matriculeNumber: "1.641.558",
  displayName: "Jean Mbeki",
  passwordHash: bcrypt.hashSync("ValidPass!123", 10),
  role: "EMPLOYEE" as UserRole,
  status: "ACTIVE" as UserStatus,
  mfaEnabled: false,
  failedLoginCount: 0,
  lockedUntil: null,
  ministryId: "ministry-1",
  departmentId: "dept-1",
  divisionId: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.userSession.create.mockResolvedValue({ id: "session-1" });
    mockPrisma.userSession.update.mockResolvedValue({});
    mockPrisma.userDevice.upsert.mockResolvedValue({ id: "device-1" });
    mockPrisma.loginHistory.create.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: SessionsService, useValue: mockSessionsService },
        {
          provide: RedisService,
          useValue: {
            blacklistToken: jest.fn().mockResolvedValue(undefined),
            isTokenBlacklisted: jest.fn().mockResolvedValue(false),
            incrementLoginFailures: jest.fn().mockResolvedValue(1),
            resetLoginFailures: jest.fn().mockResolvedValue(undefined),
            getLoginFailures: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // LOGIN — credential detection
  // -------------------------------------------------------------------------

  describe("login — credential detection", () => {
    it("should identify matricule credential by format (dots)", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);
      await service.login(
        { credential: "1.641.558", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { matriculeNumber: "1.641.558" } }),
      );
    });

    it("should identify email credential", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);
      await service.login(
        { credential: "jean.mbeki@finances.gouv.cd", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "jean.mbeki@finances.gouv.cd" } }),
      );
    });

    it("should accept two-part matricule format", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);
      await service.login(
        { credential: "478.432", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { matriculeNumber: "478.432" } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // LOGIN — success paths
  // -------------------------------------------------------------------------

  describe("login — success", () => {
    it("should return accessToken and refreshToken when credentials are valid", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);

      const result = await service.login(
        { credential: "1.641.558", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );

      expect(result.mfaRequired).toBe(false);
      if (!result.mfaRequired) {
        expect(result.accessToken).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();
        expect(result.user.id).toBe("user-123");
      }
    });

    it("should return mfaRequired=true when MFA is enabled", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, mfaEnabled: true });

      const result = await service.login(
        { credential: "1.641.558", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );

      expect(result.mfaRequired).toBe(true);
      if (result.mfaRequired) {
        expect(result.challengeToken).toBeTruthy();
      }
    });

    it("should reset failedLoginCount to 0 on successful login", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, failedLoginCount: 3 });

      await service.login(
        { credential: "1.641.558", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ failedLoginCount: 0 }),
        }),
      );
    });

    it("should write LOGIN_SUCCESS audit log", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);

      await service.login(
        { credential: "1.641.558", password: "ValidPass!123" },
        "127.0.0.1",
        "TestBrowser",
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGIN_SUCCESS" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // LOGIN — failure paths
  // -------------------------------------------------------------------------

  describe("login — failures", () => {
    it("should throw INVALID_CREDENTIALS when user does not exist", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.login({ credential: "9.999.999", password: "whatever" }, "127.0.0.1", "ua"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw INVALID_CREDENTIALS when password is wrong", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);

      await expect(
        service.login({ credential: "1.641.558", password: "WrongPassword!1" }, "127.0.0.1", "ua"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw ACCOUNT_SUSPENDED for suspended accounts", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, status: "SUSPENDED" });

      await expect(
        service.login({ credential: "1.641.558", password: "ValidPass!123" }, "127.0.0.1", "ua"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw ACCOUNT_LOCKED when lockedUntil is in the future", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...baseUser,
        status: "LOCKED",
        lockedUntil: futureDate,
      });

      await expect(
        service.login({ credential: "1.641.558", password: "ValidPass!123" }, "127.0.0.1", "ua"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should increment failedLoginCount on wrong password", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, failedLoginCount: 2 });

      await expect(
        service.login({ credential: "1.641.558", password: "WrongPass!1" }, "127.0.0.1", "ua"),
      ).rejects.toThrow();

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ failedLoginCount: 3 }),
        }),
      );
    });

    it("should lock the account after 5 failed attempts", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, failedLoginCount: 4 });

      await expect(
        service.login({ credential: "1.641.558", password: "WrongPass!1" }, "127.0.0.1", "ua"),
      ).rejects.toThrow();

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ status: "LOCKED" }),
        }),
      );
    });

    it("should write LOGIN_FAILED audit log on wrong password", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(baseUser);

      await expect(
        service.login({ credential: "1.641.558", password: "Wrong!Pass1" }, "127.0.0.1", "ua"),
      ).rejects.toThrow();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGIN_FAILED" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // PASSWORD RESET
  // -------------------------------------------------------------------------

  describe("resetPassword", () => {
    it("should throw TOKEN_INVALID_OR_EXPIRED when token does not exist", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword(
          { token: "a".repeat(64), newPassword: "NewStr0ng!Pass" },
          "127.0.0.1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw PASSWORD_POLICY_VIOLATION when new password is too short", async () => {
      const futureExpiry = new Date(Date.now() + 60_000);
      mockPrisma.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: "token-1",
        userId: "user-123",
        used: false,
        expiresAt: futureExpiry,
        user: { id: "user-123", status: "ACTIVE" },
      });

      await expect(
        service.resetPassword({ token: "a".repeat(64), newPassword: "short" }, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw PASSWORD_HISTORY_VIOLATION when reusing a recent password", async () => {
      const futureExpiry = new Date(Date.now() + 60_000);
      const oldHash = await bcrypt.hash("Reused!Pass123", 10);

      mockPrisma.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: "token-1",
        userId: "user-123",
        used: false,
        expiresAt: futureExpiry,
        user: { id: "user-123", status: "ACTIVE" },
      });
      mockPrisma.passwordHistory.findMany.mockResolvedValueOnce([{ passwordHash: oldHash }]);

      await expect(
        service.resetPassword(
          { token: "a".repeat(64), newPassword: "Reused!Pass123" },
          "127.0.0.1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  describe("logout", () => {
    it("should mark session inactive on logout", async () => {
      mockPrisma.userSession.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.logout("user-123", "session-1", "jti-abc");

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session-1", userId: "user-123" },
          data: containing({ isActive: false }),
        }),
      );
    });

    it("should write LOGOUT audit log", async () => {
      mockPrisma.userSession.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.logout("user-123", "session-1", "jti-abc");

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGOUT" }),
      );
    });

    it("should revoke all sessions on logoutAll", async () => {
      mockPrisma.userSession.updateMany.mockResolvedValueOnce({ count: 3 });

      const count = await service.logoutAll("user-123");

      expect(count).toBe(3);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGOUT_ALL" }),
      );
    });
  });
});
