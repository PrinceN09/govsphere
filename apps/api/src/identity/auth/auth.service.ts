import * as crypto from "crypto";

import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PermissionsService } from "../permissions/permissions.service";
// Value import required — emitDecoratorMetadata needs the runtime class reference
// for NestJS DI token resolution. `import type` erases it and breaks injection.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SessionsService } from "../sessions/sessions.service";

import type { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { SignupDto } from "./dto/signup.dto";
import type {
  AccessTokenPayload,
  MfaChallengePayload,
  RefreshTokenPayload,
} from "../../common/types/auth.types";
import type { UserRole, UserStatus } from "@prisma/client";

/** Matricule regex: 1–4 digits, 1 or 2 dot-separated groups (kept for search fallback). */
const MATRICULE_REGEX = /^\d{1,4}(\.\d{1,4}){1,2}$/;

/** Email heuristic — used to short-circuit the lookup to email-only search. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** bcrypt cost factor. */
const BCRYPT_ROUNDS = 12;

/** Max failed login attempts before lockout. */
const MAX_FAILED_ATTEMPTS = 5;
const MAX_FAILED_HARD_LOCK = 10;

/** Lockout duration (minutes). */
const SOFT_LOCK_MINUTES = 30;

/** Password reset token TTL (ms). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Role weight map for quick lookup. */
const ROLE_WEIGHTS: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  GOVERNMENT_ADMIN: 90,
  MINISTRY_ADMIN: 70,
  DEPARTMENT_ADMIN: 50,
  DIVISION_ADMIN: 40,
  TEAM_MANAGER: 30,
  EMPLOYEE: 10,
  GUEST: 0,
};

export interface LoginResult {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
  user: PublicUserProfile;
  sessionId: string;
}

export interface MfaRequiredResult {
  mfaRequired: true;
  challengeToken: string;
}

export interface PublicUserProfile {
  id: string;
  displayName: string;
  email: string;
  username: string | null;
  matriculeNumber: string | null; // kept for backward compat
  role: UserRole;
  ministryId: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
    private readonly sessionsService: SessionsService,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResult | MfaRequiredResult> {
    // Resolve the effective identifier — support identifier (v1.1.1+), credential (legacy), matricule (gov legacy)
    const raw = (dto.identifier ?? dto.credential ?? dto.matricule ?? "").trim();
    const { password, deviceFingerprint } = dto;

    // 1. Look up the user — search order: email → username → matriculeNumber
    const user = await this.findUserForLogin(raw);

    // 2. Record login history regardless of outcome
    const credentialLabel = EMAIL_REGEX.test(raw) ? raw.toLowerCase() : raw;

    // 3. User not found — return same error as wrong password (prevent enumeration)
    if (!user) {
      await this.recordLoginHistory(
        null,
        credentialLabel,
        false,
        "USER_NOT_FOUND",
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException({
        error: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      });
    }

    // 4. Check account status
    this.assertAccountUsable(user.status, user.lockedUntil);

    // 5. Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      await this.handleFailedLogin(
        user.id,
        credentialLabel,
        user.failedLoginCount,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException({
        error: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      });
    }

    // 6. Password valid — reset failed count
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    await this.recordLoginHistory(user.id, credentialLabel, true, null, ipAddress, userAgent);

    // 7. Check MFA
    if (user.mfaEnabled) {
      const challengeToken = await this.issueMfaChallengeToken(user.id);
      return { mfaRequired: true, challengeToken };
    }

    // 8. Issue tokens and create session
    return this.createAuthenticatedSession(user, ipAddress, userAgent, deviceFingerprint);
  }

  // ---------------------------------------------------------------------------
  // AFTER MFA VERIFY (called by MfaService on success)
  // ---------------------------------------------------------------------------

