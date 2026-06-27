/**
 * Prinodia Workspace — ConnectionManagerService v1.2.0
 *
 * Tracks all active WebSocket connections (Redis + PostgreSQL).
 *
 * Note: DeviceType is a local string union; UserConnection model is accessed
 * via (this.prisma as any) because the Prisma sandbox blocks generation.
 */

import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

// Local type (Prisma sandbox — DeviceType enum not yet generated)
export type DeviceType = "WEB" | "DESKTOP" | "MOBILE" | "API";

export interface ConnectionMeta {
  socketId: string;
  userId: string;
  orgId: string;
  deviceType: DeviceType;
  connectedAt: string;
  lastHeartbeatAt: string;
  userAgent: string | undefined;
  ipAddress: string | undefined;
}

const TTL = 60 * 60; // 1 hour
const PREFIX = "connections:";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class ConnectionManagerService {
  private readonly logger = new Logger(ConnectionManagerService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.prisma as AnyPrisma;
  }

  async register(meta: ConnectionMeta): Promise<void> {
    const key = this.key(meta.userId);
    await this.redis.hSet(key, meta.socketId, JSON.stringify(meta));
    await this.redis.expire(key, TTL);

    await this.db.userConnection
      .upsert({
        where: { socketId: meta.socketId },
        create: {
          userId: meta.userId,
          socketId: meta.socketId,
          deviceType: meta.deviceType,
          userAgent: meta.userAgent ?? null,
          ipAddress: meta.ipAddress ?? null,
        },
        update: { lastHeartbeatAt: new Date() },
      })
      .catch((err: unknown) => {
        this.logger.warn("DB register failed:", err);
      });

    this.logger.debug(`[CM] registered ${meta.socketId} (${meta.userId})`);
  }

  async unregister(socketId: string, userId: string): Promise<void> {
    await this.redis.hDel(this.key(userId), socketId);
    await this.db.userConnection.deleteMany({ where: { socketId } }).catch((err: unknown) => {
      this.logger.warn("DB unregister failed:", err);
    });
    this.logger.debug(`[CM] unregistered ${socketId} (${userId})`);
  }

  async heartbeat(socketId: string, userId: string): Promise<void> {
    const key = this.key(userId);
    const raw = await this.redis.hGet(key, socketId);
    if (raw) {
      const meta = JSON.parse(raw) as ConnectionMeta;
      meta.lastHeartbeatAt = new Date().toISOString();
      await this.redis.hSet(key, socketId, JSON.stringify(meta));
      await this.redis.expire(key, TTL);
    }
    await this.db.userConnection
      .updateMany({ where: { socketId }, data: { lastHeartbeatAt: new Date() } })
      .catch(() => void 0);
  }

  async getConnections(userId: string): Promise<ConnectionMeta[]> {
    const map = await this.redis.hGetAll(this.key(userId));
    return Object.values(map)
      .map((v) => {
        try {
          return JSON.parse(v) as ConnectionMeta;
        } catch {
          return null;
        }
      })
      .filter((v): v is ConnectionMeta => v !== null);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.hLen(this.key(userId))) > 0;
  }

  async connectionCount(userId: string): Promise<number> {
    return this.redis.hLen(this.key(userId));
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    const online = new Set<string>();
    await Promise.all(
      userIds.map(async (uid) => {
        if (await this.isOnline(uid)) online.add(uid);
      }),
    );
    return online;
  }

  async listOrgConnections(
    orgId: string,
  ): Promise<Array<{ userId: string; socketId: string; deviceType: string; connectedAt: Date }>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.userConnection.findMany({
      where: { user: { organizationId: orgId } },
      select: { userId: true, socketId: true, deviceType: true, connectedAt: true },
      orderBy: { connectedAt: "desc" },
      take: 200,
    });
  }

  async sweepStaleConnections(olderThanMinutes = 90): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const result = (await this.db.userConnection.deleteMany({
      where: { lastHeartbeatAt: { lt: cutoff } },
    })) as { count: number };
    if (result.count > 0) this.logger.log(`[CM] swept ${result.count} stale connections`);
    return result.count;
  }

  private key(userId: string): string {
    return `${PREFIX}${userId}`;
  }
}
