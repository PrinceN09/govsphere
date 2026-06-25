/**
 * GovSphere — Queue Module (v0.6.3)
 *
 * Wires @nestjs/bull (Bull v4, backed by ioredis) with 4 queues:
 *
 *   email        (db 1) — transactional emails: reset, welcome, invitation, MFA OTP
 *   invitation   (db 1) — employee onboarding invitation flow
 *   notification (db 1) — in-app and push notifications
 *   audit        (db 1) — CSV export generation, log retention cleanup
 *
 * Redis database:
 *   db 0 — application cache (see RedisModule / RedisService)
 *   db 1 — Bull queues (BULLMQ_REDIS_DB env var, default 1)
 *
 * EmailQueueService is exported so any feature module can enqueue email jobs
 * without depending on Bull internals.
 *
 * @see https://docs.nestjs.com/techniques/queues
 */

import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuditExportProcessor } from "./processors/audit-export.processor";
import { EmailProcessor } from "./processors/email.processor";
import { QUEUES } from "./queues";
import { EmailQueueService } from "./services/email-queue.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [
    // ── Global Bull configuration (shared across all queues) ─────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("redis.host") ?? "localhost";
        const port = configService.get<number>("redis.port") ?? 6379;
        const db = configService.get<number>("redis.bullmqDb") ?? 1;
        const password = configService.get<string | undefined>("redis.password");

        return {
          redis: {
            host,
            port,
            db,
            ...(password !== undefined && { password }),
            enableOfflineQueue: true,
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        };
      },
      inject: [ConfigService],
    }),

    // ── Queue registration ───────────────────────────────────────────────────
    BullModule.registerQueue(
      { name: QUEUES.EMAIL },
      { name: QUEUES.INVITATION },
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.AUDIT },
    ),

    // ── Processor dependencies ───────────────────────────────────────────────
    ConfigModule,
    PrismaModule,
  ],

  providers: [EmailProcessor, AuditExportProcessor, EmailQueueService],

  exports: [
    EmailQueueService,
    // Export BullModule so feature modules can @InjectQueue() directly if needed
    BullModule,
  ],
})
export class QueueModule {}
