/**
 * Prinodia Canvas v1.6.0 — CanvasElementsService
 *
 * CRUD for canvas elements with version history.
 * Lock/unlock for concurrent-editing safety.
 */

import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { CreateElementDto, UpdateElementDto } from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class CanvasElementsService {
  private readonly logger = new Logger(CanvasElementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async listElements(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasElement.findMany({
      where: { boardId, isDeleted: false },
      orderBy: [{ layerIndex: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        elementType: true,
        layerIndex: true,
        isLocked: true,
        isVisible: true,
        x: true,
        y: true,
        width: true,
        height: true,
        rotation: true,
        data: true,
        style: true,
        lockedBy: true,
        lockedAt: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, displayName: true } },
      },
    });
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createElement(boardId: string, dto: CreateElementDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const element = await this.db.canvasElement.create({
      data: {
        boardId,
        createdBy: actor.id,
        elementType: dto.elementType,
        x: dto.x ?? 0,
        y: dto.y ?? 0,
        width: dto.width,
        height: dto.height,
        rotation: dto.rotation ?? 0,
        layerIndex: dto.layerIndex ?? 0,
        data: dto.data ?? {},
        style: dto.style ?? {},
      },
      select: {
        id: true,
        elementType: true,
        x: true,
        y: true,
        data: true,
        style: true,
        createdAt: true,
      },
    });

    // Bump board element count and activity
    await this.db.canvasBoard.update({
      where: { id: boardId },
      data: {
        elementCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    return element;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateElement(
    boardId: string,
    elementId: string,
    dto: UpdateElementDto,
    actor: AuthenticatedUser,
  ) {
    const element = await this.getElementOrThrow(boardId, elementId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (element.lockedBy && element.lockedBy !== actor.id) {
      throw new ForbiddenException("Element is locked by another user");
    }

    // Save version before update
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const versionCount = await this.db.canvasElementVersion.count({
      where: { elementId },
    });
    await this.db.canvasElementVersion.create({
      data: {
        elementId,
        editorId: actor.id,
        versionNum: versionCount + 1,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data: element.data as object,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        style: element.style as object,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        x: element.x as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        y: element.y as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        width: element.width as number | null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        height: element.height as number | null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rotation: element.rotation as number,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasElement.update({
      where: { id: elementId },
      data: {
        ...(dto.x !== undefined ? { x: dto.x } : {}),
        ...(dto.y !== undefined ? { y: dto.y } : {}),
        ...(dto.width !== undefined ? { width: dto.width } : {}),
        ...(dto.height !== undefined ? { height: dto.height } : {}),
        ...(dto.rotation !== undefined ? { rotation: dto.rotation } : {}),
        ...(dto.layerIndex !== undefined ? { layerIndex: dto.layerIndex } : {}),
        ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.data !== undefined ? { data: dto.data } : {}),
        ...(dto.style !== undefined ? { style: dto.style } : {}),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        elementType: true,
        x: true,
        y: true,
        width: true,
        height: true,
        rotation: true,
        data: true,
        style: true,
        layerIndex: true,
        updatedAt: true,
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteElement(boardId: string, elementId: string) {
    await this.getElementOrThrow(boardId, elementId);

    await this.db.canvasElement.update({
      where: { id: elementId },
      data: { isDeleted: true },
    });

    await this.db.canvasBoard.update({
      where: { id: boardId },
      data: { elementCount: { decrement: 1 }, lastActivityAt: new Date() },
    });

    return { deleted: true };
  }

  // ── Lock / Unlock ─────────────────────────────────────────────────────────

  async lockElement(boardId: string, elementId: string, actor: AuthenticatedUser) {
    const element = await this.getElementOrThrow(boardId, elementId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (element.lockedBy && element.lockedBy !== actor.id) {
      throw new ForbiddenException("Element is locked by another user");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasElement.update({
      where: { id: elementId },
      data: { lockedBy: actor.id, lockedAt: new Date() },
      select: { id: true, lockedBy: true, lockedAt: true },
    });
  }

  async unlockElement(boardId: string, elementId: string, actor: AuthenticatedUser) {
    const element = await this.getElementOrThrow(boardId, elementId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (element.lockedBy && element.lockedBy !== actor.id) {
      // Allow admins and owners to force-unlock
      if (actor.role !== "SUPER_ADMIN" && actor.role !== "GOVERNMENT_ADMIN") {
        throw new ForbiddenException("Cannot unlock an element locked by another user");
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasElement.update({
      where: { id: elementId },
      data: { lockedBy: null, lockedAt: null },
      select: { id: true, lockedBy: true },
    });
  }

  // ── Version history ───────────────────────────────────────────────────────

  async getElementVersions(boardId: string, elementId: string) {
    await this.getElementOrThrow(boardId, elementId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasElementVersion.findMany({
      where: { elementId },
      orderBy: { versionNum: "desc" },
      take: 50,
      select: {
        id: true,
        versionNum: true,
        data: true,
        style: true,
        x: true,
        y: true,
        width: true,
        height: true,
        rotation: true,
        createdAt: true,
        editor: { select: { id: true, displayName: true } },
      },
    });
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private async getElementOrThrow(boardId: string, elementId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const element = await this.db.canvasElement.findFirst({
      where: { id: elementId, boardId, isDeleted: false },
      select: {
        id: true,
        lockedBy: true,
        data: true,
        style: true,
        x: true,
        y: true,
        width: true,
        height: true,
        rotation: true,
      },
    });
    if (!element) throw new NotFoundException("Canvas element not found");
    return element;
  }
}