  async loginAfterMfa(
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<LoginResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (await (this.prisma.user as any).findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true, // v1.1.1 — not in generated client yet
        matriculeNumber: true,
        displayName: true,
        role: true,
        status: true,
        mfaEnabled: true,
        ministryId: true,
        departmentId: true,
        divisionId: true,
      },
    })) as {
      id: string;
      email: string;
      username: string | null;
      matriculeNumber: string | null;
      displayName: string;
      role: UserRole;
      status: UserStatus;
      mfaEnabled: boolean;
      ministryId: string | null;
      departmentId: string | null;
      divisionId: string | null;
    };

    return this.createAuthenticatedSession(user, ipAddress, userAgent, deviceFingerprint);
  }

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN
  // ---------------------------------------------------------------------------

  async refreshTokens(
    refreshTokenRaw: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshTokenRaw, {
        algorithms: ["RS256"],
        publicKey: this.configService.getOrThrow<string>("JWT_PUBLIC_KEY").replace(/\\n/g, "\n"),
      });
    } catch {
      throw new UnauthorizedException({ error: "TOKEN_INVALID", message: "Invalid refresh token" });
    }

    // Validate session
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        isActive: true,
        tokenFamily: payload.family,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
            ministryId: true,
            departmentId: true,
            divisionId: true,
          },
        },
      },
    });

    if (!session) {
      // Token family reuse detected — revoke all sessions for this user
      await this.prisma.userSession.updateMany({
        where: { userId: payload.sub, tokenFamily: payload.family },
        data: { isActive: false, revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        error: "TOKEN_REUSE_DETECTED",
        message: "Suspicious activity detected. Please log in again.",
      });
    }

    if (session.user.status !== "ACTIVE") {
      throw new UnauthorizedException({
        error: "ACCOUNT_INACTIVE",
        message: "Account is not active",
      });
    }

    // Issue new token pair (rotation)
    const { accessToken, refreshToken, refreshTokenJti } = await this.issueTokenPair(
      session.user.id,
      session.user.role,
      session.user.ministryId,
      session.user.departmentId,
      session.user.divisionId,
      session.id,
      payload.family, // preserve family
    );

    // Update session with new refresh token JTI
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenJti,
        lastUsedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    this.auditService.log({
      userId: session.user.id,
      action: "TOKEN_REFRESH",
      entityType: "SESSION",
      entityId: session.id,
      metadata: { sessionId: session.id },
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken };
  }

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------

  async logout(userId: string, sessionId: string, accessTokenJti: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Blacklist the access token JTI in Redis so in-flight tokens are immediately
    // invalidated even within their remaining 15-minute lifetime.
    if (accessTokenJti) {
      const ACCESS_TOKEN_TTL_S = 15 * 60; // 15 minutes — must match issueTokenPair expiresIn
      await this.redis.blacklistToken(accessTokenJti, ACCESS_TOKEN_TTL_S).catch(() => {
        // Non-fatal: session is already revoked in DB; blacklist is a belt-and-suspenders measure
        this.logger.warn("Failed to blacklist JTI in Redis on logout", { jti: accessTokenJti });
      });
    }

    this.auditService.log({
      userId,
      action: "LOGOUT",
      entityType: "SESSION",
      entityId: sessionId,
      metadata: { sessionId, jti: accessTokenJti },
    });
  }

  async logoutAll(userId: string): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    this.auditService.log({
      userId,
      action: "LOGOUT_ALL",
      entityType: "USER",
      entityId: userId,
      metadata: { revokedSessions: result.count },
    });

    return result.count;
  }

  // ---------------------------------------------------------------------------
  // FORGOT PASSWORD
  // ---------------------------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const raw = (dto.identifier ?? dto.credential ?? dto.matricule ?? "").trim();

    const user = await this.findUserForReset(raw);

    // Always return success — prevent user enumeration
    if (!user || user.status === "DEACTIVATED" || user.status === "ARCHIVED") {
      return;
    }

    // Invalidate any existing unused tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true, usedAt: new Date() },
    });

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex"); // 64 char hex
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    this.auditService.log({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { identifierType: MATRICULE_REGEX.test(raw) ? "matricule" : EMAIL_REGEX.test(raw) ? "email" : "username" },
    });

    // TODO: Send email with reset link containing rawToken
    // emailService.sendPasswordReset(user.email, rawToken)
    this.logger.log(`Password reset token generated for user ${user.id}`);
  }

  // ---------------------------------------------------------------------------
  // RESET PASSWORD
  // ---------------------------------------------------------------------------

  async resetPassword(dto: ResetPasswordDto, ipAddress: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(dto.token).digest("hex");

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException({
        error: "TOKEN_INVALID_OR_EXPIRED",
        message: "Password reset link is invalid or has expired",
      });
    }

    // Validate new password
    this.validatePasswordPolicy(dto.newPassword);
    await this.assertPasswordNotReused(record.userId, dto.newPassword);

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Save old password to history, update password, mark token used — in one transaction
    await this.prisma.$transaction(async (tx) => {
      // Save to history
      const currentUser = await tx.user.findUniqueOrThrow({
        where: { id: record.userId },
        select: { passwordHash: true },
      });

      await tx.passwordHistory.create({
        data: { userId: record.userId, passwordHash: currentUser.passwordHash },
      });

      // Update password
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      // Mark token used
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true, usedAt: new Date() },
      });

      // Invalidate all sessions
      await tx.userSession.updateMany({
        where: { userId: record.userId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
    });

    this.auditService.log({
      userId: record.userId,
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: record.userId,
      metadata: {},
      ipAddress,
    });
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Find a user for login by identifier (v1.1.1 search order):
   *   1. email (normalized lowercase)
   *   2. username (case-insensitive)
   *   3. employeeNumber (exact — org-scoped, e.g. EMP-00125)
   *   4. matriculeNumber (exact — government backward compat)
   *
   * Returns null if not found. Never throws.
   */
  private async findUserForLogin(raw: string): Promise<{
    id: string;
    email: string;
    matriculeNumber: string | null;
    username: string | null;
    employeeNumber: string | null;
    displayName: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    mfaEnabled: boolean;
    failedLoginCount: number;
    lockedUntil: Date | null;
    ministryId: string | null;
    departmentId: string | null;
    divisionId: string | null;
  } | null> {
    const loginSelect = {
      id: true,
      email: true,
      matriculeNumber: true,
      username: true,
      employeeNumber: true, // v1.1.1 — not in generated client yet
      displayName: true,
      passwordHash: true,
      role: true,
      status: true,
      mfaEnabled: true,
      failedLoginCount: true,
      lockedUntil: true,
      ministryId: true,
      departmentId: true,
      divisionId: true,
    };

    type LoginUser = {
      id: string; email: string; matriculeNumber: string | null;
      username: string | null; employeeNumber: string | null;
      displayName: string; passwordHash: string; role: UserRole; status: UserStatus;
      mfaEnabled: boolean; failedLoginCount: number; lockedUntil: Date | null;
      ministryId: string | null; departmentId: string | null; divisionId: string | null;
    };

    // 1. email — only when identifier is a valid email address (contains @)
    if (EMAIL_REGEX.test(raw)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byEmail = await (this.prisma.user as any).findFirst({
        where: { email: raw.toLowerCase() }, select: loginSelect,
      }) as LoginUser | null;
      if (byEmail) return byEmail;
    }

    // 2. matriculeNumber (government format: "1.641.558", "478.432") — before generic lookups
    if (MATRICULE_REGEX.test(raw)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byMatricule = await (this.prisma.user as any).findFirst({
        where: { matriculeNumber: raw }, select: loginSelect,
      }) as LoginUser | null;
      if (byMatricule) return byMatricule;
    }

    // 3. employeeNumber (exact — org-scoped, e.g. EMP-00125)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byEmployeeNumber = await (this.prisma.user as any).findFirst({
      where: { employeeNumber: raw }, select: loginSelect,
    }) as LoginUser | null;
    if (byEmployeeNumber) return byEmployeeNumber;

    // 4. username (case-insensitive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byUsername = await (this.prisma.user as any).findFirst({
      where: { username: { equals: raw, mode: "insensitive" } }, select: loginSelect,
    }) as LoginUser | null;
    if (byUsername) return byUsername;

    return null;
  }

  /**
   * Find a user for password-reset by identifier.
   * Same search order as findUserForLogin but returns only id/email/status.
   */
  private async findUserForReset(raw: string): Promise<{
    id: string; email: string; status: string;
  } | null> {
    const resetSelect = { id: true, email: true, status: true };

    type ResetUser = { id: string; email: string; status: string };

    // 1. email — only when identifier is a valid email address (contains @)
    if (EMAIL_REGEX.test(raw)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byEmail = await (this.prisma.user as any).findFirst({
        where: { email: raw.toLowerCase() }, select: resetSelect,
      }) as ResetUser | null;
      if (byEmail) return byEmail;
    }

    // 2. matriculeNumber (government format: "1.641.558", "478.432") — before generic lookups
    if (MATRICULE_REGEX.test(raw)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byMatricule = await (this.prisma.user as any).findFirst({
        where: { matriculeNumber: raw }, select: resetSelect,
      }) as ResetUser | null;
      if (byMatricule) return byMatricule;
    }

    // 3. employeeNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byEmployeeNumber = await (this.prisma.user as any).findFirst({
      where: { employeeNumber: raw }, select: resetSelect,
    }) as ResetUser | null;
    if (byEmployeeNumber) return byEmployeeNumber;

    // 4. username (case-insensitive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byUsername = await (this.prisma.user as any).findFirst({
      where: { username: { equals: raw, mode: "insensitive" } }, select: resetSelect,
    }) as ResetUser | null;
    if (byUsername) return byUsername;

    return null;
  }

  private assertAccountUsable(status: UserStatus, lockedUntil: Date | null): void {
    if (status === "SUSPENDED") {
      throw new UnauthorizedException({
        error: "ACCOUNT_SUSPENDED",
        message: "Account is suspended. Contact your administrator.",
      });
    }

    if (status === "DEACTIVATED" || status === "ARCHIVED") {
      throw new UnauthorizedException({
        error: "ACCOUNT_DEACTIVATED",
        message: "Account is deactivated.",
      });
    }

    if (status === "LOCKED") {
      if (lockedUntil && lockedUntil > new Date()) {
        throw new UnauthorizedException({
          error: "ACCOUNT_LOCKED",
          message: "Account is temporarily locked due to multiple failed login attempts.",
          lockedUntil: lockedUntil.toISOString(),
        } as Record<string, unknown>);
      }
      // Soft-lock expired — allow through (will be unlocked on success)
    }
  }

  private async handleFailedLogin(
    userId: string,
    credential: string,
    currentFailCount: number,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const newCount = currentFailCount + 1;
    let newStatus: UserStatus | undefined;
    let lockedUntil: Date | undefined;

    if (newCount >= MAX_FAILED_HARD_LOCK) {
      newStatus = "LOCKED";
      // Hard lock — admin must unlock
    } else if (newCount >= MAX_FAILED_ATTEMPTS) {
      newStatus = "LOCKED";
      lockedUntil = new Date(Date.now() + SOFT_LOCK_MINUTES * 60 * 1000);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        ...(newStatus !== undefined ? { status: newStatus } : {}),
        ...(lockedUntil !== undefined ? { lockedUntil } : {}),
      },
    });

    await this.recordLoginHistory(
      userId,
      credential,
      false,
      "INVALID_PASSWORD",
      ipAddress,
      userAgent,
    );

    this.auditService.log({
      userId,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: userId,
      metadata: { reason: "INVALID_PASSWORD", attemptCount: newCount },
      ipAddress,
      userAgent,
    });

    if (newStatus === "LOCKED") {
      this.auditService.log({
        userId,
        action: "ACCOUNT_LOCKED",
        entityType: "USER",
        entityId: userId,
        metadata: { attemptCount: newCount, lockedUntil: lockedUntil?.toISOString() ?? null },
        ipAddress,
        userAgent,
      });
    }
  }

  private async createAuthenticatedSession(
    user: {
      id: string;
      email: string;
      username?: string | null;
      matriculeNumber?: string | null;
      displayName: string;
      role: UserRole;
      ministryId: string | null;
      departmentId: string | null;
      divisionId: string | null;
    },
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<LoginResult> {
    // Upsert device
    let deviceId: string | undefined;
    if (deviceFingerprint) {
      const platform = this.detectPlatform(userAgent);
      const device = await this.prisma.userDevice.upsert({
        where: { userId_fingerprint: { userId: user.id, fingerprint: deviceFingerprint } },
        update: { lastSeenAt: new Date(), name: this.buildDeviceName(userAgent), platform },
        create: {
          userId: user.id,
          name: this.buildDeviceName(userAgent),
          platform,
          fingerprint: deviceFingerprint,
        },
      });
      deviceId = device.id;
    }

    // Create session
    const tokenFamily = crypto.randomUUID();
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        deviceId: deviceId ?? null,
        tokenFamily,
        ipAddress,
        userAgent,
        platform: this.detectPlatform(userAgent),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Issue tokens
    const { accessToken, refreshToken, refreshTokenJti } = await this.issueTokenPair(
      user.id,
      user.role,
      user.ministryId,
      user.departmentId,
      user.divisionId,
      session.id,
      tokenFamily,
    );

    // Store hashed refresh JTI on session
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenJti },
    });

    this.auditService.log({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "SESSION",
      entityId: session.id,
      metadata: { method: "password", mfaUsed: false, sessionId: session.id },
      ipAddress,
      userAgent,
    });

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        username: user.username ?? null,
        matriculeNumber: user.matriculeNumber ?? null,
        role: user.role,
        ministryId: user.ministryId,
      },
    };
  }

  issueTokenPair(
    userId: string,
    role: UserRole,
    ministryId: string | null,
    departmentId: string | null,
    divisionId: string | null,
    sessionId: string,
    family: string,
  ): Promise<{ accessToken: string; refreshToken: string; refreshTokenJti: string }> {
    const privateKey = this.configService
      .getOrThrow<string>("JWT_PRIVATE_KEY")
      .replace(/\\n/g, "\n");
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessPayload: Omit<AccessTokenPayload, "iat" | "exp"> = {
      sub: userId,
      jti: accessJti,
      role,
      weight: ROLE_WEIGHTS[role],
      ministryId,
      departmentId,
      divisionId,
      sessionId,
    };

    const refreshPayload: Omit<RefreshTokenPayload, "iat" | "exp"> = {
      sub: userId,
      jti: refreshJti,
      sessionId,
      family,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      algorithm: "RS256",
      privateKey,
      expiresIn: "15m",
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      algorithm: "RS256",
      privateKey,
      expiresIn: "7d",
    });

    // Store hashed refresh JTI for session validation
    const refreshTokenJti = crypto.createHash("sha256").update(refreshJti).digest("hex");

    return Promise.resolve({ accessToken, refreshToken, refreshTokenJti });
  }

  private issueMfaChallengeToken(userId: string): Promise<string> {
    const privateKey = this.configService
      .getOrThrow<string>("JWT_PRIVATE_KEY")
      .replace(/\\n/g, "\n");
    const payload: Omit<MfaChallengePayload, "iat" | "exp"> = {
      sub: userId,
      type: "mfa_challenge",
    };
    return Promise.resolve(
      this.jwtService.sign(payload, {
        algorithm: "RS256",
        privateKey,
        expiresIn: "5m",
      }),
    );
  }

  private validatePasswordPolicy(password: string): void {
    const errors: string[] = [];

    if (password.length < 12) errors.push("Password must be at least 12 characters");
    if (password.length > 128) errors.push("Password must be at most 128 characters");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
    if (!/\d/.test(password)) errors.push("Password must contain at least one number");
    if (!/[!@#$%^&*()\-_=+[\]{}|;:',.<>?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        error: "PASSWORD_POLICY_VIOLATION",
        message: errors.join(". "),
      });
    }
  }

  private async assertPasswordNotReused(userId: string, newPassword: string): Promise<void> {
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { passwordHash: true },
    });

    for (const { passwordHash } of history) {
      const reused = await bcrypt.compare(newPassword, passwordHash);
      if (reused) {
        throw new BadRequestException({
          error: "PASSWORD_HISTORY_VIOLATION",
          message: "You cannot reuse one of your last 10 passwords",
        });
      }
    }
  }

  private async recordLoginHistory(
    userId: string | null,
    credential: string,
    success: boolean,
    failReason: string | null,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        credential,
        success,
        failReason,
        ipAddress,
        userAgent,
      },
    });
  }

  private detectPlatform(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes("tauri")) return "desktop";
    if (ua.includes("expo") || ua.includes("react-native")) return "mobile";
    return "web";
  }

  private buildDeviceName(userAgent: string): string {
    // Basic UA parsing for readable device names
    if (userAgent.toLowerCase().includes("chrome")) return "Chrome";
    if (userAgent.toLowerCase().includes("firefox")) return "Firefox";
    if (userAgent.toLowerCase().includes("safari")) return "Safari";
    return "Browser";
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION SIGNUP (Phase 5+6 — v1.1.1)
  // ---------------------------------------------------------------------------

  /**
   * Public workspace signup: creates an Organization + admin User in one atomic
   * transaction.  GOVERNMENT orgs are created with status PENDING_VERIFICATION
   * so an administrator can review them before granting access.
   */
  async signup(dto: SignupDto): Promise<{ organizationId: string; userId: string; workspaceSlug: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }
    if (!dto.acceptTerms) {
      throw new BadRequestException("You must accept the terms of service");
    }

    const normalizedEmail = dto.workEmail.toLowerCase().trim();

    // Check email is not already registered
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new BadRequestException("An account with this email address already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const displayName = `${dto.firstName} ${dto.lastName}`;

    // Government orgs await manual verification; others are immediately active
    const orgStatus = dto.orgType === "GOVERNMENT" ? "PENDING_VERIFICATION" : "ACTIVE";

    const slug = await this.generateWorkspaceSlug(dto.orgName);
    const orgCode = slug.toUpperCase().replace(/-/g, "_").slice(0, 50);

    // Resolve username: firstName.lastName pattern
    const username = await this.resolveSignupUsername(dto.firstName, dto.lastName, normalizedEmail);

    // Atomic: create org + user + role assignment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txAny = tx as any;

      // 1. Create organization
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const org = await txAny.organization.create({
        data: {
          name: dto.orgName,
          code: orgCode,
          workspaceSlug: slug,
          type: dto.orgType,
          status: orgStatus,
          email: normalizedEmail,
          city: dto.city,
          country: dto.country,
        },
      });

      // 2. Create admin user
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const user = await txAny.user.create({
        data: {
          email: normalizedEmail,
          username,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          displayName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          organizationId: org.id,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      // 3. Default role assignment row (SUPER_ADMIN)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await txAny.userRoleAssignment.create({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userId: user.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          organizationId: org.id,
          role: "SUPER_ADMIN",
          assignedById: user.id, // self-assigned for signup
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return { org, user };
    });

    // Audit log (fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = String((result as { org: unknown; user: { id: unknown } }).user.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const orgId = String((result as { org: { id: unknown }; user: unknown }).org.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.auditService.log({
      userId,
      action: "ORGANIZATION_SIGNUP" as any, // not in generated client yet (v1.1.1)
      entityType: "organization",
      entityId: orgId,
      metadata: { orgName: dto.orgName, orgType: dto.orgType, orgStatus },
      ipAddress: "signup",
      userAgent: "signup",
    });

    void db; // satisfy no-unused-vars — db is typed for reference only

    return { organizationId: orgId, userId, workspaceSlug: slug };
  }

  // ---------------------------------------------------------------------------
  // ACCEPT INVITATION (Phase 7 — v1.1.1)
  // ---------------------------------------------------------------------------

  /**
   * Accept an employee invitation:
   * 1. Validate raw token (SHA-256 → tokenHash lookup)
   * 2. Check not expired / not already used
   * 3. Set password, mark user ACTIVE
   * 4. Mark invitation used
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<{ userId: string; email: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    const tokenHash = crypto.createHash("sha256").update(dto.token).digest("hex");

    const invitation = await this.prisma.employeeInvitation.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, status: true } } },
    });

    if (!invitation) {
      throw new BadRequestException("Invalid or expired invitation link");
    }
    if (invitation.used) {
      throw new BadRequestException("This invitation has already been used");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation link has expired. Please request a new one.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      // Activate the user and set their password
      this.prisma.user.update({
        where: { id: invitation.userId },
        data: { passwordHash, status: "ACTIVE", passwordChangedAt: new Date() },
      }),
      // Mark invitation consumed
      this.prisma.employeeInvitation.update({
        where: { id: invitation.id },
        data: { used: true, usedAt: new Date() },
      }),
    ]);

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.auditService.log({
      userId: invitation.userId,
      action: "INVITATION_ACCEPTED" as any, // not in generated client yet (v1.1.1)
      entityType: "user",
      entityId: invitation.userId,
      ipAddress: "accept-invitation",
      userAgent: "accept-invitation",
    });

    return { userId: invitation.userId, email: invitation.user.email };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS — Signup
  // ---------------------------------------------------------------------------

  /**
   * Generates a unique URL-safe workspace slug from an org name.
   * Appends a numeric suffix on collision (up to 20 attempts).
   */
  private async generateWorkspaceSlug(orgName: string): Promise<string> {
    const base = orgName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;

    for (let i = 0; i <= 20; i++) {
      const candidate = i === 0 ? base : `${base}-${i.toString()}`;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const existing = await db.organization.findUnique({ where: { workspaceSlug: candidate } });
      if (!existing) return candidate;
    }
    // Fallback: base + random hex
    return `${base}-${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Resolves a username during signup using the same firstName.lastName pattern
   * as employee creation, but without injecting UsersService (avoids circular dep).
   */
  private async resolveSignupUsername(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string | null> {
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, ".");

    const fnNorm = normalize(firstName);
    const lnNorm = normalize(lastName);
    const base = `${fnNorm}.${lnNorm}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;

    const tryUsername = async (candidate: string): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const existing = await db.user.findUnique({ where: { username: candidate } });
      return existing ? null : candidate;
    };

    const found = await tryUsername(base);
    if (found) return found;

    for (let i = 2; i <= 10; i++) {
      const candidate = `${base}${i.toString()}`;
      const ok = await tryUsername(candidate);
      if (ok) return ok;
    }

    // Fallback: email prefix
    const emailPrefix = normalize(email.split("@")[0] ?? email);
    const fromEmail = await tryUsername(emailPrefix);
    if (fromEmail) return fromEmail;

    return null;
  }
}
