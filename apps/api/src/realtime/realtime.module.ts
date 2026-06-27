/**
 * Prinodia Workspace — RealtimeModule v1.2.0
 *
 * Bundles all real-time infrastructure:
 *   - EventBusService (domain event bus)
 *   - ConnectionManagerService (multi-device tracking)
 *   - RealtimePresenceService (Redis-backed presence)
 *   - RoomsService (Socket.IO room management)
 *   - ActivityService (persistent activity feed)
 *   - NotificationHubService (multi-channel notifications)
 *   - RealtimeGateway (WebSocket gateway)
 *   - PresenceController, ActivityController, ConnectionsController (REST)
 *
 * Depends on:
 *   - RedisModule (for RedisService)
 *   - PrismaModule (for PrismaService)
 *   - JwtModule (for WsAuthGuard)
 *   - EventEmitterModule (registered globally by EventsModule)
 */

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { RedisModule } from "../infrastructure/redis/redis.module";
import { PrismaModule } from "../prisma/prisma.module";

// Services
import { ActivityController } from "./controllers/activity.controller";
import { ConnectionsController } from "./controllers/connections.controller";
import { PresenceController } from "./controllers/presence.controller";
import { EventBusService } from "./events/event-bus.service";
import { RealtimeGateway } from "./gateway/realtime.gateway";
import { WsAuthGuard } from "./guards/ws-auth.guard";
import { ActivityService } from "./services/activity.service";
import { ConnectionManagerService } from "./services/connection-manager.service";
import { NotificationHubService } from "./services/notification-hub.service";
import { RealtimePresenceService } from "./services/presence.service";
import { RoomsService } from "./services/rooms.service";

// Gateway

// Guards

// Controllers

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"] ?? "dev-secret",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  providers: [
    // Event bus (EventEmitter2 is injected from the global EventEmitterModule)
    EventBusService,

    // Core services
    ConnectionManagerService,
    RealtimePresenceService,
    RoomsService,
    ActivityService,
    NotificationHubService,

    // WebSocket gateway
    RealtimeGateway,

    // Auth guard
    WsAuthGuard,
  ],
  controllers: [PresenceController, ActivityController, ConnectionsController],
  exports: [
    EventBusService,
    RealtimePresenceService,
    ConnectionManagerService,
    ActivityService,
    NotificationHubService,
  ],
})
export class RealtimeModule {}
