/**
 * GovSphere — Permissions Service
 *
 * Resolves the full permission set for a user based on their active role assignments.
 *
 * Caching strategy (v0.6.3+):
 *   - Redis key: perm:{userId}  TTL: 60 s
 *   - On hit: return cached string[] immediately (no DB round-trip)
 *   - On miss: query DB, write to Redis, return result
 *   - On role change: call invalidateCache(userId) to evict the key
 *   - Resilient: if Redis is unreachable, falls back to direct DB query
 */

import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

/** TTL for the Redis permission cache entry (seconds). */
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Resolve all permissions for a user based on their active role assignments.
   * Also falls back to the legacy User.role enum field for quick bootstrap.
   */
  async resolvePermissionsForUser(userId: string): Promise<string[]> {
    // ── Cache hit ────────────────────────────────────────────────────────────
    try {
      const cached = await this.redis.getPermissions(userId);
      if (cached !== null) {
        return cached;
      }
    } catch (err) {
      // Redis unavailable — degrade gracefully, continue to DB query
      this.logger.warn("Redis unavailable for permission cache lookup, falling back to DB", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // ── DB query ─────────────────────────────────────────────────────────────
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissionSet = new Set<string>();

    if (assignments.length === 0) {
      // Fall back to legacy User.role enum — look up the system role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user) {
        const systemRole = await this.prisma.role.findUnique({
          where: { name: user.role },
          include: {
            permissions: { include: { permission: true } },
          },
        });

        systemRole?.permissions.forEach((rp: { permission: { key: string } }) =>
          permissionSet.add(rp.permission.key),
        );
      }
    } else {
      for (const assignment of assignments) {
        for (const rp of assignment.role.permissions) {
          permissionSet.add(rp.permission.key);
        }
      }
    }

    const permissions = Array.from(permissionSet);

    // ── Cache write ──────────────────────────────────────────────────────────
    try {
      await this.redis.setPermissions(userId, permissions, CACHE_TTL_SECONDS);
    } catch (err) {
      // Cache write failure is non-fatal — log and continue
      this.logger.warn("Failed to write permission cache to Redis", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return permissions;
  }

  /** Invalidate the Redis permission cache when a user's roles change. */
  async invalidateCache(userId: string): Promise<void> {
    try {
      await this.redis.invalidatePermissions(userId);
    } catch (err) {
      this.logger.warn("Failed to invalidate permission cache", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** List all permissions in the system. */
  async findAll(): Promise<
    { id: string; key: string; displayName: string; resource: string; action: string }[]
  > {
    return this.prisma.permission.findMany({
      select: { id: true, key: true, displayName: true, resource: true, action: true },
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
  }
}
