import * as crypto from "crypto";

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

import type { MfaChallengePayload } from "../../common/types/auth.types";
import type { AuthService, LoginResult } from "../auth/auth.service";

const BACKUP_CODE_COUNT = 8;
const BCRYPT_ROUNDS = 10; // Lower for backup codes (not main password)
/** Encryption algorithm for TOTP secrets. */
const ENC_ALG = "aes-256-gcm";

export interface MfaSetupResult {
  secret: string;
  otpauthUri: string;
  /** Base64-encoded PNG QR code. Requires qrcode package — returns placeholder if unavailable. */
  qrCode: string;
}

@Injectable()
export class MfaService {
  // Holds unconfirmed setup secrets in memory (keyed by userId, TTL 10 min)
  private readonly pendingSetup = new Map<string, { secret: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {
    authenticator.options = { window: 1 }; // Accept ±1 period for clock skew
  }

  // ---------------------------------------------------------------------------
  // SETUP — Step 1: Generate secret + QR code (not saved yet)
  // ---------------------------------------------------------------------------

  async setupTotp(userId: string): Promise<MfaSetupResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    const secret = authenticator.generateSecret(20); // 160-bit secret

    // Hold in memory — not persisted until verify-setup is called
    this.pendingSetup.set(userId, { secret, expiresAt: Date.now() + 10 * 60 * 1000 });

    const otpauthUri = authenticator.keyuri(user.email, "Prinodia Workspace", secret);

    // Try to generate QR code — gracefully degrade if qrcode package unavailable
    let qrCode = `data:text/plain;base64,${Buffer.from(otpauthUri).toString("base64")}`;
    try {
      // Dynamic import — qrcode is optional
      const QRCode = await import("qrcode").catch(() => null);
      if (QRCode) {
        qrCode = await (QRCode as { toDataURL: (s: string) => Promise<string> }).toDataURL(
          otpauthUri,
        );
      }
    } catch {
      /* qrcode not installed — use URI fallback */
    }

    return { secret, otpauthUri, qrCode };
  }

  // ---------------------------------------------------------------------------
  // SETUP — Step 2: Verify first code to activate MFA
  // ---------------------------------------------------------------------------

  async confirmSetup(
    userId: string,
    code: string,
    ipAddress: string,
  ): Promise<{ backupCodes: string[] }> {
    const pending = this.pendingSetup.get(userId);

    if (!pending || pending.expiresAt < Date.now()) {
      throw new BadRequestException({
        error: "SETUP_EXPIRED",
        message: "MFA setup has expired. Please start again.",
      });
    }

    const valid = authenticator.check(code, pending.secret);
    if (!valid) {
      throw new BadRequestException({
        error: "INVALID_CODE",
        message: "Invalid authenticator code",
      });
    }

    // Encrypt secret before storing
    const encryptedSecret = this.encryptSecret(pending.secret);
    this.pendingSetup.delete(userId);

    // Generate backup codes
    const rawCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => this.generateBackupCode());

