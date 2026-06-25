import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./redis-health.indicator";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Health module — provides liveness, readiness, and component-level probes.
 * RedisModule is @Global(), so RedisService is injected without explicit import here.
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
