import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreateAssignmentDto } from "./dto/create-assignment.dto";
import type { EndAssignmentDto } from "./dto/end-assignment.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

// employeeAssignment/position models require `prisma generate`
// after migration 20260624172831_add_government_structure.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaExt = PrismaService & Record<string, any>;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private get db(): PrismaExt {
    return this.prisma as PrismaExt;
  }

  async findByUser(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    return this.db["employeeAssignment"].findMany({
      where: { userId },
      include: {
        position: {
          include: {
            ministry: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            division: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    });
  }

  async findById(id: string): Promise<unknown> {
    const assignment = await this.db["employeeAssignment"].findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
        },
        position: {
          include: {
            ministry: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException({
        error: "ASSIGNMENT_NOT_FOUND",
        message: "Employee assignment not found",
      });
    }

    return assignment;
  }

  async create(
    dto: CreateAssignmentDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const [user, position] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.db["position"].findUnique({ where: { id: dto.positionId } }),
    ]);

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    if (!position)
      throw new NotFoundException({ error: "POSITION_NOT_FOUND", message: "Position not found" });

    if (dto.endDate && dto.endDate <= dto.startDate) {
      throw new BadRequestException({
        error: "INVALID_DATE_RANGE",
        message: "End date must be after start date",
      });
    }

    // If isPrimary, demote any existing primary assignment for this user
    if (dto.isPrimary !== false) {
      await this.db["employeeAssignment"].updateMany({
        where: { userId: dto.userId, isPrimary: true, isActive: true },
        data: { isPrimary: false },
      });
    }

    const assignment = await this.db["employeeAssignment"].create({
      data: {
        userId: dto.userId,
        positionId: dto.positionId,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        isPrimary: dto.isPrimary ?? true,
        notes: dto.notes ?? null,
        assignedById: actor.id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, displayName: true } },
        position: { select: { id: true, title: true, code: true, level: true } },
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: "EMPLOYEE_ASSIGNED" as AuditAction,
      entityType: "EMPLOYEE_ASSIGNMENT",
      entityId: (assignment as { id: string }).id,
      metadata: {
        targetUserId: dto.userId,
        positionId: dto.positionId,
        positionTitle: (position as { title: string }).title,
        startDate: dto.startDate,
      },
      ipAddress,
    });

    return assignment;
  }

  async endAssignment(
    id: string,
    dto: EndAssignmentDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const existing = await this.db["employeeAssignment"].findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: "ASSIGNMENT_NOT_FOUND",
        message: "Employee assignment not found",
      });
    }

    if (!(existing as { isActive: boolean }).isActive) {
      throw new BadRequestException({
        error: "ASSIGNMENT_ALREADY_ENDED",
        message: "This assignment has already ended",
      });
    }

    if (dto.endDate <= (existing as { startDate: Date }).startDate) {
      throw new BadRequestException({
        error: "INVALID_DATE_RANGE",
        message: "End date must be after the assignment start date",
      });
    }

    const assignment = await this.db["employeeAssignment"].update({
      where: { id },
      data: {
        endDate: dto.endDate,
        isActive: false,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: "EMPLOYEE_ASSIGNMENT_ENDED" as AuditAction,
      entityType: "EMPLOYEE_ASSIGNMENT",
      entityId: id,
      metadata: { targetUserId: (existing as { userId: string }).userId, endDate: dto.endDate },
      ipAddress,
    });

    return assignment;
  }
}
