import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { RedisService } from "../../../infrastructure/redis/redis.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { PermissionsService } from "../../permissions/permissions.service";

import type { AccessTokenPayload, AuthenticatedUser } from "../../../common/types/auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ["RS256"],
      secretOrKey: configService.getOrThrow<string>("JWT_PUBLIC_KEY").replace(/\\n/g, "\n"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    // ── Blacklist check (Redis) ───────────────────────────────────────────────
    // Fast path: if the JTI was blacklisted on logout, reject immediately
    // without hitting the database. Falls back to DB-only check if Redis is down.
    if (payload.jti) {
      const blacklisted = await this.redis.isTokenBlacklisted(payload.jti).catch(() => false); // Redis unavailable — let DB session check handle it

      if (blacklisted) {
        throw new UnauthorizedException({
          error: "TOKEN_REVOKED",
          message: "Token has been revoked",
        });
      }
    }

    // ── DB user check ─────────────────────────────────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        matriculeNumber: true,
        role: true,
        status: true,
        ministryId: true,
        departmentId: true,
        divisionId: true,
        mfaEnabled: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({
        error: "UNAUTHORIZED",
        message: "Account is not active",
      });
    }

    // ── Permission resolution (Redis-cached) ─────────────────────────────────
    const permissions = await this.permissionsService.resolvePermissionsForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      matriculeNumber: user.matriculeNumber,
      role: user.role,
      roleWeight: payload.weight,
      ministryId: user.ministryId,
      departmentId: user.departmentId,
      divisionId: user.divisionId,
      sessionId: payload.sessionId,
      permissions,
      mfaEnabled: user.mfaEnabled,
    };
  }
}
