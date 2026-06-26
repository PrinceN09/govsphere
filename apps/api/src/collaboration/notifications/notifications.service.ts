/**
 * Prinodia Workspace — NotificationsService (Collaboration)
 *
 * Surfaces collaboration notifications: mentions, replies, DMs, announcements.
 * Unread counters are computed at query time — no separate counter columns.
 *
 * Uses the existing `Notification` model (body / data / type fields).
 * Collaboration-specific unread mention counts come from the Mention model
 * (added in v0.7.0 schema — requires `prisma generate` before first use).
 * DM unread tracking uses ConversationMember.lastReadAt vs Conversation.lastMessageAt.
 */

import { Injectable, Logger } from "@nestjs/common";

import { NotificationFilter } from "./dto/notification.dto";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Prisma } from "@prisma/client";

const UNREAD_COUNT_TTL = 30; // seconds

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Notifications list ────────────────────────────────────────────────────

  async findMine(
    actor: AuthenticatedUser,
    filter: NotificationFilter = NotificationFilter.ALL,
    cursor?: string,
    limit = 25,
  ) {
    const take = Math.min(limit, 100);

    const where: Prisma.NotificationWhereInput = {
      userId: actor.id,
      ...(filter === NotificationFilter.UNREAD ? { isRead: false } : {}),
      ...(filter === NotificationFilter.MENTIONS ? { type: "MENTION" } : {}),
    };

    if (cursor) {
      where.createdAt = { lt: new Date(Buffer.from(cursor, "base64url").toString()) };
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = notifications.length > take;
    const data = hasMore ? notifications.slice(0, take) : notifications;
    const nextCursor =
      hasMore && data[data.length - 1]
        ? Buffer.from(data[data.length - 1]!.createdAt.toISOString()).toString("base64url")
        : null;

    return { data, nextCursor, hasMore };
  }

  // ── Mark read ─────────────────────────────────────────────────────────────

  async markRead(notificationId: string, actor: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId: actor.id },
      data: { isRead: true, readAt: new Date() },
    });
    await this.invalidateCountCache(actor.id);
    return { ok: true };
  }

  async markAllRead(actor: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: actor.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    await this.invalidateCountCache(actor.id);
    return { ok: true };
  }

  // ── Unread counts ─────────────────────────────────────────────────────────

  async getUnreadCounts(actor: AuthenticatedUser) {
    const cacheKey = `collab:unread:${actor.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as UnreadCounts;
      } catch {
        // cache miss — fall through
      }
    }

    const [notificationCount, mentionCount] = await Promise.all([
      this.prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
      this.prisma.mention.count({ where: { userId: actor.id, isRead: false } }),
    ]);

    const counts: UnreadCounts = {
      notifications: notificationCount,
      mentions: mentionCount,
      total: notificationCount + mentionCount,
    };

    await this.redis.set(cacheKey, JSON.stringify(counts), UNREAD_COUNT_TTL);
    return counts;
  }

  // ── Mentions ──────────────────────────────────────────────────────────────

  async getUnreadMentions(actor: AuthenticatedUser) {
    const mentions = await this.prisma.mention.findMany({
      where: { userId: actor.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        channelId: true,
        messageId: true,
        mentionedById: true,
        isRead: true,
        createdAt: true,
        message: { select: { id: true, content: true, createdAt: true } },
        channel: { select: { id: true, name: true } },
      },
    });

    return { data: mentions };
  }

  async markMentionRead(mentionId: string, actor: AuthenticatedUser) {
    await this.prisma.mention.updateMany({
      where: { id: mentionId, userId: actor.id },
      data: { isRead: true, readAt: new Date() },
    });
    await this.invalidateCountCache(actor.id);
    return { ok: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async invalidateCountCache(userId: string) {
    await this.redis.del(`collab:unread:${userId}`);
  }
}

export interface UnreadCounts {
  notifications: number;
  mentions: number;
  total: number;
}
