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

import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type {
  AccessTokenPayload,
  MfaChallengePayload,
  RefreshTokenPayload,
} from "../../common/types/auth.types";
import type { UserRole, UserStatus } from "@prisma/client";

/** Matricule regex: 1–4 digits, 1 or 2 dot-separated groups. */
const MATRICULE_REGEX = /^\d{1,4}(\.\d{1,4}){1,2}$/;

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
  matriculeNumber: string | null;
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
    const { credential, password, deviceFingerprint } = dto;

    const isMatricule = MATRICULE_REGEX.test(credential.trim());
    const where = isMatricule
      ? { matriculeNumber: credential.trim() }
      : { email: credential.trim().toLowerCase() };

    // 1. Look up the user
    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        matriculeNumber: true,
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
      },
    });

    // 2. Record login history regardless of outcome
    const credentialLabel = isMatricule ? credential.trim() : credential.trim().toLowerCase();

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
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        matriculeNumber: true,
        displayName: true,
        role: true,
        status: true,
        mfaEnabled: true,
        ministryId: true,
        departmentId: true,
        divisionId: true,
      },
    });

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
    const { credential } = dto;
    const isMatricule = MATRICULE_REGEX.test(credential.trim());
    const where = isMatricule
      ? { matriculeNumber: credential.trim() }
      : { email: credential.trim().toLowerCase() };

    const user = await this.prisma.user.findFirst({
      where,
      select: { id: true, email: true, status: true },
    });

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
      metadata: { credential: isMatricule ? "matricule" : "email" },
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
      matriculeNumber: string | null;
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
        matriculeNumber: user.matriculeNumber,
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
}
