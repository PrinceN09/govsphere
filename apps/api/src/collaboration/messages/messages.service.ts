/**
 * Prinodia Workspace — MessagesService
 *
 * Handles channel messages: send, edit, delete (soft), react, pin, search.
 * Cursor pagination uses (channelId, createdAt DESC, id) for stability.
 *
 * Presence / typing indicators are Redis-only (see PresenceService).
 * WebSocket events are fired via EventsGateway (wired in a future sprint).
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
  AddReactionDto,
  EditMessageDto,
  MessageCursorQueryDto,
  MessageSearchDto,
  SendMessageDto,
} from "./dto/message.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Prisma } from "@prisma/client";

const MSG_SELECT = {
  id: true,
  content: true,
  type: true,
  replyToId: true,
  isPinned: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  reactions: {
    select: { emoji: true, userId: true, createdAt: true },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      sender: { select: { id: true, displayName: true } },
    },
  },
  _count: { select: { replies: true } },
} satisfies Prisma.MessageSelect;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Send ─────────────────────────────────────────────────────────────────

  async send(channelId: string, dto: SendMessageDto, actor: AuthenticatedUser) {
    await this.assertMember(channelId, actor);

    if (dto.replyToId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
        select: { channelId: true, deletedAt: true },
      });
      if (!parent || parent.channelId !== channelId) {
        throw new BadRequestException("Reply target not found in this channel");
      }
      if (parent.deletedAt) throw new BadRequestException("Cannot reply to a deleted message");
    }

    // Parse @mentions from content
    const mentionedHandles = this.parseMentions(dto.content);

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          channelId,
          senderId: actor.id,
          content: dto.content,
          type: (dto.type as never) ?? "TEXT",
          ...(dto.replyToId ? { replyToId: dto.replyToId } : {}),
        },
        select: MSG_SELECT,
      });

      // Update channel lastMessageAt
      await tx.channel.update({
        where: { id: channelId },
        data: { lastMessageAt: new Date() },
      });

      // Create mention records if any
      if (mentionedHandles.length > 0) {
        const mentionedUsers = await tx.user.findMany({
          where: { email: { in: mentionedHandles } },
          select: { id: true },
        });
        if (mentionedUsers.length > 0) {
          await tx.mention.createMany({
            data: mentionedUsers.map((u) => ({
              id: `${msg.id}-${u.id}`,
              messageId: msg.id,
              channelId,
              userId: u.id,
              mentionedById: actor.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return msg;
    });

    void this.audit.log({
      userId: actor.id,
      action: "MESSAGE_SENT",
      entityType: "MESSAGE",
      entityId: message.id,
      metadata: { channelId },
    });

    return message;
  }

  // ── List (cursor pagination) ──────────────────────────────────────────────

  async list(channelId: string, query: MessageCursorQueryDto, actor: AuthenticatedUser) {
    await this.assertMember(channelId, actor);

    const limit = Math.min(Number(query.limit ?? 50), 100);

    const where: Prisma.MessageWhereInput = {
      channelId,
      deletedAt: null,
    };

    // before: fetch messages older than a given createdAt
    if (query.before) {
      const cursor = this.decodeCursor(query.before);
      where.createdAt = { lt: cursor.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      select: MSG_SELECT,
    });

    const hasMore = messages.length > limit;
    const data = (hasMore ? messages.slice(0, limit) : messages).reverse();
    const nextBefore = hasMore ? this.encodeCursor(data[0]!) : null;

    return { data, nextBefore, hasMore };
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  async edit(messageId: string, dto: EditMessageDto, actor: AuthenticatedUser) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, content: true, deletedAt: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.deletedAt) throw new BadRequestException("Cannot edit a deleted message");
    if (message.senderId !== actor.id) {
      throw new ForbiddenException("You can only edit your own messages");
    }

    // Save current content to history before overwriting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const [updated] = await Promise.all([
      this.prisma.message.update({
        where: { id: messageId },
        data: { content: dto.content, editedAt: new Date() },
        select: MSG_SELECT,
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      db.messageHistory.create({
        data: { messageId, content: message.content, editedById: actor.id },
      }),
    ]);

    void this.audit.log({
      userId: actor.id,
      action: "MESSAGE_EDITED",
      entityType: "MESSAGE",
      entityId: messageId,
      metadata: { channelId: message.channelId },
    });

    return updated;
  }

  // ── History ───────────────────────────────────────────────────────────────

  async getHistory(messageId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return (this.prisma as any).messageHistory.findMany({
      where: { messageId },
      orderBy: { editedAt: "desc" },
      select: { id: true, content: true, editedById: true, editedAt: true },
    });
  }

  // ── Delete (soft) ─────────────────────────────────────────────────────────

  async delete(messageId: string, actor: AuthenticatedUser) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.deletedAt) return { deleted: true }; // idempotent

    const isAuthor = message.senderId === actor.id;
    const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN";

    if (!isAuthor && !isAdmin) {
      // Check if channel admin
      const member = await this.prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId: message.channelId, userId: actor.id } },
        select: { isAdmin: true },
      });
      if (!member?.isAdmin) throw new ForbiddenException("Cannot delete this message");
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: "[Message deleted]" },
    });

    void this.audit.log({
      userId: actor.id,
      action: "MESSAGE_DELETED",
      entityType: "MESSAGE",
      entityId: messageId,
      metadata: { channelId: message.channelId },
    });

    return { deleted: true };
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  async addReaction(messageId: string, dto: AddReactionDto, actor: AuthenticatedUser) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { channelId: true, deletedAt: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.deletedAt) throw new BadRequestException("Cannot react to a deleted message");

    await this.assertMember(message.channelId, actor);

    await this.prisma.reaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId: actor.id, emoji: dto.emoji } },
      create: { messageId, userId: actor.id, emoji: dto.emoji },
      update: {},
    });

    return { reacted: true };
  }

  async removeReaction(messageId: string, emoji: string, actor: AuthenticatedUser) {
    await this.prisma.reaction.deleteMany({
      where: { messageId, userId: actor.id, emoji },
    });
    return { removed: true };
  }

  // ── Pin ───────────────────────────────────────────────────────────────────

  async pin(messageId: string, actor: AuthenticatedUser) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, deletedAt: true, isPinned: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.deletedAt) throw new BadRequestException("Cannot pin a deleted message");

    await this.assertChannelAdmin(message.channelId, actor);

    await this.prisma.$transaction([
      this.prisma.message.update({ where: { id: messageId }, data: { isPinned: true } }),
      this.prisma.pinnedMessage.upsert({
        where: { messageId },
        create: { messageId, channelId: message.channelId, pinnedById: actor.id },
        update: { pinnedById: actor.id, pinnedAt: new Date() },
      }),
    ]);

    return { pinned: true };
  }

  async unpin(messageId: string, actor: AuthenticatedUser) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });
    if (!message) throw new NotFoundException("Message not found");

    await this.assertChannelAdmin(message.channelId, actor);

    await this.prisma.$transaction([
      this.prisma.message.update({ where: { id: messageId }, data: { isPinned: false } }),
      this.prisma.pinnedMessage.deleteMany({ where: { messageId } }),
    ]);

    return { unpinned: true };
  }

  async getPinned(channelId: string, actor: AuthenticatedUser) {
    await this.assertMember(channelId, actor);

    return this.prisma.pinnedMessage.findMany({
      where: { channelId },
      orderBy: { pinnedAt: "desc" },
      include: {
        message: { select: MSG_SELECT },
      },
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async search(query: MessageSearchDto, actor: AuthenticatedUser) {
    const limit = Math.min(Number(query.limit ?? 20), 50);

    const where: Prisma.MessageWhereInput = {
      deletedAt: null,
      content: { contains: query.q, mode: "insensitive" },
      ...(query.channelId ? { channelId: query.channelId } : {}),
    };

    // Scope to channels the user is a member of
    if (!query.channelId) {
      const memberChannels = await this.prisma.channelMember.findMany({
        where: { userId: actor.id, leftAt: null },
        select: { channelId: true },
      });
      where.channelId = { in: memberChannels.map((m) => m.channelId) };
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        ...MSG_SELECT,
        channel: { select: { id: true, name: true } },
      },
    });

    return { data: messages, count: messages.length };
  }

  // ── Thread ────────────────────────────────────────────────────────────────

  async getThread(messageId: string, actor: AuthenticatedUser) {
    const parent = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });
    if (!parent) throw new NotFoundException("Message not found");
    await this.assertMember(parent.channelId, actor);

    const replies = await this.prisma.message.findMany({
      where: { replyToId: messageId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: MSG_SELECT,
    });

    return { data: replies };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertMember(channelId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN") return;

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { type: true, isArchived: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");
    if (channel.isArchived) throw new BadRequestException("Channel is archived");

    if (channel.type === "PRIVATE") {
      const member = await this.prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: actor.id } },
        select: { leftAt: true },
      });
      if (!member || member.leftAt !== null) {
        throw new ForbiddenException("Not a member of this channel");
      }
    }
  }

  private async assertChannelAdmin(channelId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: actor.id } },
      select: { isAdmin: true, leftAt: true },
    });
    if (!member || member.leftAt !== null || !member.isAdmin) {
      throw new ForbiddenException("Channel admin access required");
    }
  }

  private parseMentions(content: string): string[] {
    const matches = content.match(/@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    return matches ? [...new Set(matches.map((m) => m.slice(1)))] : [];
  }

  private encodeCursor(msg: { createdAt: Date; id: string }): string {
    return Buffer.from(`${msg.createdAt.toISOString()}:${msg.id}`).toString("base64url");
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const [iso, id] = Buffer.from(cursor, "base64url").toString().split(":");
      return { createdAt: new Date(iso ?? ""), id: id ?? "" };
    } catch {
      throw new BadRequestException("Invalid cursor");
    }
  }
}
