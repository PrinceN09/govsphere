/**
 * GovSphere — BriefingsService (v1.0.0)
 *
 * Executive briefings: daily, weekly, cabinet, emergency.
 * Supports rich text content, approval workflow, version history.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { BriefingQueryDto, CreateBriefingDto, UpdateBriefingDto } from "./dto/executive.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@Injectable()
export class BriefingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listBriefings(actor: AuthenticatedUser, query: BriefingQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.briefingType !== undefined) where["briefingType"] = query.briefingType;
    if (query.status !== undefined) where["status"] = query.status;
    if (query.officeId !== undefined) where["officeId"] = query.officeId;

    return this.prisma.executiveBriefing.findMany({
      where,
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        approvedBy: { select: { id: true, displayName: true } },
        office: { select: { id: true, name: true, officeType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.take ?? 50,
    });
  }

  async getBriefing(id: string) {
    const briefing = await this.prisma.executiveBriefing.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        approvedBy: { select: { id: true, displayName: true } },
        office: { select: { id: true, name: true, officeType: true } },
      },
    });
    if (!briefing) throw new NotFoundException("Briefing introuvable");
    return briefing;
  }

  async createBriefing(actor: AuthenticatedUser, dto: CreateBriefingDto) {
    const briefing = await this.prisma.executiveBriefing.create({
      data: {
        title: dto.title,
        briefingType: dto.briefingType as never,
        content: (dto.content ?? {}) as never,
        summary: dto.summary ?? null,
        officeId: dto.officeId ?? null,
        authorId: actor.id,
        attachments: dto.attachments ?? [],
        meetingRefs: dto.meetingRefs ?? [],
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      },
      include: {
        author: { select: { id: true, displayName: true } },
        office: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "BRIEFING_CREATED" as never,
      userId: actor.id,
      entityId: briefing.id,
      metadata: { briefingType: dto.briefingType },
    });

    return briefing;
  }

  async updateBriefing(id: string, actor: AuthenticatedUser, dto: UpdateBriefingDto) {
    const briefing = await this.getBriefing(id);

    if (briefing.authorId !== actor.id) {
      throw new ForbiddenException("Seul l'auteur peut modifier ce briefing");
    }
    if (briefing.status === "DISTRIBUTED") {
      throw new BadRequestException("Un briefing distribué ne peut plus être modifié");
    }

    // Save current version to history before update
    const versionHistory = briefing.versionHistory as unknown[];
    versionHistory.push({
      savedAt: new Date().toISOString(),
      savedById: actor.id,
      content: briefing.content,
      summary: briefing.summary,
    });

    const updated = await this.prisma.executiveBriefing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content as never }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(dto.scheduledFor !== undefined && { scheduledFor: new Date(dto.scheduledFor) }),
        ...(dto.attachments !== undefined && { attachments: dto.attachments }),
        versionHistory: versionHistory as never,
      },
    });

    void this.audit.log({
      action: "BRIEFING_UPDATED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async approveBriefing(id: string, actor: AuthenticatedUser) {
    const briefing = await this.getBriefing(id);
    if (briefing.status !== "REVIEW") {
      throw new BadRequestException("Le briefing doit être en révision pour être approuvé");
    }

    const updated = await this.prisma.executiveBriefing.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: actor.id,
      },
    });

    void this.audit.log({
      action: "BRIEFING_APPROVED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async publishBriefing(id: string, actor: AuthenticatedUser) {
    const briefing = await this.getBriefing(id);
    if (!["APPROVED", "DRAFT"].includes(briefing.status)) {
      throw new BadRequestException("Le briefing doit être approuvé pour être publié");
    }

    const updated = await this.prisma.executiveBriefing.update({
      where: { id },
      data: {
        status: "DISTRIBUTED",
        publishedAt: new Date(),
      },
    });

    void this.audit.log({
      action: "BRIEFING_PUBLISHED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async submitForReview(id: string, actor: AuthenticatedUser) {
    const briefing = await this.getBriefing(id);
    if (briefing.authorId !== actor.id) {
      throw new ForbiddenException("Seul l'auteur peut soumettre ce briefing");
    }
    if (briefing.status !== "DRAFT") {
      throw new BadRequestException("Seul un brouillon peut être soumis à révision");
    }

    return this.prisma.executiveBriefing.update({
      where: { id },
      data: { status: "REVIEW" },
    });
  }
}
