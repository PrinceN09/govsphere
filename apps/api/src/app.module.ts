import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { CalendarModule } from "./calendar/calendar.module";
import { CollaborationModule } from "./collaboration/collaboration.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { LoggingModule } from "./common/logger/logger.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import {
  applicationConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  redisConfig,
  storageConfig,
  validateEnv,
} from "./config";
import { DemoModule } from "./demo/demo.module";
import { DocumentsModule } from "./documents/documents.module";
import { ExecutiveModule } from "./executive/executive.module";
import { GovernmentModule } from "./government/government.module";
import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./identity/identity.module";
import { CacheModule } from "./infrastructure/cache/cache.module";
import { EventsModule } from "./infrastructure/events/events.module";
import { QueueModule } from "./infrastructure/queue/queue.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { StorageModule } from "./infrastructure/storage/storage.module";
import { OrganizationModule } from "./organizations/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PeopleModule } from "./people/people.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SearchModule } from "./search/search.module";
import { WorkflowsModule } from "./workflows/workflows.module";

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────────────────────
    // Validates all required env vars at startup — fails fast if misconfigured.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      validate: validateEnv,
      load: [applicationConfig, databaseConfig, jwtConfig, mailConfig, redisConfig, storageConfig],
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 10, // 10 req/sec per IP
      },
      {
        name: "medium",
        ttl: 60_000, // 1 minute
        limit: 100, // 100 req/min per IP
      },
    ]),

    // ── Infrastructure ───────────────────────────────────────────────────────
    LoggingModule, // Global Pino-based structured logger
    RedisModule, // Global ioredis client — permission cache, JWT blacklist, rate-limit counters
    CacheModule, // NestJS CacheModule (in-memory L1; backed by RedisModule in future)
    QueueModule, // Bull job queues (email, invitation, notification, audit)
    StorageModule, // MinIO file storage (scaffold — activated Sprint 3)
    EventsModule, // Domain event system (scaffold — activated Sprint 2)

    // ── Database ─────────────────────────────────────────────────────────────
    PrismaModule,

    // ── Features ─────────────────────────────────────────────────────────────
    IdentityModule, // Auth, Users, Roles, Permissions, MFA, Sessions, Audit
    GovernmentModule, // Ministries, Departments, Divisions, Provinces, Positions, Assignments
    CollaborationModule, // Channels, Messages, DMs, Presence, Notifications (v0.7.0)
    DocumentsModule, // Documents & Writer Platform (v0.8.0)
    WorkflowsModule, // Workflow & Digital Approvals Platform (v0.8.1)
    CalendarModule, // Calendar, Meetings & Events Platform (v0.9.0)
    ExecutiveModule, // Executive Office & Cabinet Management (v1.0.0)
    OrganizationModule, // Organizations — neutral parent model (v1.0.2)
    DemoModule, // Demo Environment Generator (v1.1.0)
    SearchModule, // Global Search — GET /v1/search?q= (v1.1.0)
    PeopleModule, // People Foundation — Org hierarchy, profiles, skills, workload (v1.3.0)
    RealtimeModule, // Real-Time Collaboration Core — WebSocket, Presence, Activity, Notifications (v1.2.0)

    // ── Health ───────────────────────────────────────────────────────────────
    HealthModule, // GET /health, /health/live, /health/ready, /health/db
  ],

  providers: [
    // Global exception handler — structured JSON errors with requestId
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global validation pipe — all DTOs validated automatically
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // Strip unknown properties
        forbidNonWhitelisted: true, // 400 on unknown properties
        transform: true, // Auto-transform types
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    // Global rate limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth guard — routes must opt out with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global permissions guard — routes use @RequirePermissions() to lock down
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Apply request ID middleware to all routes.
   * Must run before any guard or interceptor so that requestId
   * is available in error responses and logs.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
