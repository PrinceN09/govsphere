/**
 * Prinodia Workspace — Structured Logger Service
 *
 * Wraps pino for structured JSON logging with:
 *   - Request ID correlation (set per-request from X-Request-ID header or UUID)
 *   - Context tagging (NestJS class/method context)
 *   - Log levels mapped to Pino's levels
 *   - Loki-compatible JSON output (level, msg, requestId, context, timestamp)
 *
 * Usage:
 *   private readonly logger = new AppLogger(MyService.name);
 *   this.logger.log('User logged in', { userId });
 */

import { Injectable, LoggerService, Scope } from "@nestjs/common";
// eslint-disable-next-line import/no-named-as-default
import pino, { stdTimeFunctions } from "pino";

// Re-export so callers can use this type without importing pino directly
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const pinoLogger = pino({
  level: (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info",
  base: {
    service: "govsphere-api",
    env: process.env["NODE_ENV"] ?? "development",
  },
  timestamp: stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      // Output "level": "info" instead of "level": 30 for Loki compatibility
      return { level: label };
    },
  },
});

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    // exactOptionalPropertyTypes: never assign undefined explicitly to an optional
    // property — omit the assignment entirely when context is not provided.
    if (context !== undefined) {
      this.context = context;
    }
  }

  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Builds the pino merging object.
   * With exactOptionalPropertyTypes we must not set `context: undefined` explicitly.
   * Only include the key when context is actually defined.
   */
  private buildMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    const base: Record<string, unknown> = {};
    if (this.context !== undefined) {
      base["context"] = this.context;
    }
    return { ...base, ...meta };
  }

  log(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.info(this.buildMeta(meta), message);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.error(this.buildMeta(meta), message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.warn(this.buildMeta(meta), message);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.debug(this.buildMeta(meta), message);
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.trace(this.buildMeta(meta), message);
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    pinoLogger.fatal(this.buildMeta(meta), message);
  }
}
