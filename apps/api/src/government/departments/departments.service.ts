import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreateDepartmentDto } from "./dto/create-department.dto";
import type { QueryDepartmentsDto } from "./dto/query-department.dto";
import type { UpdateDepartmentDto } from "./dto/update-department.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

export interface DepartmentsPage {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryDepartmentsDto): Promise<DepartmentsPage> {
    const { ministryId, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(ministryId && { ministryId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        include: {
          ministry: { select: { id: true, name: true, code: true } },
          _count: { select: { divisions: true, users: true } },
        },
        orderBy: [{ ministry: { name: "asc" } }, { name: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.department.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<unknown> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        ministry: { select: { id: true, name: true, code: true } },
        divisions: {
          where: { isActive: true },
          include: { _count: { select: { users: true } } },
          orderBy: { name: "asc" },
        },
        _count: { select: { divisions: true, users: true } },
      },
    });

    if (!department) {
      throw new NotFoundException({
        error: "DEPARTMENT_NOT_FOUND",
        message: "Department not found",
      });
    }

    return department;
  }

  async create(
    dto: CreateDepartmentDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    // Ensure the parent ministry exists
    const ministry = await this.prisma.ministry.findUnique({ where: { id: dto.ministryId } });
    if (!ministry) {
      throw new NotFoundException({ error: "MINISTRY_NOT_FOUND", message: "Ministry not found" });
    }

    // Enforce unique code within ministry
    const existing = await this.prisma.department.findUnique({
      where: { ministryId_code: { ministryId: dto.ministryId, code: dto.code.toUpperCase() } },
    });
    if (existing) {
      throw new ConflictException({
        error: "DEPARTMENT_CODE_CONFLICT",
        message: `Department code "${dto.code}" already exists in this ministry`,
      });
    }

    const department = await this.prisma.department.create({
      data: {
        ministryId: dto.ministryId,
        name: dto.name,
        nameTranslations: dto.nameTranslations ?? {},
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
      },
      include: { ministry: { select: { id: true, name: true, code: true } } },
    });

    this.auditService.log({
      userId: actor.id,
      action: "DEPARTMENT_CREATED" as AuditAction,
      entityType: "DEPARTMENT",
      entityId: department.id,
      metadata: { code: department.code, name: department.name, ministryId: dto.ministryId },
      ipAddress,
    });

    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    await this.findById(id); // 404 guard

    const department = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameTranslations !== undefined && { nameTranslations: dto.nameTranslations }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { ministry: { select: { id: true, name: true, code: true } } },
    });

    this.auditService.log({
      userId: actor.id,
      action: (dto.isActive === false
        ? "DEPARTMENT_DEACTIVATED"
        : "DEPARTMENT_UPDATED") as AuditAction,
      entityType: "DEPARTMENT",
      entityId: department.id,
      metadata: { changes: dto },
      ipAddress,
    });

    return department;
  }

  async deactivate(id: string, actor: AuthenticatedUser, ipAddress: string): Promise<void> {
    await this.findById(id); // 404 guard

    await this.prisma.department.update({ where: { id }, data: { isActive: false } });

    this.auditService.log({
      userId: actor.id,
      action: "DEPARTMENT_DEACTIVATED" as AuditAction,
      entityType: "DEPARTMENT",
      entityId: id,
      metadata: {},
      ipAddress,
    });
  }
}
