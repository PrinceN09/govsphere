/**
 * GovSphere — Redis Service
 *
 * Typed wrapper around ioredis for use across the application.
 * Provides:
 *   - Permission cache (userId → permissions[], 60 s TTL)
 *   - Session / JWT blacklist (jti → "revoked", TTL = remaining token lifetime)
 *   - Login rate-limit counters (ip:email → failed-attempt count, 30 min TTL)
 *   - Health probe (PING / PONG)
 *
 * Inject this service — never inject the raw Redis client directly.
 */

import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  // ── Generic key/value ───────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Set a key. Pass ttlSeconds to use SETEX (expiry). */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /** Returns remaining TTL in seconds, or -1 (no expiry), or -2 (key missing). */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ── Permission cache ─────────────────────────────────────────────────────────

  private permKey(userId: string): string {
    return `perm:${userId}`;
  }

  async getPermissions(userId: string): Promise<string[] | null> {
    const raw = await this.client.get(this.permKey(userId));
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as string[];
    } catch {
      return null; // corrupted cache entry — treat as miss
    }
  }

  async setPermissions(userId: string, permissions: string[], ttlSeconds = 60): Promise<void> {
    await this.client.setex(this.permKey(userId), ttlSeconds, JSON.stringify(permissions));
  }

  async invalidatePermissions(userId: string): Promise<void> {
    await this.client.del(this.permKey(userId));
  }

  // ── JWT / session blacklist ──────────────────────────────────────────────────

  private blacklistKey(jti: string): string {
    return `bl:${jti}`;
  }

  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    await this.client.setex(this.blacklistKey(jti), expiresInSeconds, "1");
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return (await this.client.exists(this.blacklistKey(jti))) === 1;
  }

  // ── Login rate-limit ─────────────────────────────────────────────────────────

  private loginLimitKey(ip: string, email: string): string {
    return `login:${ip}:${email}`;
  }

  /** Increment failed-login counter. Returns new count. Sets 30-min TTL on first increment. */
  async incrementLoginFailures(ip: string, email: string): Promise<number> {
    const key = this.loginLimitKey(ip, email);
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, 1800); // 30 minutes
    }
    return count;
  }

  async resetLoginFailures(ip: string, email: string): Promise<void> {
    await this.client.del(this.loginLimitKey(ip, email));
  }

  async getLoginFailures(ip: string, email: string): Promise<number> {
    const val = await this.client.get(this.loginLimitKey(ip, email));
    return val !== null ? parseInt(val, 10) : 0;
  }

  // ── Health ───────────────────────────────────────────────────────────────────

  async ping(): Promise<string> {
    return this.client.ping();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  onModuleDestroy(): void {
    this.client.disconnect();
    this.logger.log("Redis client disconnected");
  }
}
