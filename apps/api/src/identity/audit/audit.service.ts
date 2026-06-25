import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import type { AuditAction } from "@prisma/client";

// ─── Timeline helpers ─────────────────────────────────────────────────────────

const ACTION_CATEGORIES: Partial<Record<AuditAction, string>> = {
  USER_CREATED: "lifecycle",
  USER_UPDATED: "lifecycle",
  USER_DEACTIVATED: "lifecycle",
  USER_SUSPENDED: "lifecycle",
  USER_REACTIVATED: "lifecycle",
  USER_UNLOCKED: "lifecycle",
  ACCOUNT_LOCKED: "lifecycle",
  EMPLOYEE_INVITED: "lifecycle",
  EMPLOYEE_ACTIVATED: "lifecycle",
  EMPLOYEE_ARCHIVED: "lifecycle",
  EMPLOYEE_INVITATION_RESENT: "lifecycle",
  ROLE_ASSIGNED: "roles",
  ROLE_REMOVED: "roles",
  PERMISSION_CHANGED: "roles",
  EMPLOYEE_TRANSFERRED: "workforce",
  EMPLOYEE_MANAGER_CHANGED: "workforce",
  EMPLOYEE_POSITION_CHANGED: "workforce",
  EMPLOYEE_ASSIGNED: "workforce",
  EMPLOYEE_ASSIGNMENT_ENDED: "workforce",
  LOGIN_SUCCESS: "security",
  LOGIN_FAILED: "security",
  LOGOUT: "security",
  LOGOUT_ALL: "security",
  TOKEN_REFRESH: "security",
  TOKEN_INVALID: "security",
  MFA_ENABLED: "security",
  MFA_DISABLED: "security",
  MFA_CHALLENGE_SUCCESS: "security",
  MFA_CHALLENGE_FAILED: "security",
  MFA_BACKUP_CODE_USED: "security",
  PASSWORD_CHANGED: "security",
  PASSWORD_CHANGED_BY_ADMIN: "security",
  PASSWORD_RESET_REQUESTED: "security",
  PASSWORD_RESET: "security",
  SESSION_CREATED: "session",
  SESSION_REVOKED: "session",
};

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  USER_CREATED: "Account created",
  USER_UPDATED: "Profile updated",
  USER_DEACTIVATED: "Account deactivated",
  USER_SUSPENDED: "Account suspended",
  USER_REACTIVATED: "Account reactivated",
  USER_UNLOCKED: "Account unlocked",
  ACCOUNT_LOCKED: "Account locked",
  EMPLOYEE_INVITED: "Invitation sent",
  EMPLOYEE_ACTIVATED: "Account activated",
  EMPLOYEE_ARCHIVED: "Account archived",
  EMPLOYEE_INVITATION_RESENT: "Invitation resent",
  ROLE_ASSIGNED: "Role assigned",
  ROLE_REMOVED: "Role removed",
  PERMISSION_CHANGED: "Permissions changed",
  EMPLOYEE_TRANSFERRED: "Transferred to new unit",
  EMPLOYEE_MANAGER_CHANGED: "Manager changed",
  EMPLOYEE_POSITION_CHANGED: "Position changed",
  EMPLOYEE_ASSIGNED: "Assigned to position",
  EMPLOYEE_ASSIGNMENT_ENDED: "Position assignment ended",
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Sign-in attempt failed",
  LOGOUT: "Signed out",
  LOGOUT_ALL: "Signed out of all devices",
  MFA_ENABLED: "MFA enabled",
  MFA_DISABLED: "MFA disabled",
  MFA_CHALLENGE_SUCCESS: "MFA verified",
  MFA_CHALLENGE_FAILED: "MFA failed",
  MFA_BACKUP_CODE_USED: "MFA backup code used",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_CHANGED_BY_ADMIN: "Password reset by admin",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  PASSWORD_RESET: "Password reset",
  SESSION_CREATED: "Session started",
  SESSION_REVOKED: "Session revoked",
};

function categoriseAction(action: AuditAction): string {
  return ACTION_CATEGORIES[action] ?? "other";
}

function labelForAction(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an immutable audit log entry.
   * Fires asynchronously and never throws — audit failures must not block requests.
   */
  log(input: AuditLogInput): void {
    this.writeLog(input).catch((err: unknown) => {
      this.logger.error(`Audit log write failed for action ${input.action}:`, err);
    });
  }

  /** Await the write (used in tests to ensure log is persisted before assertions). */
  async logAndWait(input: AuditLogInput): Promise<void> {
    await this.writeLog(input);
  }

  private async writeLog(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as object,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  /**
   * Return a rich chronological timeline for a single employee:
   * audit log entries where entityType=USER and entityId=userId,
   * enriched with display labels.
   */
  async getTimelineForUser(
    userId: string,
    limit = 100,
  ): Promise<
    {
      id: string;
      action: string;
      category: string;
      label: string;
      metadata: Record<string, unknown>;
      ipAddress: string | null;
      createdAt: Date;
    }[]
  > {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType: "USER", entityId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      category: categoriseAction(log.action),
      label: labelForAction(log.action),
      metadata: (log.metadata as Record<string, unknown> | null) ?? {},
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    }));
  }

  /**
   * Query audit logs with filters and pagination.
   * Only ADMIN:VIEW_AUDIT_LOGS_* routes call this — authorization enforced upstream.
   */
  async findMany(params: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    ministryId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: unknown[]; meta: { total: number; page: number; limit: number } }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.userId) where["userId"] = params.userId;
    if (params.action) where["action"] = params.action;
    if (params.entityType) where["entityType"] = params.entityType;
    if (params.entityId) where["entityId"] = params.entityId;

    if (params.startDate ?? params.endDate) {
      where["createdAt"] = {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              matriculeNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }
}
