/**
 * Prinodia Chat v1.4.0 — DraftsService
 *
 * One draft per (user × channel) and one per (user × conversation).
 * Upsert on PUT, retrieve on GET, delete on DELETE or on message send.
 */

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import type { UpsertDraftDto } from "./dto/draft.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const DRAFT_SELECT = {
  id: true,
  content: true,
  replyToId: true,
  channelId: true,
  conversationId: true,
  updatedAt: true,
} as const;

@Injectable()
export class DraftsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ── Channel draft ─────────────────────────────────────────────────────────

  async getChannelDraft(channelId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.draft.findUnique({
      where: { userId_channelId: { userId: actor.id, channelId } },
      select: DRAFT_SELECT,
    });
  }

  async upsertChannelDraft(channelId: string, dto: UpsertDraftDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.draft.upsert({
      where: { userId_channelId: { userId: actor.id, channelId } },
      create: {
        userId: actor.id,
        channelId,
        content: dto.content,
        replyToId: dto.replyToId ?? null,
      },
      update: {
        content: dto.content,
        replyToId: dto.replyToId ?? null,
      },
      select: DRAFT_SELECT,
    });
  }

  async deleteChannelDraft(channelId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.db.draft.findUnique({
      where: { userId_channelId: { userId: actor.id, channelId } },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!existing) return { deleted: false };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.db.draft.delete({
      where: { userId_channelId: { userId: actor.id, channelId } },
    });
    return { deleted: true };
  }

  // ── Conversation draft ────────────────────────────────────────────────────

  async getConversationDraft(conversationId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.draft.findUnique({
      where: { userId_conversationId: { userId: actor.id, conversationId } },
      select: DRAFT_SELECT,
    });
  }

  async upsertConversationDraft(
    conversationId: string,
    dto: UpsertDraftDto,
    actor: AuthenticatedUser,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.draft.upsert({
      where: { userId_conversationId: { userId: actor.id, conversationId } },
      create: {
        userId: actor.id,
        conversationId,
        content: dto.content,
        replyToId: dto.replyToId ?? null,
      },
      update: {
        content: dto.content,
        replyToId: dto.replyToId ?? null,
      },
      select: DRAFT_SELECT,
    });
  }

  async deleteConversationDraft(conversationId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.db.draft.findUnique({
      where: { userId_conversationId: { userId: actor.id, conversationId } },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!existing) return { deleted: false };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.db.draft.delete({
      where: { userId_conversationId: { userId: actor.id, conversationId } },
    });
    return { deleted: true };
  }
}
