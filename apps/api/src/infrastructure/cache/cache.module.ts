/**
 * Prinodia Workspace — Cache Module
 *
 * Wraps NestJS CacheModule with Redis store.
 * Used for:
 *   - PermissionsService in-process permission cache (1 min TTL)
 *   - JWT blacklist (JTI → expiry, via Redis directly in AuthService)
 *   - Session validation cache
 *
 * Sprint 1: PermissionsService uses an in-process Map cache.
 * Sprint 2+: Migrate to this Redis-backed module for horizontal scale.
 *
 * @see https://docs.nestjs.com/techniques/caching
 */

import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (_configService: ConfigService) => ({
        // TODO Sprint 2: Replace with Redis store:
        //   store: redisStore,
        //   host: configService.get('REDIS_HOST'),
        //   port: configService.get('REDIS_PORT'),
        ttl: 60, // seconds
        max: 1000, // max items in in-memory store
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
