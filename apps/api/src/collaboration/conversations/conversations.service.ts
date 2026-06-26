/**
 * Prinodia Workspace — ConversationsService
 *
 * Manages direct messages (1:1) and group conversations.
 * Separate from org Channels — these are personal, not scoped to a ministry.
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
  CreateConversationDto,
  DirectMessageCursorDto,
  SendDirectMessageDto,
} from "./dto/conversation.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

const DM_SELECT = {
  id: true,
  content: true,
  type: true,
  replyToId: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  reactions: { select: { emoji: true, userId: true } },
} as const;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Create / get-or-create ────────────────────────────────────────────────

  async createOrGetDirect(targetUserId: string, actor: AuthenticatedUser) {
    if (targetUserId === actor.id) {
      throw new BadRequestException("Cannot start a conversation with yourself");
    }

    // Check target user exists
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true },
    });
    if (!target) throw new NotFoundException("User not found");

    // Find existing DIRECT conversation between exactly these two users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        members: {
          every: { userId: { in: [actor.id, targetUserId] }, leftAt: null },
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            lastReadAt: true,
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (existing) return existing;

    const conv = await this.prisma.$transaction(async (tx) => {
      const c = await tx.conversation.create({
        data: {
          type: "DIRECT",
          createdById: actor.id,
          members: {
            create: [{ userId: actor.id }, { userId: targetUserId }],
          },
        },
        include: {
          members: {
            select: {
              userId: true,
              lastReadAt: true,
              user: { select: { id: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      });
      return c;
    });

    void this.audit.log({
      userId: actor.id,
      action: "CONVERSATION_CREATED",
      entityType: "CONVERSATION",
      entityId: conv.id,
      metadata: { type: "DIRECT", targetUserId },
    });

    return conv;
  }

  async createGroup(dto: CreateConversationDto, actor: AuthenticatedUser) {
    if (!dto.name) throw new BadRequestException("Group conversations require a name");
    if (!dto.memberIds || dto.memberIds.length < 2) {
      throw new BadRequestException("Group conversations require at least 2 other members");
    }

    const allMemberIds = [...new Set([actor.id, ...dto.memberIds])];

    const conv = await this.prisma.conversation.create({
      data: {
        type: "GROUP",
        name: dto.name,
        createdById: actor.id,
        members: {
          create: allMemberIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    void this.audit.log({
      userId: actor.id,
      action: "CONVERSATION_CREATED",
      entityType: "CONVERSATION",
      entityId: conv.id,
      metadata: { type: "GROUP", name: dto.name, memberCount: allMemberIds.length },
    });

    return conv;
  }

  // ── List my conversations ─────────────────────────────────────────────────

  async findMine(actor: AuthenticatedUser) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId: actor.id, leftAt: null },
      orderBy: { conversation: { lastMessageAt: "desc" } },
      select: {
        lastReadAt: true,
        conversation: {
          select: {
            id: true,
            type: true,
            name: true,
            avatarUrl: true,
            lastMessageAt: true,
            isArchived: true,
            members: {
              where: { leftAt: null },
              select: {
                userId: true,
                user: { select: { id: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    return memberships.filter((m) => !m.conversation.isArchived);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async sendMessage(conversationId: string, dto: SendDirectMessageDto, actor: AuthenticatedUser) {
    await this.assertMember(conversationId, actor);

    const msg = await this.prisma.$transaction(async (tx) => {
      const m = await tx.directMessage.create({
        data: {
          conversationId,
          senderId: actor.id,
          content: dto.content,
          ...(dto.replyToId ? { replyToId: dto.replyToId } : {}),
        },
        select: DM_SELECT,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return m;
    });

    return msg;
  }

  async getMessages(
    conversationId: string,
    query: DirectMessageCursorDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertMember(conversationId, actor);

    const limit = Math.min(Number(query.limit ?? 50), 100);
    const before = query.before
      ? new Date(Buffer.from(query.before, "base64url").toString())
      : undefined;

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      select: DM_SELECT,
    });

    const hasMore = messages.length > limit;
    const data = (hasMore ? messages.slice(0, limit) : messages).reverse();
    const nextBefore =
      hasMore && data[0]
        ? Buffer.from(data[0].createdAt.toISOString()).toString("base64url")
        : null;

    return { data, nextBefore, hasMore };
  }

  async markRead(conversationId: string, actor: AuthenticatedUser) {
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId: actor.id },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertMember(conversationId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actor.id } },
      select: { leftAt: true },
    });
    if (!member || member.leftAt !== null) {
      throw new ForbiddenException("Not a member of this conversation");
    }
  }
}
