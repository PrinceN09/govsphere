/**
 * GovSphere — CorrespondenceService (v1.0.0)
 *
 * Executive correspondence: letters, directives, memos, circulars, notes.
 * Integrates with Documents module and classification system.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type {
  CorrespondenceQueryDto,
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from "./dto/executive.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@Injectable()
export class CorrespondenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCorrespondence(actor: AuthenticatedUser, query: CorrespondenceQueryDto) {
    const where: Record<string, unknown> = {
      OR: [{ fromUserId: actor.id }, { toUserId: actor.id }],
    };

    if (query.correspondenceType !== undefined)
      where["correspondenceType"] = query.correspondenceType;
    if (query.classification !== undefined) where["classification"] = query.classification;
    if (query.search !== undefined) {
      where["OR"] = [
        { subject: { contains: query.search, mode: "insensitive" } },
        { referenceNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.executiveCorrespondence.findMany({
      where,
      include: {
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
        fromOffice: { select: { id: true, name: true, officeType: true } },
        toMinistry: { select: { id: true, name: true } },
        toUser: { select: { id: true, displayName: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.take ?? 50,
    });
  }

  async getCorrespondence(id: string) {
    const corr = await this.prisma.executiveCorrespondence.findUnique({
      where: { id },
      include: {
        fromUser: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        fromOffice: { select: { id: true, name: true, officeType: true } },
        toMinistry: { select: { id: true, name: true } },
        toUser: { select: { id: true, displayName: true, email: true } },
        parentCorrespondence: {
          select: { id: true, referenceNumber: true, subject: true },
        },
        replies: {
          select: {
            id: true,
            referenceNumber: true,
            subject: true,
            sentAt: true,
            fromUser: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!corr) throw new NotFoundException("Correspondance introuvable");
    return corr;
  }

  async createCorrespondence(actor: AuthenticatedUser, dto: CreateCorrespondenceDto) {
    // Auto-generate reference number: REF-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await this.prisma.executiveCorrespondence.count({
      where: { referenceNumber: { startsWith: `REF-${year}-` } },
    });
    const referenceNumber = `REF-${year}-${String(count + 1).padStart(4, "0")}`;

    const corr = await this.prisma.executiveCorrespondence.create({
      data: {
        referenceNumber,
        subject: dto.subject,
        correspondenceType: dto.correspondenceType as never,
        classification: (dto.classification ?? "INTERNAL") as never,
        content: (dto.content ?? {}) as never,
        summary: dto.summary ?? null,
        fromUserId: actor.id,
        fromOfficeId: dto.fromOfficeId ?? null,
        toMinistryId: dto.toMinistryId ?? null,
        toUserId: dto.toUserId ?? null,
        toExternal: dto.toExternal ?? null,
        parentCorrespondenceId: dto.parentCorrespondenceId ?? null,
      },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        fromOffice: { select: { id: true, name: true } },
        toMinistry: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "CORRESPONDENCE_CREATED" as never,
      userId: actor.id,
      entityId: corr.id,
      metadata: { referenceNumber, correspondenceType: dto.correspondenceType },
    });

    return corr;
  }

  async updateCorrespondence(id: string, actor: AuthenticatedUser, dto: UpdateCorrespondenceDto) {
    const corr = await this.getCorrespondence(id);
    if (corr.fromUserId !== actor.id) {
      throw new BadRequestException("Seul l'expéditeur peut modifier cette correspondance");
    }
    if (corr.sentAt !== null) {
      throw new BadRequestException("Une correspondance envoyée ne peut plus être modifiée");
    }

    const updated = await this.prisma.executiveCorrespondence.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.content !== undefined && { content: dto.content as never }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.classification !== undefined && { classification: dto.classification as never }),
      },
    });

    void this.audit.log({
      action: "CORRESPONDENCE_UPDATED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async sendCorrespondence(id: string, actor: AuthenticatedUser) {
    const corr = await this.getCorrespondence(id);
    if (corr.fromUserId !== actor.id) {
      throw new BadRequestException("Seul l'expéditeur peut envoyer cette correspondance");
    }
    if (corr.sentAt !== null) {
      throw new BadRequestException("Correspondance déjà envoyée");
    }

    const updated = await this.prisma.executiveCorrespondence.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    void this.audit.log({
      action: "CORRESPONDENCE_SENT" as never,
      userId: actor.id,
      entityId: id,
      metadata: { referenceNumber: corr.referenceNumber },
    });

    return updated;
  }

  async acknowledgeCorrespondence(id: string, actor: AuthenticatedUser) {
    const corr = await this.getCorrespondence(id);
    if (corr.toUserId !== actor.id) {
      throw new BadRequestException("Seul le destinataire peut accuser réception");
    }

    return this.prisma.executiveCorrespondence.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }
}
