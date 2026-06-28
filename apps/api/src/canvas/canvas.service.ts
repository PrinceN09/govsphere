/**
 * Prinodia Canvas v1.6.0 — CanvasService
 *
 * Board lifecycle: create, list, get, update, delete, archive.
 * From-meeting and from-channel creation with automatic participant seeding.
 * Extension points for AI (v2.0.0) and Drive (v2.0.0) are stubbed.
 */

import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../identity/audit/audit.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type {
  CreateBoardDto,
  CreateFromChannelDto,
  CreateFromMeetingDto,
  UpdateBoardDto,
} from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const BOARD_SELECT = {
  id: true,
  organizationId: true,
  ownerId: true,
  title: true,
  description: true,
  boardType: true,
  status: true,
  meetingId: true,
  channelId: true,
  documentId: true,
  templateId: true,
  thumbnailUrl: true,
  viewportState: true,
  background: true,
  isPublic: true,
  isLocked: true,
  elementCount: true,
  lastActivityAt: true,
  aiEnabled: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, displayName: true, avatarUrl: true } },
  participants: {
    select: {
      id: true,
      userId: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
  _count: { select: { elements: true, comments: true, sessions: true } },
} as const;

// Cursor colors assigned to participants in order
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
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ── Discovery ─────────────────────────────────────────────────────────────

  async listBoards(actor: AuthenticatedUser, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [boards, total] = await Promise.all([
      this.db.canvasBoard.findMany({
        where: {
          deletedAt: null,
          status: { not: "DELETED" },
          OR: [
            { ownerId: actor.id },
            { participants: { some: { userId: actor.id, isActive: true } } },
            {
              isPublic: true,
              organizationId: actor.ministryId ?? actor.departmentId ?? actor.divisionId,
            },
          ],
        },
        orderBy: { lastActivityAt: "desc" },
        skip,
        take: limit,
        select: BOARD_SELECT,
      }),
      this.db.canvasBoard.count({
        where: {
          deletedAt: null,
          status: { not: "DELETED" },
          OR: [
            { ownerId: actor.id },
            { participants: { some: { userId: actor.id, isActive: true } } },
          ],
        },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return { boards, total, page, limit };
  }

  async getBoard(boardId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.findUnique({
      where: { id: boardId },
      select: BOARD_SELECT,
    });
    if (!board) throw new NotFoundException("Canvas board not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (board.deletedAt) throw new NotFoundException("Canvas board not found");
    await this.assertBoardAccess(boardId, actor);
    return board;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createBoard(dto: CreateBoardDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.create({
      data: {
        organizationId: actor.ministryId ?? actor.departmentId ?? actor.divisionId ?? "global",
        ownerId: actor.id,
        title: dto.title,
        description: dto.description,
        boardType: dto.boardType ?? "WHITEBOARD",
        meetingId: dto.meetingId,
        channelId: dto.channelId,
        templateId: dto.templateId,
        background: dto.background ?? "#FFFFFF",
      },
      select: BOARD_SELECT,
    });

    // Auto-add owner as OWNER participant
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.db.canvasParticipant.create({
      data: {
        boardId: board.id,
        userId: actor.id,
        role: "OWNER",
        color: CURSOR_COLORS[0],
      },
    });

    // If created from template, clone elements
    if (dto.templateId) {
      await this.cloneFromTemplate(board.id, dto.templateId, actor.id);
    }

    void this.audit.log({
      userId: actor.id,
      action: "CANVAS_BOARD_CREATED" as never,
      entityType: "CANVAS_BOARD",
      entityId: board.id,
      metadata: { boardType: dto.boardType, meetingId: dto.meetingId },
    });

    this.logger.log(`[Canvas] Board ${board.id} created by ${actor.id}`);
    return board;
  }

  async createFromMeeting(meetingId: string, dto: CreateFromMeetingDto, actor: AuthenticatedUser) {
    // Verify meeting exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.db.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        organizerId: true,
        participants: { select: { userId: true } },
      },
    });
    if (!meeting) throw new NotFoundException("Meeting not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.create({
      data: {
        organizationId: actor.ministryId ?? actor.departmentId ?? actor.divisionId ?? "global",
        ownerId: actor.id,
        title: dto.title ?? `Canvas — ${meeting.title}`,
        boardType: dto.boardType ?? "MEETING_BOARD",
        meetingId,
      },
      select: BOARD_SELECT,
    });

    // Auto-add all meeting participants as EDITOR
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const participantUserIds: string[] = meeting.participants.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.userId as string,
    );
    const uniqueIds = [...new Set([actor.id, ...participantUserIds])];
    for (let i = 0; i < uniqueIds.length; i++) {
      const uid = uniqueIds[i];
      if (!uid) continue;
      await this.db.canvasParticipant.upsert({
        where: { boardId_userId: { boardId: board.id, userId: uid } },
        create: {
          boardId: board.id,
          userId: uid,
          role: uid === actor.id ? "OWNER" : "EDITOR",
          color: CURSOR_COLORS[i % CURSOR_COLORS.length],
        },
        update: { isActive: true },
      });
    }

    this.logger.log(`[Canvas] Meeting board ${board.id} created from meeting ${meetingId}`);
    return board;
  }

  async createFromChannel(channelId: string, dto: CreateFromChannelDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = await this.db.channel.findUnique({
      where: { id: channelId },
      select: { id: true, name: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.create({
      data: {
        organizationId: actor.ministryId ?? actor.departmentId ?? actor.divisionId ?? "global",
        ownerId: actor.id,
        title: dto.title ?? `Canvas — #${channel.name}`,
        boardType: dto.boardType ?? "WHITEBOARD",
        channelId,
      },
      select: BOARD_SELECT,
    });

    // Add creator as owner participant
    await this.db.canvasParticipant.create({
      data: {
        boardId: board.id,
        userId: actor.id,
        role: "OWNER",
        color: CURSOR_COLORS[0],
      },
    });

    this.logger.log(`[Canvas] Channel board ${board.id} created from channel ${channelId}`);
    return board;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateBoard(boardId: string, dto: UpdateBoardDto, actor: AuthenticatedUser) {
    await this.getBoardOrThrow(boardId);
    await this.assertEditorOrOwner(boardId, actor);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.canvasBoard.update({
      where: { id: boardId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
        ...(dto.background !== undefined ? { background: dto.background } : {}),
        ...(dto.viewportState !== undefined ? { viewportState: dto.viewportState } : {}),
        lastActivityAt: new Date(),
      },
      select: BOARD_SELECT,
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteBoard(boardId: string, actor: AuthenticatedUser) {
    await this.getBoardOrThrow(boardId);
    await this.assertOwner(boardId, actor);

    await this.db.canvasBoard.update({
      where: { id: boardId },
      data: { deletedAt: new Date(), status: "DELETED" },
    });

    void this.audit.log({
      userId: actor.id,
      action: "CANVAS_BOARD_DELETED" as never,
      entityType: "CANVAS_BOARD",
      entityId: boardId,
      metadata: {},
    });

    return { deleted: true };
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async listTemplates(boardType?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasTemplate.findMany({
      where: {
        isPublic: true,
        ...(boardType ? { boardType } : {}),
      },
      orderBy: [{ isSystem: "desc" }, { useCount: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        boardType: true,
        thumbnailUrl: true,
        isSystem: true,
        category: true,
        tags: true,
        useCount: true,
        creator: { select: { id: true, displayName: true } },
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async getBoardOrThrow(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true, status: true, isLocked: true, deletedAt: true },
    });
    if (!board) throw new NotFoundException("Canvas board not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (board.deletedAt) throw new NotFoundException("Canvas board not found");
    return board;
  }

  async assertBoardAccess(boardId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const participant = await this.db.canvasParticipant.findUnique({
      where: { boardId_userId: { boardId, userId: actor.id } },
      select: { role: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.findUnique({
      where: { id: boardId },
      select: { ownerId: true, isPublic: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!participant && board?.ownerId !== actor.id && !board?.isPublic) {
      throw new ForbiddenException("Not a participant of this canvas");
    }
  }

  async assertEditorOrOwner(boardId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [board, participant] = await Promise.all([
      this.db.canvasBoard.findUnique({ where: { id: boardId }, select: { ownerId: true } }),
      this.db.canvasParticipant.findUnique({
        where: { boardId_userId: { boardId, userId: actor.id } },
        select: { role: true },
      }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isOwner = board?.ownerId === actor.id || participant?.role === "OWNER";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isEditor = participant?.role === "EDITOR" || participant?.role === "PRESENTER";
    if (!isOwner && !isEditor) {
      throw new ForbiddenException("Editor access required");
    }
  }

  async assertOwner(boardId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const board = await this.db.canvasBoard.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (board?.ownerId !== actor.id) {
      throw new ForbiddenException("Owner access required");
    }
  }

  private async cloneFromTemplate(boardId: string, templateId: string, createdBy: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const template = await this.db.canvasTemplate.findUnique({
      where: { id: templateId },
      select: { elementsSnapshot: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!template?.elementsSnapshot) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const elements: any[] = Array.isArray(template.elementsSnapshot)
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (template.elementsSnapshot as any[])
      : [];

    for (const el of elements) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await this.db.canvasElement.create({
        data: {
          boardId,
          createdBy,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          elementType: el.elementType ?? "TEXT",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          x: el.x ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          y: el.y ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          data: el.data ?? {},
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          style: el.style ?? {},
        },
      });
    }

    // Bump template useCount
    await this.db.canvasTemplate.update({
      where: { id: templateId },
      data: { useCount: { increment: 1 } },
    });
  }

  // ── Integration helpers ───────────────────────────────────────────────────

  /** Phase 5: All boards linked to a meeting */
  async listBoardsForMeeting(meetingId: string, _actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasBoard.findMany({
      where: {
        meetingId,
        deletedAt: null,
        status: { not: "DELETED" },
      },
      orderBy: { lastActivityAt: "desc" },
      select: BOARD_SELECT,
    });
  }

  /** Phase 6: All boards linked to a channel */
  async listBoardsForChannel(channelId: string, _actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasBoard.findMany({
      where: {
        channelId,
        deletedAt: null,
        status: { not: "DELETED" },
      },
      orderBy: { lastActivityAt: "desc" },
      select: BOARD_SELECT,
    });
  }

  async touchActivity(boardId: string) {
    await this.db.canvasBoard.update({
      where: { id: boardId },
      data: { lastActivityAt: new Date() },
    });
  }
}
