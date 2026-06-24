import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreateMinistryDto } from "./dto/create-ministry.dto";
import type { QueryMinistriesDto } from "./dto/query-ministry.dto";
import type { UpdateMinistryDto } from "./dto/update-ministry.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

export interface MinistriesPage {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class MinistriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryMinistriesDto): Promise<MinistriesPage> {
    const { search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ministry.findMany({
        where,
        include: {
          _count: { select: { departments: true, users: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.ministry.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<unknown> {
    const ministry = await this.prisma.ministry.findUnique({
      where: { id },
      include: {
        departments: {
          where: { isActive: true },
          include: { _count: { select: { divisions: true, users: true } } },
          orderBy: { name: "asc" },
        },
        _count: { select: { users: true, departments: true } },
      },
    });

    if (!ministry) {
      throw new NotFoundException({ error: "MINISTRY_NOT_FOUND", message: "Ministry not found" });
    }

    return ministry;
  }

  async findByCode(code: string): Promise<unknown> {
    const ministry = await this.prisma.ministry.findUnique({ where: { code } });
    if (!ministry) {
      throw new NotFoundException({ error: "MINISTRY_NOT_FOUND", message: "Ministry not found" });
    }
    return ministry;
  }

  async create(
    dto: CreateMinistryDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const existing = await this.prisma.ministry.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException({
        error: "MINISTRY_CODE_CONFLICT",
        message: `Ministry with code "${dto.code}" already exists`,
      });
    }

    const ministry = await this.prisma.ministry.create({
      data: {
        name: dto.name,
        nameTranslations: dto.nameTranslations ?? {},
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.auditService.log({
      userId: actor.id,
      action: "MINISTRY_CREATED" as AuditAction,
      entityType: "MINISTRY",
      entityId: ministry.id,
      metadata: { code: ministry.code, name: ministry.name },
      ipAddress,
    });

    return ministry;
  }

  async update(
    id: string,
    dto: UpdateMinistryDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    await this.findById(id); // 404 guard

    const ministry = await this.prisma.ministry.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameTranslations !== undefined && { nameTranslations: dto.nameTranslations }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: (dto.isActive === false ? "MINISTRY_DEACTIVATED" : "MINISTRY_UPDATED") as AuditAction,
      entityType: "MINISTRY",
      entityId: ministry.id,
      metadata: { changes: dto },
      ipAddress,
    });

    return ministry;
  }

  async deactivate(id: string, actor: AuthenticatedUser, ipAddress: string): Promise<void> {
    await this.findById(id); // 404 guard

    await this.prisma.ministry.update({
      where: { id },
      data: { isActive: false },
    });

    this.auditService.log({
      userId: actor.id,
      action: "MINISTRY_DEACTIVATED" as AuditAction,
      entityType: "MINISTRY",
      entityId: id,
      metadata: {},
      ipAddress,
    });
  }
}
