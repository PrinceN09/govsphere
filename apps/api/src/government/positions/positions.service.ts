import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreatePositionDto } from "./dto/create-position.dto";
import type { QueryPositionsDto } from "./dto/query-position.dto";
import type { UpdatePositionDto } from "./dto/update-position.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

const LIST_INCLUDE = {
  ministry: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  division: { select: { id: true, name: true, code: true } },
} as const;

type PositionListItem = Prisma.PositionGetPayload<{ include: typeof LIST_INCLUDE }>;

export interface PositionsPage {
  data: PositionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryPositionsDto): Promise<PositionsPage> {
    const {
      ministryId,
      departmentId,
      divisionId,
      level,
      search,
      isActive,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PositionWhereInput = {
      ...(ministryId !== undefined && { ministryId }),
      ...(departmentId !== undefined && { departmentId }),
      ...(divisionId !== undefined && { divisionId }),
      ...(level !== undefined && { level }),
      ...(isActive !== undefined && { isActive }),
      ...(search !== undefined && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.position.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ level: "asc" }, { title: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.position.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        ministry: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        division: { select: { id: true, name: true, code: true } },
        office: { select: { id: true, name: true, code: true } },
        assignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!position) {
      throw new NotFoundException({ error: "POSITION_NOT_FOUND", message: "Position not found" });
    }

    return position;
  }

  async create(dto: CreatePositionDto, actor: AuthenticatedUser, ipAddress: string) {
    if (dto.ministryId !== undefined) {
      const existing = await this.prisma.position.findUnique({
        where: { ministryId_code: { ministryId: dto.ministryId, code: dto.code.toUpperCase() } },
      });
      if (existing) {
        throw new ConflictException({
          error: "POSITION_CODE_CONFLICT",
          message: `Position code "${dto.code}" already exists in this ministry`,
        });
      }
    }

    const position = await this.prisma.position.create({
      data: {
        title: dto.title,
        titleTranslations: dto.titleTranslations ?? {},
        code: dto.code.toUpperCase(),
        level: dto.level,
        headcount: dto.headcount ?? 1,
        ministryId: dto.ministryId ?? null,
        departmentId: dto.departmentId ?? null,
        divisionId: dto.divisionId ?? null,
        officeId: dto.officeId ?? null,
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: AuditAction.POSITION_CREATED,
      entityType: "POSITION",
      entityId: position.id,
      metadata: { code: dto.code, title: dto.title, level: dto.level },
      ipAddress,
    });

    return position;
  }

  async update(id: string, dto: UpdatePositionDto, actor: AuthenticatedUser, ipAddress: string) {
    await this.findById(id);

    const position = await this.prisma.position.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.titleTranslations !== undefined && { titleTranslations: dto.titleTranslations }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.headcount !== undefined && { headcount: dto.headcount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.auditService.log({
      userId: actor.id,
      action:
        dto.isActive === false ? AuditAction.POSITION_DEACTIVATED : AuditAction.POSITION_UPDATED,
      entityType: "POSITION",
      entityId: id,
      metadata: { changes: dto },
      ipAddress,
    });

    return position;
  }
}
