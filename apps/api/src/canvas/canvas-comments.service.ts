/**
 * Prinodia Canvas v1.6.0 — CanvasCommentsService
 */

import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { CreateCommentDto } from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class CanvasCommentsService {
  private readonly logger = new Logger(CanvasCommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async listComments(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasComment.findMany({
      where: { boardId, isDeleted: false, parentId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        elementId: true,
        content: true,
        posX: true,
        posY: true,
        isResolved: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        replies: {
          where: { isDeleted: false },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async createComment(boardId: string, dto: CreateCommentDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasComment.create({
      data: {
        boardId,
        authorId: actor.id,
        content: dto.content,
        elementId: dto.elementId,
        parentId: dto.parentId,
        posX: dto.posX,
        posY: dto.posY,
      },
      select: {
        id: true,
        content: true,
        elementId: true,
        parentId: true,
        posX: true,
        posY: true,
        createdAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async resolveComment(boardId: string, commentId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const comment = await this.db.canvasComment.findFirst({
      where: { id: commentId, boardId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasComment.update({
      where: { id: commentId },
      data: { isResolved: true, resolvedBy: actor.id, resolvedAt: new Date() },
      select: { id: true, isResolved: true, resolvedAt: true },
    });
  }

  async deleteComment(boardId: string, commentId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const comment = await this.db.canvasComment.findFirst({
      where: { id: commentId, boardId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (comment.authorId !== actor.id && actor.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Can only delete own comments");
    }

    await this.db.canvasComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
    return { deleted: true };
  }
}
