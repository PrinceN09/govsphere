/**
 * Prinodia Canvas v1.6.0 — CanvasParticipantsService
 */

import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AddParticipantDto, UpdateParticipantRoleDto } from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const CURSOR_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
];

@Injectable()
export class CanvasParticipantsService {
  private readonly logger = new Logger(CanvasParticipantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async listParticipants(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasParticipant.findMany({
      where: { boardId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        lastSeenAt: true,
        isActive: true,
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
      },
    });
  }

  async addParticipant(boardId: string, dto: AddParticipantDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.db.canvasParticipant.findUnique({
      where: { boardId_userId: { boardId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException("User is already a participant");

    // Count existing to assign cursor color
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const count = await this.db.canvasParticipant.count({ where: { boardId } });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasParticipant.create({
      data: {
        boardId,
        userId: dto.userId,
        role: dto.role ?? "VIEWER",
        invitedBy: actor.id,
        color: CURSOR_COLORS[count % CURSOR_COLORS.length],
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async updateParticipantRole(
    boardId: string,
    participantId: string,
    dto: UpdateParticipantRoleDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const participant = await this.db.canvasParticipant.findFirst({
      where: { id: participantId, boardId },
    });
    if (!participant) throw new NotFoundException("Participant not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasParticipant.update({
      where: { id: participantId },
      data: { role: dto.role },
      select: { id: true, role: true, user: { select: { id: true, displayName: true } } },
    });
  }

  async removeParticipant(boardId: string, participantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const participant = await this.db.canvasParticipant.findFirst({
      where: { id: participantId, boardId },
    });
    if (!participant) throw new NotFoundException("Participant not found");

    await this.db.canvasParticipant.update({
      where: { id: participantId },
      data: { isActive: false },
    });
    return { removed: true };
  }
}
