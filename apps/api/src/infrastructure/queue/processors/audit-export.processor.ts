/**
 * Prinodia Workspace — Audit Export Processor
 *
 * Consumes jobs from the "audit" Bull queue.
 *
 * Job types:
 *   export-csv       — generate a CSV export of audit logs and notify requestor
 *   cleanup-old-logs — delete audit log entries older than AUDIT_LOG_RETENTION_DAYS
 *                      (scheduled nightly via @nestjs/schedule)
 */

import { OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../prisma/prisma.service";
import { AUDIT_JOBS, QUEUES } from "../queues";

import type { Job } from "bull";

// ── Job payload interfaces ────────────────────────────────────────────────────

export interface AuditExportJobData {
  requestedBy: string;
  filters: {
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
  };
  notifyEmail: string;
}

export interface AuditCleanupJobData {
  retentionDays?: number;
}

// ── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUES.AUDIT)
export class AuditExportProcessor {
  private readonly logger = new Logger(AuditExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Build a CSV of audit logs matching the given filters.
   * In production this would write to MinIO and notify via email.
   * For now: logs the row count so the job completes successfully.
   */
  @Process(AUDIT_JOBS.EXPORT_CSV)
  async handleExportCsv(job: Job<AuditExportJobData>): Promise<{ rows: number }> {
    const { requestedBy, filters } = job.data;
    this.logger.log(`Starting audit export for user ${requestedBy}`, filters);

    const where: Record<string, unknown> = {};
    if (filters.action) where["action"] = filters.action;
    if (filters.userId) where["userId"] = filters.userId;
    if (filters.startDate ?? filters.endDate) {
      where["createdAt"] = {
        ...(filters.startDate !== undefined && { gte: new Date(filters.startDate) }),
        ...(filters.endDate !== undefined && { lte: new Date(filters.endDate) }),
      };
    }

    const rows = await this.prisma.auditLog.count({ where });

    this.logger.log(`Audit export completed: ${rows} rows for user ${requestedBy}`);
    // TODO Sprint 3: write to MinIO + send download link via email queue
    return { rows };
  }

  /**
   * Delete audit log entries older than the configured retention window.
   * Default: 365 days (configurable via AUDIT_LOG_RETENTION_DAYS env var).
   */
  @Process(AUDIT_JOBS.CLEANUP_OLD_LOGS)
  async handleCleanup(job: Job<AuditCleanupJobData>): Promise<{ deleted: number }> {
    const retentionDays =
      job.data.retentionDays ?? this.config.get<number>("AUDIT_LOG_RETENTION_DAYS") ?? 365;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(
      `Audit cleanup: deleted ${result.count} entries older than ${retentionDays} days`,
    );

    return { deleted: result.count };
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error): void {
    this.logger.error(`Audit job #${job.id} (${job.name}) failed: ${err.message}`, err.stack);
  }
}