    await this.prisma.$transaction(async (tx) => {
      // Delete any existing backup codes
      await tx.mfaBackupCode.deleteMany({ where: { userId } });

      // Store encrypted secret + enable MFA
      await tx.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaSecret: encryptedSecret },
      });

      // Store hashed backup codes
      await tx.mfaBackupCode.createMany({
        data: await Promise.all(
          rawCodes.map(async (code) => ({
            userId,
            codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
          })),
        ),
      });
    });

    this.auditService.log({
      userId,
      action: "MFA_ENABLED",
      entityType: "USER",
      entityId: userId,
      metadata: { method: "TOTP" },
      ipAddress,
    });

    return { backupCodes: rawCodes };
  }

  // ---------------------------------------------------------------------------
  // VERIFY — During login challenge
  // ---------------------------------------------------------------------------

  async verifyChallenge(
    challengeToken: string,
    code: string | undefined,
    backupCode: string | undefined,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<LoginResult> {
    // Validate challenge token
    let payload: MfaChallengePayload;
    try {
      const publicKey = this.configService
        .getOrThrow<string>("JWT_PUBLIC_KEY")
        .replace(/\\n/g, "\n");
      payload = this.jwtService.verify<MfaChallengePayload>(challengeToken, {
        algorithms: ["RS256"],
        publicKey,
      });
    } catch {
      throw new UnauthorizedException({
        error: "CHALLENGE_EXPIRED",
        message: "MFA challenge has expired",
      });
    }

    if (payload.type !== "mfa_challenge") {
      throw new UnauthorizedException({
        error: "INVALID_TOKEN",
        message: "Invalid challenge token",
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException({ error: "MFA_NOT_ENABLED", message: "MFA is not enabled" });
    }

    let verified = false;

    if (code) {
      const secret = this.decryptSecret(user.mfaSecret);
      verified = authenticator.check(code, secret);

      this.auditService.log({
        userId: payload.sub,
        action: verified ? "MFA_CHALLENGE_SUCCESS" : "MFA_CHALLENGE_FAILED",
        entityType: "USER",
        entityId: payload.sub,
        metadata: { method: "TOTP" },
        ipAddress,
        userAgent,
      });
    } else if (backupCode) {
      verified = await this.verifyBackupCode(payload.sub, backupCode, ipAddress, userAgent);
    }

    if (!verified) {
      throw new UnauthorizedException({ error: "INVALID_CODE", message: "Invalid MFA code" });
    }

    // Issue full tokens via AuthService
    return this.authService.loginAfterMfa(payload.sub, ipAddress, userAgent, deviceFingerprint);
  }

  // ---------------------------------------------------------------------------
  // DISABLE MFA
  // ---------------------------------------------------------------------------

  async disableMfa(userId: string, code: string, ipAddress: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException({ error: "MFA_NOT_ENABLED", message: "MFA is not enabled" });
    }

    const secret = this.decryptSecret(user.mfaSecret);
    const valid = authenticator.check(code, secret);

    if (!valid) {
      throw new BadRequestException({
        error: "INVALID_CODE",
        message: "Invalid code. MFA not disabled.",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
      });
      await tx.mfaBackupCode.deleteMany({ where: { userId } });
    });

    this.auditService.log({
      userId,
      action: "MFA_DISABLED",
      entityType: "USER",
      entityId: userId,
      metadata: { method: "TOTP", disabledBy: userId },
      ipAddress,
    });
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async verifyBackupCode(
    userId: string,
    rawCode: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    const codes = await this.prisma.mfaBackupCode.findMany({
      where: { userId, isUsed: false },
      select: { id: true, codeHash: true },
    });

    for (const { id, codeHash } of codes) {
      const match = await bcrypt.compare(rawCode, codeHash);
      if (match) {
        // Mark used
        await this.prisma.mfaBackupCode.update({
          where: { id },
          data: { isUsed: true, usedAt: new Date() },
        });

        const remaining = codes.length - 1;
        this.auditService.log({
          userId,
          action: "MFA_BACKUP_CODE_USED",
          entityType: "USER",
          entityId: userId,
          metadata: { codesRemaining: remaining },
          ipAddress,
          userAgent,
        });

        return true;
      }
    }

    this.auditService.log({
      userId,
      action: "MFA_CHALLENGE_FAILED",
      entityType: "USER",
      entityId: userId,
      metadata: { method: "BACKUP_CODE" },
      ipAddress,
      userAgent,
    });

    return false;
  }

  private generateBackupCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const half = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)] ?? "A").join(
      "",
    );
    const half2 = Array.from(
      { length: 5 },
      () => chars[crypto.randomInt(chars.length)] ?? "A",
    ).join("");
    return `${half}-${half2}`;
  }

  private encryptSecret(plaintext: string): string {
    const key = Buffer.from(this.configService.getOrThrow<string>("MFA_ENCRYPTION_KEY"), "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENC_ALG, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv:tag:ciphertext (all hex)
    return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
  }

  private decryptSecret(encrypted: string): string {
    const parts = encrypted.split(":");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error("Invalid encrypted secret format");
    }
    const [ivHex, tagHex, encHex] = parts;
    const key = Buffer.from(this.configService.getOrThrow<string>("MFA_ENCRYPTION_KEY"), "hex");
    const decipher = crypto.createDecipheriv(ENC_ALG, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
    return dec.toString("utf8");
  }
}
