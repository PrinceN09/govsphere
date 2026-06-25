import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

import type { ChangePositionDto } from "./dto/change-position.dto";
import type { TransferEmployeeDto } from "./dto/transfer-employee.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

/** Safe projection for workforce responses — no secrets. */
const WORKFORCE_USER_SELECT = {
  id: true,
  displayName: true,
  email: true,
  matriculeNumber: true,
  role: true,
  status: true,
  ministryId: true,
  departmentId: true,
  divisionId: true,
  officeId: true,
  managerId: true,
  updatedAt: true,
} as const;

@Injectable()
export class WorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // TRANSFER EMPLOYEE (org reassignment)
  // ---------------------------------------------------------------------------

  async transfer(
    targetUserId: string,
    dto: TransferEmployeeDto,
    executedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        status: true,
        ministryId: true,
        departmentId: true,
        divisionId: true,
        officeId: true,
        managerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    if (user.status === "ARCHIVED") {
      throw new BadRequestException({
        error: "USER_ARCHIVED",
        message: "Archived users cannot be transferred",
      });
    }

    // Ensure at least one field actually changes
    const hasChange =
      (dto.ministryId !== undefined && dto.ministryId !== user.ministryId) ||
      (dto.departmentId !== undefined && dto.departmentId !== user.departmentId) ||
      (dto.divisionId !== undefined && dto.divisionId !== user.divisionId) ||
      (dto.officeId !== undefined && dto.officeId !== user.officeId) ||
      (dto.managerId !== undefined && dto.managerId !== user.managerId);

    if (!hasChange) {
      throw new BadRequestException({
        error: "NO_CHANGE",
        message: "Transfer must change at least one organizational field",
      });
    }

    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

    // Snapshot the "to" values (use provided value, else keep current)
    const toMinistryId = dto.ministryId ?? user.ministryId;
    const toDepartmentId = dto.departmentId ?? user.departmentId;
    const toDivisionId = dto.divisionId ?? user.divisionId;
    const toOfficeId = dto.officeId ?? user.officeId;
    const toManagerId = dto.managerId ?? user.managerId;

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          ministryId: toMinistryId,
          departmentId: toDepartmentId,
          divisionId: toDivisionId,
          officeId: toOfficeId,
          managerId: toManagerId,
        },
        select: WORKFORCE_USER_SELECT,
      }),
      this.prisma.workforceTransfer.create({
        data: {
          userId: targetUserId,
          transferredById: executedBy.id,
          fromMinistryId: user.ministryId,
          fromDepartmentId: user.departmentId,
          fromDivisionId: user.divisionId,
          fromOfficeId: user.officeId,
          fromManagerId: user.managerId,
          toMinistryId,
          toDepartmentId,
          toDivisionId,
          toOfficeId,
          toManagerId,
          reason: dto.reason ?? null,
          effectiveDate,
        },
      }),
    ]);

    this.auditService.log({
      userId: executedBy.id,
      action: "EMPLOYEE_TRANSFERRED",
      entityType: "USER",
      entityId: targetUserId,
      metadata: {
        from: {
          ministryId: user.ministryId,
          departmentId: user.departmentId,
          divisionId: user.divisionId,
          officeId: user.officeId,
          managerId: user.managerId,
        },
        to: { toMinistryId, toDepartmentId, toDivisionId, toOfficeId, toManagerId },
        reason: dto.reason,
      },
      ipAddress,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // CHANGE POSITION
  // ---------------------------------------------------------------------------

  async changePosition(
    targetUserId: string,
    dto: ChangePositionDto,
    executedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    if (user.status === "ARCHIVED") {
      throw new BadRequestException({
        error: "USER_ARCHIVED",
        message: "Archived users cannot have their position changed",
      });
    }

    const position = await this.prisma.position.findUnique({
      where: { id: dto.positionId },
      select: { id: true, title: true, code: true },
    });

    if (!position) {
      throw new NotFoundException({ error: "POSITION_NOT_FOUND", message: "Position not found" });
    }

    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

    // Get current primary assignment (for snapshot + end-dating)
    const currentAssignment = await this.prisma.employeeAssignment.findFirst({
      where: { userId: targetUserId, isPrimary: true, isActive: true },
      select: { id: true, positionId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // End current primary assignment if exists
      if (currentAssignment) {
        await tx.employeeAssignment.update({
          where: { id: currentAssignment.id },
          data: { isActive: false, endDate: effectiveDate },
        });
      }

      // Create new primary assignment
      await tx.employeeAssignment.create({
        data: {
          userId: targetUserId,
          positionId: dto.positionId,
          startDate: effectiveDate,
          isPrimary: true,
          isActive: true,
          assignedById: executedBy.id,
        },
      });

      // Record in workforce_transfers for history
      await tx.workforceTransfer.create({
        data: {
          userId: targetUserId,
          transferredById: executedBy.id,
          fromPositionId: currentAssignment?.positionId ?? null,
          toPositionId: dto.positionId,
          reason: dto.reason ?? null,
          effectiveDate,
        },
      });
    });

    this.auditService.log({
      userId: executedBy.id,
      action: "EMPLOYEE_POSITION_CHANGED",
      entityType: "USER",
      entityId: targetUserId,
      metadata: {
        fromPositionId: currentAssignment?.positionId,
        toPositionId: dto.positionId,
        positionTitle: position.title,
        reason: dto.reason,
      },
      ipAddress,
    });

    return this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        ...WORKFORCE_USER_SELECT,
        employeeAssignments: {
          where: { isActive: true },
          select: {
            id: true,
            isPrimary: true,
            startDate: true,
            position: { select: { id: true, title: true, code: true, level: true } },
          },
          orderBy: { startDate: "desc" as const },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // GET TRANSFER HISTORY
  // ---------------------------------------------------------------------------

  async getTransferHistory(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    return this.prisma.workforceTransfer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
