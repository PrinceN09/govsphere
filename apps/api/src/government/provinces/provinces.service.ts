import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { CreateProvinceDto } from "./dto/create-province.dto";
import type { UpdateProvinceDto } from "./dto/update-province.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

// province/office/position/employeeAssignment models require `prisma generate`
// after applying migration 20260624172831_add_government_structure.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaExt = PrismaService & Record<string, any>;

@Injectable()
export class ProvincesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private get db(): PrismaExt {
    // Cast to access models added in v0.3.0 migration.
    // Remove cast after running `npx prisma generate`.
    return this.prisma as PrismaExt;
  }

  findAll(): Promise<unknown[]> {
    return this.db["province"].findMany({
      orderBy: { name: "asc" },
    }) as Promise<unknown[]>;
  }

  async findById(id: string): Promise<unknown> {
    const province = await this.db["province"].findUnique({ where: { id } });

    if (!province) {
      throw new NotFoundException({ error: "PROVINCE_NOT_FOUND", message: "Province not found" });
    }

    return province;
  }

  async create(
    dto: CreateProvinceDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const existing = await this.db["province"].findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException({
        error: "PROVINCE_CODE_CONFLICT",
        message: `Province with code "${dto.code}" already exists`,
      });
    }

    const province = await this.db["province"].create({
      data: {
        name: dto.name,
        nameTranslations: dto.nameTranslations ?? {},
        code: dto.code.toUpperCase(),
        capital: dto.capital ?? null,
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: "PROVINCE_CREATED" as AuditAction,
      entityType: "PROVINCE",
      entityId: (province as { id: string }).id,
      metadata: { code: dto.code, name: dto.name },
      ipAddress,
    });

    return province;
  }

  async update(
    id: string,
    dto: UpdateProvinceDto,
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    await this.findById(id);

    const province = await this.db["province"].update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameTranslations !== undefined && { nameTranslations: dto.nameTranslations }),
        ...(dto.capital !== undefined && { capital: dto.capital }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.auditService.log({
      userId: actor.id,
      action: "PROVINCE_UPDATED" as AuditAction,
      entityType: "PROVINCE",
      entityId: id,
      metadata: { changes: dto },
      ipAddress,
    });

    return province;
  }
}
