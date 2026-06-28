/**
 * Prinodia Canvas v1.6.0 — CanvasSharesService
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { CreateShareDto } from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class CanvasSharesService {
  private readonly logger = new Logger(CanvasSharesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async listShares(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasShare.findMany({
      where: { boardId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shareToken: true,
        access: true,
        label: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async createShare(boardId: string, dto: CreateShareDto, actor: AuthenticatedUser) {
    const token = randomBytes(32).toString("hex");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasShare.create({
      data: {
        boardId,
        createdById: actor.id,
        shareToken: token,
        access: dto.access ?? "VIEW",
        label: dto.label,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        // password hashing would go here in production (bcrypt)
        password: dto.password ?? null,
      },
      select: {
        id: true,
        shareToken: true,
        access: true,
        label: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeShare(boardId: string, shareId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const share = await this.db.canvasShare.findFirst({
      where: { id: shareId, boardId },
      select: { id: true },
    });
    if (!share) throw new NotFoundException("Share link not found");

    await this.db.canvasShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async resolveShareToken(token: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const share = await this.db.canvasShare.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        boardId: true,
        access: true,
        revokedAt: true,
        expiresAt: true,
        maxUses: true,
        uses: true,
      },
    });
    if (!share) throw new NotFoundException("Invalid share link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (share.revokedAt) throw new NotFoundException("Share link has been revoked");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new NotFoundException("Share link has expired");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (share.maxUses && share.uses >= share.maxUses) {
      throw new NotFoundException("Share link has reached maximum uses");
    }

    // Bump use count
    await this.db.canvasShare.update({
      where: { shareToken: token },
      data: { uses: { increment: 1 } },
    });

    return share;
  }
}
