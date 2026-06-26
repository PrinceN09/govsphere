/**
 * Prinodia Workspace — ExecutiveService (v1.0.0)
 *
 * Manages Executive Offices, staff, announcements, and the executive dashboard.
 * Reuses existing AuditService, PrismaService, CalendarModule, WorkflowsModule.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type {
  AnnouncementQueryDto,
  CreateAnnouncementDto,
  CreateExecutiveOfficeDto,
  ExecutiveOfficeQueryDto,
  UpdateAnnouncementDto,
  UpdateExecutiveOfficeDto,
} from "./dto/executive.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@Injectable()
export class ExecutiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard(actor: AuthenticatedUser) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      officeCount,
      upcomingSessions,
      pendingDecisions,
      recentBriefings,
      recentAnnouncements,
      decisionStats,
    ] = await Promise.all([
      this.prisma.executiveOffice.count({ where: { isActive: true } }),
      this.prisma.cabinetSession.findMany({
        where: { scheduledAt: { gte: now }, status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true,
          sessionNumber: true,
          title: true,
          scheduledAt: true,
          status: true,
          chair: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.cabinetDecision.count({
        where: { status: { in: ["DRAFT", "UNDER_REVIEW"] } },
      }),
      this.prisma.executiveBriefing.findMany({
        where: { status: { not: "DISTRIBUTED" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          briefingType: true,
          status: true,
          scheduledFor: true,
          author: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.executiveAnnouncement.findMany({
        where: { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          audience: true,
          publishedAt: true,
          office: { select: { id: true, name: true } },
        },
      }),
      this.prisma.cabinetDecision.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    return {
      summary: {
        activeOffices: officeCount,
        pendingDecisions,
        upcomingSessionsCount: upcomingSessions.length,
      },
      decisionsByStatus: decisionStats.map((s) => ({ status: s.status, count: s._count })),
      upcomingSessions,
      recentBriefings,
      recentAnnouncements,
    };
  }

  // ── Executive Offices ─────────────────────────────────────────────────────────

  async listOffices(actor: AuthenticatedUser, query: ExecutiveOfficeQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.officeType !== undefined) where["officeType"] = query.officeType;
    if (query.isActive !== undefined) where["isActive"] = query.isActive;
    if (query.ministryId !== undefined) where["ministryId"] = query.ministryId;

    return this.prisma.executiveOffice.findMany({
      where,
      include: {
        head: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        ministry: { select: { id: true, name: true, code: true } },
        _count: { select: { staff: true } },
      },
      orderBy: [{ officeType: "asc" }, { name: "asc" }],
    });
  }

  async getOffice(id: string) {
    const office = await this.prisma.executiveOffice.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        ministry: { select: { id: true, name: true, code: true } },
        staff: {
          include: {
            user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          },
          where: { endDate: null },
          orderBy: { isPrimary: "desc" },
        },
        briefings: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            briefingType: true,
            status: true,
            scheduledFor: true,
          },
        },
        announcements: {
          where: { isPublished: true },
          orderBy: { publishedAt: "desc" },
          take: 5,
          select: { id: true, title: true, publishedAt: true, audience: true },
        },
      },
    });
    if (!office) throw new NotFoundException("Bureau introuvable");
    return office;
  }

  async createOffice(actor: AuthenticatedUser, dto: CreateExecutiveOfficeDto) {
    const existing = await this.prisma.executiveOffice.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException("Code de bureau déjà utilisé");

    const office = await this.prisma.executiveOffice.create({
      data: {
        name: dto.name,
        officeType: dto.officeType as never,
        code: dto.code,
        description: dto.description ?? null,
        location: dto.location ?? null,
        headId: dto.headId ?? null,
        ministryId: dto.ministryId ?? null,
      },
      include: {
        head: { select: { id: true, displayName: true } },
        ministry: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "EXECUTIVE_OFFICE_CREATED" as never,
      userId: actor.id,
      entityId: office.id,
      metadata: { name: office.name, officeType: office.officeType },
    });

    return office;
  }

  async updateOffice(id: string, actor: AuthenticatedUser, dto: UpdateExecutiveOfficeDto) {
    await this.getOffice(id);

    const updated = await this.prisma.executiveOffice.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.headId !== undefined && { headId: dto.headId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        head: { select: { id: true, displayName: true } },
        ministry: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "EXECUTIVE_OFFICE_UPDATED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  // ── Announcements ─────────────────────────────────────────────────────────────

  async listAnnouncements(actor: AuthenticatedUser, query: AnnouncementQueryDto) {
    const now = new Date();
    const where: Record<string, unknown> = {
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    };
    if (query.isPublished !== undefined) where["isPublished"] = query.isPublished;
    if (query.audience !== undefined) where["audience"] = query.audience;

    return this.prisma.executiveAnnouncement.findMany({
      where,
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        office: { select: { id: true, name: true, officeType: true } },
        targetMinistry: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.take ?? 50,
    });
  }

  async getAnnouncement(id: string) {
    const announcement = await this.prisma.executiveAnnouncement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        office: { select: { id: true, name: true, officeType: true } },
        targetMinistry: { select: { id: true, name: true } },
      },
    });
    if (!announcement) throw new NotFoundException("Annonce introuvable");
    return announcement;
  }

  async createAnnouncement(actor: AuthenticatedUser, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.executiveAnnouncement.create({
      data: {
        title: dto.title,
        content: dto.content,
        audience: (dto.audience ?? "ALL_STAFF") as never,
        officeId: dto.officeId ?? null,
        authorId: actor.id,
        targetMinistryId: dto.targetMinistryId ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        author: { select: { id: true, displayName: true } },
        office: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "EXECUTIVE_ANNOUNCEMENT_CREATED" as never,
      userId: actor.id,
      entityId: announcement.id,
    });

    return announcement;
  }

  async updateAnnouncement(id: string, actor: AuthenticatedUser, dto: UpdateAnnouncementDto) {
    const ann = await this.getAnnouncement(id);
    if (ann.authorId !== actor.id) {
      throw new ForbiddenException("Seul l'auteur peut modifier cette annonce");
    }

    return this.prisma.executiveAnnouncement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.audience !== undefined && { audience: dto.audience as never }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
      },
    });
  }

  async publishAnnouncement(id: string, actor: AuthenticatedUser) {
    const ann = await this.getAnnouncement(id);
    if (ann.isPublished) throw new BadRequestException("Annonce déjà publiée");

    const updated = await this.prisma.executiveAnnouncement.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    void this.audit.log({
      action: "EXECUTIVE_ANNOUNCEMENT_PUBLISHED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }
}
