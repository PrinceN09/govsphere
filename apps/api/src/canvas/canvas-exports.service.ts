/**
 * Prinodia Canvas v1.6.0 — CanvasExportsService
 *
 * Architecture-ready; actual rendering is a placeholder for v2.0.0 (Drive).
 * Records export requests, marks them READY with a placeholder URL.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { CreateExportDto } from "./dto/canvas.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class CanvasExportsService {
  private readonly logger = new Logger(CanvasExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async listExports(boardId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.db.canvasExport.findMany({
      where: { boardId, requestedById: actor.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        format: true,
        status: true,
        downloadUrl: true,
        fileSizeBytes: true,
        options: true,
        errorMessage: true,
        expiresAt: true,
        processedAt: true,
        createdAt: true,
      },
    });
  }

  async createExport(boardId: string, dto: CreateExportDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const exportRecord = await this.db.canvasExport.create({
      data: {
        boardId,
        requestedById: actor.id,
        format: dto.format,
        status: "PENDING",
        pageRange: dto.pageRange,
        options: dto.options ?? {},
      },
      select: { id: true, format: true, status: true, createdAt: true },
    });

    // Architecture placeholder: in production, enqueue a rendering job.
    // For now, immediately mark as READY with a stub URL.
    this.scheduleExportRender(exportRecord.id, boardId, dto.format);

    return exportRecord;
  }

  async getExport(boardId: string, exportId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rec = await this.db.canvasExport.findFirst({
      where: { id: exportId, boardId },
      select: {
        id: true,
        format: true,
        status: true,
        downloadUrl: true,
        fileSizeBytes: true,
        errorMessage: true,
        expiresAt: true,
        processedAt: true,
        createdAt: true,
      },
    });
    if (!rec) throw new NotFoundException("Export not found");
    return rec;
  }

  // Stub rendering pipeline — replace with real queue job in v2.0.0
  private scheduleExportRender(exportId: string, boardId: string, format: string) {
    setTimeout(() => {
      void this.db.canvasExport.update({
        where: { id: exportId },
        data: {
          status: "READY",
          downloadUrl: `/api/v1/canvas/boards/${boardId}/exports/${exportId}/download`,
          processedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
      this.logger.log(`[Canvas] Export ${exportId} (${format}) marked READY (stub)`);
    }, 2000);
  }
}
