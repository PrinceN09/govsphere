/**
 * Prinodia Workspace — PresenceService
 *
 * Live presence is ephemeral and stored entirely in Redis.
 * The only thing persisted to PostgreSQL is User.lastSeenAt.
 *
 * Redis key schema:
 *   presence:{userId}  → JSON: { status, ministryId?, officeId?, updatedAt }
 *   TTL: 5 minutes — auto-expires on disconnect, heartbeat refreshes it
 */

import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { AuthenticatedUser } from "../../common/types/auth.types";

export type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "DO_NOT_DISTURB" | "OFFLINE";

export interface PresenceState {
  userId: string;
  status: PresenceStatus;
  ministryId?: string;
  officeId?: string;
  updatedAt: string;
}

const PRESENCE_TTL = 5 * 60; // 5 minutes (seconds)
const PRESENCE_PREFIX = "presence:";

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Set presence ──────────────────────────────────────────────────────────

  async setPresence(
    status: PresenceStatus,
    actor: AuthenticatedUser,
    context?: { ministryId?: string; officeId?: string },
  ): Promise<PresenceState> {
    const state: PresenceState = {
      userId: actor.id,
      status,
      updatedAt: new Date().toISOString(),
      ...(context?.ministryId ? { ministryId: context.ministryId } : {}),
      ...(context?.officeId ? { officeId: context.officeId } : {}),
    };

    await this.redis.set(this.presenceKey(actor.id), JSON.stringify(state), PRESENCE_TTL);

    // Presence is tracked in Redis; no DB write needed here

    return state;
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  async heartbeat(actor: AuthenticatedUser): Promise<{ ok: boolean }> {
    const key = this.presenceKey(actor.id);
    const raw = await this.redis.get(key);

    if (raw) {
      // Refresh TTL without changing status
      await this.redis.expire(key, PRESENCE_TTL);
    } else {
      // Session expired — set ONLINE
      await this.setPresence("ONLINE", actor);
    }

    return { ok: true };
  }

  // ── Get presence ──────────────────────────────────────────────────────────

  async getPresence(userId: string): Promise<PresenceState> {
    const raw = await this.redis.get(this.presenceKey(userId));
    if (!raw) {
      return { userId, status: "OFFLINE", updatedAt: new Date().toISOString() };
    }

    try {
      return JSON.parse(raw) as PresenceState;
    } catch {
      return { userId, status: "OFFLINE", updatedAt: new Date().toISOString() };
    }
  }

  // ── Bulk presence ─────────────────────────────────────────────────────────

  async getBulkPresence(userIds: string[]): Promise<PresenceState[]> {
    if (userIds.length === 0) return [];

    const keys = userIds.map((id) => this.presenceKey(id));
    const values = await this.redis.mGet(keys);

    return userIds.map((id, i) => {
      const raw = values[i];
      if (!raw)
        return { userId: id, status: "OFFLINE" as const, updatedAt: new Date().toISOString() };
      try {
        return JSON.parse(raw) as PresenceState;
      } catch {
        return { userId: id, status: "OFFLINE" as const, updatedAt: new Date().toISOString() };
      }
    });
  }

  // ── Clear on logout ───────────────────────────────────────────────────────

  async clearPresence(userId: string): Promise<void> {
    await this.redis.del(this.presenceKey(userId));
  }

  private presenceKey(userId: string): string {
    return `${PRESENCE_PREFIX}${userId}`;
  }
}
