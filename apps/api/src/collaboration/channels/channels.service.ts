/**
 * Prinodia Workspace — ChannelsService
 *
 * Manages government-scoped channels (PUBLIC, PRIVATE, ANNOUNCEMENT).
 * RBAC is enforced at the controller level — this service trusts the caller.
 *
 * Design notes:
 *   - Channels are scoped to an org unit (ministry / department / division / province).
 *   - memberCount is a denormalised counter kept consistent via Prisma transactions.
 *   - Messages cursor pagination uses (channelId, createdAt DESC, id) for stability.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../../identity/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

import type {
  AddMemberDto,
  ChannelQueryDto,
  CreateChannelDto,
  UpdateChannelDto,
} from "./dto/channel.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { ChannelType, Prisma } from "@prisma/client";

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateChannelDto, actor: AuthenticatedUser) {
    const slug = this.toSlug(dto.name);

    // Validate org scope
    if (dto.ministryId) {
      const exists = await this.prisma.ministry.findUnique({
        where: { id: dto.ministryId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("Ministry not found");
    }
    if (dto.departmentId) {
      const exists = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("Department not found");
    }

    const channel = await this.prisma.$transaction(async (tx) => {
      const ch = await tx.channel.create({
        data: {
          name: dto.name,
          slug,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          type: (dto.type as ChannelType) ?? "PUBLIC",
          ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
          ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
          ...(dto.divisionId !== undefined ? { divisionId: dto.divisionId } : {}),
          ...(dto.provinceId !== undefined ? { provinceId: dto.provinceId } : {}),
          createdById: actor.id,
          memberCount: 1,
        },
      });

      // Auto-join creator as admin
      await tx.channelMember.create({
        data: { channelId: ch.id, userId: actor.id, isAdmin: true },
      });

      return ch;
    });

    void this.audit.log({
      userId: actor.id,
      action: "CHANNEL_CREATED",
      entityType: "CHANNEL",
      entityId: channel.id,
      metadata: { name: channel.name, type: channel.type },
    });

    return channel;
  }

  // ── Find many ────────────────────────────────────────────────────────────

  async findMany(query: ChannelQueryDto, _actor: AuthenticatedUser) {
    const limit = Math.min(Number(query.limit ?? 25), 100);

    const where: Prisma.ChannelWhereInput = {
      isArchived: false,
      ...(query.type ? { type: query.type } : {}),
      ...(query.ministryId ? { ministryId: query.ministryId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.divisionId ? { divisionId: query.divisionId } : {}),
      ...(query.provinceId ? { provinceId: query.provinceId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Keyset pagination on (id)
    if (query.cursor) {
      (where as Record<string, unknown>)["id"] = { gt: query.cursor };
    }

    const channels = await this.prisma.channel.findMany({
      where,
      take: limit + 1,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        memberCount: true,
        lastMessageAt: true,
        createdAt: true,
        ministryId: true,
        departmentId: true,
        divisionId: true,
        provinceId: true,
        ministry: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const hasMore = channels.length > limit;
    const data = hasMore ? channels.slice(0, limit) : channels;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor, hasMore };
  }

  // ── Find my channels ─────────────────────────────────────────────────────

  async findMine(actor: AuthenticatedUser) {
    const memberships = await this.prisma.channelMember.findMany({
      where: { userId: actor.id, leftAt: null },
      select: {
        isAdmin: true,
        lastReadAt: true,
        muteNotifications: true,
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            memberCount: true,
            lastMessageAt: true,
            isArchived: true,
          },
        },
      },
      orderBy: { channel: { lastMessageAt: "desc" } },
    });

    return memberships.filter((m) => !m.channel.isArchived);
  }

  // ── Find one ─────────────────────────────────────────────────────────────

  async findOne(channelId: string, actor: AuthenticatedUser) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        ministry: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        division: { select: { id: true, name: true, code: true } },
        province: { select: { id: true, name: true, code: true } },
        members: {
          where: { leftAt: null },
          select: {
            userId: true,
            isAdmin: true,
            lastReadAt: true,
            user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
          },
        },
        _count: { select: { messages: { where: { deletedAt: null } } } },
      },
    });

    if (!channel) throw new NotFoundException("Channel not found");

    // Private channels: only members can view
    if (channel.type === "PRIVATE") {
      const isMember = channel.members.some((m) => m.userId === actor.id);
      if (!isMember && actor.role !== "SUPER_ADMIN" && actor.role !== "GOVERNMENT_ADMIN") {
        throw new ForbiddenException("Not a member of this private channel");
      }
    }

    return channel;
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async update(channelId: string, dto: UpdateChannelDto, actor: AuthenticatedUser) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, createdById: true, isArchived: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");
    if (channel.isArchived) throw new BadRequestException("Cannot update an archived channel");

    await this.assertIsChannelAdmin(channelId, actor);

    const updated = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(dto.name ? { name: dto.name, slug: this.toSlug(dto.name) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    void this.audit.log({
      userId: actor.id,
      action: "CHANNEL_UPDATED",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: { ...dto },
    });

    return updated;
  }

  // ── Archive ──────────────────────────────────────────────────────────────

  async archive(channelId: string, actor: AuthenticatedUser) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, isArchived: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");
    if (channel.isArchived) return { archived: true };

    await this.assertIsChannelAdmin(channelId, actor);

    await this.prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true, archivedAt: new Date(), archivedById: actor.id },
    });

    void this.audit.log({
      userId: actor.id,
      action: "CHANNEL_ARCHIVED",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: {},
    });

    return { archived: true };
  }

  // ── Members ──────────────────────────────────────────────────────────────

  async addMember(channelId: string, dto: AddMemberDto, actor: AuthenticatedUser) {
    await this.assertIsChannelAdmin(channelId, actor);

    const existing = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: dto.userId } },
    });

    if (existing && existing.leftAt === null) {
      throw new BadRequestException("User is already a member");
    }

    await this.prisma.$transaction([
      existing
        ? this.prisma.channelMember.update({
            where: { channelId_userId: { channelId, userId: dto.userId } },
            data: { leftAt: null, isAdmin: dto.isAdmin ?? false },
          })
        : this.prisma.channelMember.create({
            data: { channelId, userId: dto.userId, isAdmin: dto.isAdmin ?? false },
          }),
      this.prisma.channel.update({
        where: { id: channelId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    void this.audit.log({
      userId: actor.id,
      action: "CHANNEL_MEMBER_ADDED",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: { addedUserId: dto.userId },
    });

    return { added: true };
  }

  async removeMember(channelId: string, targetUserId: string, actor: AuthenticatedUser) {
    await this.assertIsChannelAdmin(channelId, actor);

    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: targetUserId } },
    });
    if (!member || member.leftAt !== null) {
      throw new NotFoundException("Member not found");
    }

    await this.prisma.$transaction([
      this.prisma.channelMember.update({
        where: { channelId_userId: { channelId, userId: targetUserId } },
        data: { leftAt: new Date() },
      }),
      this.prisma.channel.update({
        where: { id: channelId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    void this.audit.log({
      userId: actor.id,
      action: "CHANNEL_MEMBER_REMOVED",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: { removedUserId: targetUserId },
    });

    return { removed: true };
  }

  async joinChannel(channelId: string, actor: AuthenticatedUser) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, type: true, isArchived: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");
    if (channel.isArchived) throw new BadRequestException("Channel is archived");
    if (channel.type === "PRIVATE")
      throw new ForbiddenException("Private channels require an invitation");

    const existing = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: actor.id } },
    });
    if (existing && existing.leftAt === null) return { joined: true };

    await this.prisma.$transaction([
      existing
        ? this.prisma.channelMember.update({
            where: { channelId_userId: { channelId, userId: actor.id } },
            data: { leftAt: null },
          })
        : this.prisma.channelMember.create({
            data: { channelId, userId: actor.id },
          }),
      this.prisma.channel.update({
        where: { id: channelId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return { joined: true };
  }

  async leaveChannel(channelId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: actor.id } },
    });
    if (!member || member.leftAt !== null) throw new NotFoundException("Not a member");

    await this.prisma.$transaction([
      this.prisma.channelMember.update({
        where: { channelId_userId: { channelId, userId: actor.id } },
        data: { leftAt: new Date() },
      }),
      this.prisma.channel.update({
        where: { id: channelId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { left: true };
  }

  async markRead(channelId: string, actor: AuthenticatedUser) {
    await this.prisma.channelMember.updateMany({
      where: { channelId, userId: actor.id },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async assertIsChannelAdmin(channelId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;

    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: actor.id } },
      select: { isAdmin: true, leftAt: true },
    });

    if (!member || member.leftAt !== null || !member.isAdmin) {
      throw new ForbiddenException("Channel admin access required");
    }
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
  }
}
