/**
 * Prinodia People — OrgNodeService v1.3.0
 *
 * Manages the generic org hierarchy (OrgNode).
 * Uses the (prisma as any) sandbox pattern until prisma generate can run.
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { CreateOrgNodeDto, UpdateOrgNodeDto, QueryOrgNodesDto } from "./dto/people.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class OrgNodeService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateOrgNodeDto) {
    // Compute materializedPath
    let materializedPath = "/";
    if (dto.parentId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parent = await this.db.orgNode.findUnique({
        where: { id: dto.parentId },
        select: { id: true, materializedPath: true },
      });
      if (!parent) throw new NotFoundException(`Parent OrgNode ${dto.parentId} not found`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      materializedPath = `${parent.materializedPath as string}${dto.parentId}/`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
        materializedPath,
        description: dto.description ?? null,
        code: dto.code ?? null,
        color: dto.color ?? null,
        icon: dto.icon ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  findAll(query: QueryOrgNodesDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (query.organizationId) where["organizationId"] = query.organizationId;
    if (query.type) where["type"] = query.type;
    if (query.parentId !== undefined) where["parentId"] = query.parentId ?? null;
    if (query.isActive !== undefined) where["isActive"] = query.isActive;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { children: true, employees: true } },
      },
    });
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const node = await this.db.orgNode.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, type: true } },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, type: true, code: true, color: true, sortOrder: true },
        },
        _count: { select: { employees: true } },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!node) throw new NotFoundException(`OrgNode ${id} not found`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return node;
  }

  /** Return full subtree rooted at orgId — lazy-loadable by parentId. */
  getTree(organizationId: string, parentId?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.findMany({
      where: {
        organizationId,
        parentId: parentId ?? null,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { children: true, employees: true } },
      },
    });
  }

  /** Return all ancestors (breadcrumb chain) from leaf → root. */
  async getAncestors(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const node = await this.db.orgNode.findUnique({
      where: { id },
      select: { materializedPath: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!node) throw new NotFoundException(`OrgNode ${id} not found`);

    // materializedPath: "/root/parent/grandparent/" → extract ancestor IDs
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const ancestorIds: string[] = (node.materializedPath as string).split("/").filter(Boolean);

    if (ancestorIds.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.findMany({
      where: { id: { in: ancestorIds } },
      select: { id: true, name: true, type: true },
      orderBy: { materializedPath: "asc" },
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateOrgNodeDto) {
    await this.findOne(id);

    // If parent changes, recompute path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = { ...dto };
    if (dto.parentId !== undefined) {
      let newPath = "/";
      if (dto.parentId) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parent = await this.db.orgNode.findUnique({
          where: { id: dto.parentId },
          select: { id: true, materializedPath: true },
        });
        if (!parent) throw new NotFoundException(`Parent OrgNode ${dto.parentId} not found`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        newPath = `${parent.materializedPath as string}${dto.parentId}/`;
      }
      data["materializedPath"] = newPath;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.orgNode.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
