/**
 * Prinodia Workspace — Redis Module
 *
 * Provides a singleton ioredis client and the typed RedisService wrapper.
 * Marked @Global() so any module in the application can inject RedisService
 * without explicitly importing RedisModule.
 *
 * Database allocation:
 *   db 0 — application cache (permissions, blacklist, rate-limit counters)
 *   db 1 — BullMQ job queues (see QueueModule)
 *
 * Connection strategy:
 *   - lazyConnect: false — connect immediately at startup; fail fast if Redis unreachable
 *   - retryStrategy: exponential back-off capped at 2 s
 *   - reconnectOnError: reconnect on READONLY (Redis Sentinel failover) or ECONNRESET
 *
 * @see apps/api/src/config/redis.config.ts — env-driven config
 */

import { Global, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

import { REDIS_CLIENT, RedisService } from "./redis.service";

const logger = new Logger("RedisModule");

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const host = configService.get<string>("redis.host") ?? "localhost";
        const port = configService.get<number>("redis.port") ?? 6379;
        const db = configService.get<number>("redis.db") ?? 0;
        const password = configService.get<string | undefined>("redis.password");

        const redis = new Redis({
          host,
          port,
          db,
          ...(password !== undefined && { password }),
          lazyConnect: false,
          // Retry with exponential back-off, capped at 2 s
          retryStrategy: (times: number): number => Math.min(times * 100, 2000),
          // Reconnect on Redis Sentinel failover (READONLY) or dropped connections
          reconnectOnError: (err: Error): boolean => {
            const recoverable = ["READONLY", "ECONNRESET"];
            return recoverable.some((msg) => err.message.includes(msg));
          },
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
        });

        redis.on("connect", () => logger.log(`Redis connected — ${host}:${port}/db${db}`));
        redis.on("ready", () => logger.log("Redis ready"));
        redis.on("error", (err: Error) => logger.error("Redis error", err.message));
        redis.on("close", () => logger.warn("Redis connection closed"));
        redis.on("reconnecting", () => logger.warn("Redis reconnecting…"));

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
