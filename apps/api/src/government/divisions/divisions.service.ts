import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreateDivisionDto } from "./dto/create-division.dto";
import type { QueryDivisionsDto } from "./dto/query-division.dto";
import type { UpdateDivisionDto } from "./dto/update-division.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

export interface DivisionsPage {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DivisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryDivisionsDto): Promise<DivisionsPage> {
    const { departmentId, ministryId, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(departmentId && { departmentId }),
      ...(ministryId && { department: { ministryId } }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.division.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              ministry: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { users: true } },
        },
        orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.division.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<unknown> {
    const division = await this.prisma.division.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            ministry: { select: { id: true, name: true, code: true } },
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!division) {
      throw new NotFoundException({
        error: "DIVISION_NOT_FOUND",
        message: "Division not found",
      });
    }

    return division;
  }

  async create(
    dto: CreateDivisionDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!department) {
      throw new NotFoundException({
        error: "DEPARTMENT_NOT_FOUND",
        message: "Department not found",
      });
    }

    const existing = await this.prisma.division.findUnique({
      where: {
        departmentId_code: { departmentId: dto.departmentId, code: dto.code.toUpperCase() },
      },
    });
    if (existing) {
      throw new ConflictException({
        error: "DIVISION_CODE_CONFLICT",
        message: `Division code "${dto.code}" already exists in this department`,
      });
    }

    const division = await this.prisma.division.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        // description field added in v0.3.0 migration — available after `prisma generate`
        ...({ description: dto.description ?? null } as object),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: "DIVISION_CREATED" as AuditAction,
      entityType: "DIVISION",
      entityId: division.id,
      metadata: { code: division.code, name: division.name, departmentId: dto.departmentId },
      ipAddress,
    });

    return division;
  }

  async update(
    id: string,
    dto: UpdateDivisionDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    await this.findById(id);

    const division = await this.prisma.division.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameTranslations !== undefined && { nameTranslations: dto.nameTranslations }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: (dto.isActive === false ? "DIVISION_DEACTIVATED" : "DIVISION_UPDATED") as AuditAction,
      entityType: "DIVISION",
      entityId: division.id,
      metadata: { changes: dto },
      ipAddress,
    });

    return division;
  }

  async deactivate(id: string, actor: AuthenticatedUser, ipAddress: string): Promise<void> {
    await this.findById(id);

    await this.prisma.division.update({ where: { id }, data: { isActive: false } });

    this.auditService.log({
      userId: actor.id,
      action: "DIVISION_DEACTIVATED" as AuditAction,
      entityType: "DIVISION",
      entityId: id,
      metadata: {},
      ipAddress,
    });
  }
}
