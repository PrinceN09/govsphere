/**
 * GovSphere — Health Check Controller
 *
 * Endpoints:
 *   GET /health        — Basic liveness (always 200 if the process is running)
 *   GET /health/live   — Kubernetes liveness probe (memory)
 *   GET /health/ready  — Kubernetes readiness probe (DB + Redis + disk)
 *   GET /health/db     — Database connectivity
 *   GET /health/redis  — Redis connectivity
 */

import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from "@nestjs/terminus";

import { RedisHealthIndicator } from "./redis-health.indicator";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Health")
@Controller("health")
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /health
   * Basic liveness — returns immediately if the process is alive.
   * Does not check downstream services.
   */
  @Get()
  @ApiOperation({ summary: "Basic liveness check" })
  live(): { status: string; service: string; version: string; timestamp: string } {
    return {
      status: "ok",
      service: "govsphere-api",
      version: "0.6.3",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /health/live
   * Kubernetes liveness probe.
   * Checks: process alive, memory heap < 512MB, memory RSS < 1GB.
   */
  @Get("live")
  @HealthCheck()
  @ApiOperation({ summary: "Kubernetes liveness probe" })
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 1024 * 1024 * 1024),
    ]);
  }

  /**
   * GET /health/ready
   * Kubernetes readiness probe.
   * Checks: DB reachable, Redis reachable, disk usage < 90%.
   * Returns 503 if any check fails (pod removed from load balancer).
   */
  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Kubernetes readiness probe" })
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck("database", this.prisma),
      () => this.redisHealth.isHealthy("redis"),
      () =>
        this.disk.checkStorage("disk", {
          path: "/",
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * GET /health/db
   * Explicit database health check.
   */
  @Get("db")
  @HealthCheck()
  @ApiOperation({ summary: "Database connectivity check" })
  database() {
    return this.health.check([() => this.prismaHealth.pingCheck("database", this.prisma)]);
  }

  /**
   * GET /health/redis
   * Explicit Redis health check.
   */
  @Get("redis")
  @HealthCheck()
  @ApiOperation({ summary: "Redis connectivity check" })
  redis() {
    return this.health.check([() => this.redisHealth.isHealthy("redis")]);
  }
}
