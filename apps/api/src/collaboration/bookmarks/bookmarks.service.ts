/**
 * Prinodia Chat v1.4.0 — BookmarksService
 *
 * Save channel messages or DMs for later reference.
 * Unique per (user × message) or (user × dm).
 */

import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import type { CreateBookmarkDto } from "./dto/bookmark.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.bookmark.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        note: true,
        createdAt: true,
        messageId: true,
        dmId: true,
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            channelId: true,
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        dm: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            conversationId: true,
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async create(dto: CreateBookmarkDto, actor: AuthenticatedUser) {
    if (!dto.messageId && !dto.dmId) {
      throw new BadRequestException("Either messageId or dmId is required");
    }
    if (dto.messageId && dto.dmId) {
      throw new BadRequestException("Only one of messageId or dmId may be set");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.bookmark.upsert({
      where: dto.messageId
        ? { userId_messageId: { userId: actor.id, messageId: dto.messageId } }
        : { userId_dmId: { userId: actor.id, dmId: dto.dmId! } },
      create: {
        userId: actor.id,
        messageId: dto.messageId ?? null,
        dmId: dto.dmId ?? null,
        note: dto.note ?? null,
      },
      update: { note: dto.note ?? null },
      select: { id: true, messageId: true, dmId: true, note: true, createdAt: true },
    });
  }

  async remove(bookmarkId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const bookmark = await this.db.bookmark.findUnique({
      where: { id: bookmarkId },
      select: { id: true, userId: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!bookmark || bookmark.userId !== actor.id) {
      return { deleted: false };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.db.bookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }
}
