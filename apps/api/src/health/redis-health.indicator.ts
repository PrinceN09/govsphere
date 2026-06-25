/**
 * GovSphere — Redis Health Indicator
 *
 * Used by HealthController to verify Redis is reachable.
 * Sends PING; expects PONG within the terminus timeout window.
 */

import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";

import { RedisService } from "../infrastructure/redis/redis.service";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const healthy = pong === "PONG";
      const result = this.getStatus(key, healthy);

      if (!healthy) {
        throw new HealthCheckError(`${key} returned unexpected response: ${pong}`, result);
      }

      return result;
    } catch (err) {
      if (err instanceof HealthCheckError) throw err;

      const result = this.getStatus(key, false, {
        message: err instanceof Error ? err.message : String(err),
      });
      throw new HealthCheckError(`${key} ping failed`, result);
    }
  }
}
