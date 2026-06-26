/**
 * Prinodia Workspace — CabinetService (v1.0.0)
 *
 * Cabinet sessions, agenda items, decisions, voting, and implementation tracking.
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
  CabinetSessionQueryDto,
  CreateAgendaItemDto,
  CreateCabinetSessionDto,
  CreateDecisionDto,
  CreateImplementationDto,
  DecisionQueryDto,
  UpdateAgendaItemDto,
  UpdateCabinetSessionDto,
  UpdateDecisionDto,
  UpdateImplementationDto,
  VoteDecisionDto,
} from "./dto/executive.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@Injectable()
export class CabinetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Sessions ─────────────────────────────────────────────────────────────────

  async listSessions(actor: AuthenticatedUser, query: CabinetSessionQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status !== undefined) where["status"] = query.status;
    if (query.from !== undefined || query.to !== undefined) {
      where["scheduledAt"] = {
        ...(query.from !== undefined ? { gte: new Date(query.from) } : {}),
        ...(query.to !== undefined ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.cabinetSession.findMany({
      where,
      include: {
        chair: { select: { id: true, displayName: true, avatarUrl: true } },
        secretary: { select: { id: true, displayName: true } },
        _count: { select: { agendaItems: true, decisions: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: query.take ?? 50,
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.cabinetSession.findUnique({
      where: { id },
      include: {
        chair: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        secretary: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        agendaItems: {
          include: {
            presentedBy: { select: { id: true, displayName: true } },
            decisions: {
              select: { id: true, decisionNumber: true, title: true, status: true },
            },
          },
          orderBy: { order: "asc" },
        },
        decisions: {
          include: {
            responsibleMinistry: { select: { id: true, name: true } },
            owner: { select: { id: true, displayName: true } },
            _count: { select: { implementations: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { agendaItems: true, decisions: true } },
      },
    });
    if (!session) throw new NotFoundException("Session de cabinet introuvable");
    return session;
  }

  async createSession(actor: AuthenticatedUser, dto: CreateCabinetSessionDto) {
    const session = await this.prisma.cabinetSession.create({
      data: {
        sessionNumber: dto.sessionNumber,
        title: dto.title,
        description: dto.description ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location ?? null,
        chairId: actor.id, // creator chairs by default (can be overridden)
        secretaryId: dto.secretaryId ?? null,
        meetingId: dto.meetingId ?? null,
        createdById: actor.id,
      },
      include: {
        chair: { select: { id: true, displayName: true } },
      },
    });

    void this.audit.log({
      action: "CABINET_SESSION_CREATED" as never,
      userId: actor.id,
      entityId: session.id,
      metadata: { sessionNumber: session.sessionNumber, title: session.title },
    });

    return session;
  }

  async updateSession(id: string, actor: AuthenticatedUser, dto: UpdateCabinetSessionDto) {
    await this.getSession(id);

    const updated = await this.prisma.cabinetSession.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.secretaryId !== undefined && { secretaryId: dto.secretaryId }),
        ...(dto.status !== undefined && { status: dto.status as never }),
      },
    });

    void this.audit.log({
      action: "CABINET_SESSION_UPDATED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async startSession(id: string, actor: AuthenticatedUser) {
    const session = await this.getSession(id);
    if (session.status !== "SCHEDULED") {
      throw new BadRequestException("La session doit être planifiée pour démarrer");
    }

    return this.prisma.cabinetSession.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }

  async completeSession(id: string, actor: AuthenticatedUser) {
    const session = await this.getSession(id);
    if (!["SCHEDULED", "IN_PROGRESS"].includes(session.status)) {
      throw new BadRequestException("La session ne peut pas être terminée dans cet état");
    }

    const updated = await this.prisma.cabinetSession.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    void this.audit.log({
      action: "CABINET_SESSION_COMPLETED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async cancelSession(id: string, actor: AuthenticatedUser, reason?: string) {
    const session = await this.getSession(id);
    if (session.status === "COMPLETED") {
      throw new BadRequestException("Impossible d'annuler une session terminée");
    }

    const updated = await this.prisma.cabinetSession.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason ?? null },
    });

    void this.audit.log({
      action: "CABINET_SESSION_CANCELLED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  // ── Agenda ───────────────────────────────────────────────────────────────────

  async addAgendaItem(sessionId: string, actor: AuthenticatedUser, dto: CreateAgendaItemDto) {
    await this.getSession(sessionId);

    return this.prisma.cabinetAgendaItem.create({
      data: {
        sessionId,
        order: dto.order,
        title: dto.title,
        description: dto.description ?? null,
        presentedById: dto.presentedById ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        supportingDocs: dto.supportingDocs ?? [],
      },
      include: {
        presentedBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async updateAgendaItem(
    sessionId: string,
    itemId: string,
    actor: AuthenticatedUser,
    dto: UpdateAgendaItemDto,
  ) {
    const item = await this.prisma.cabinetAgendaItem.findFirst({
      where: { id: itemId, sessionId },
    });
    if (!item) throw new NotFoundException("Point de l'ordre du jour introuvable");

    return this.prisma.cabinetAgendaItem.update({
      where: { id: itemId },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.completed !== undefined && { completed: dto.completed }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteAgendaItem(sessionId: string, itemId: string, actor: AuthenticatedUser) {
    const item = await this.prisma.cabinetAgendaItem.findFirst({
      where: { id: itemId, sessionId },
    });
    if (!item) throw new NotFoundException("Point de l'ordre du jour introuvable");

    await this.prisma.cabinetAgendaItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  // ── Decisions ─────────────────────────────────────────────────────────────────

  async listDecisions(actor: AuthenticatedUser, query: DecisionQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status !== undefined) where["status"] = query.status;
    if (query.priority !== undefined) where["priority"] = query.priority;
    if (query.ministryId !== undefined) where["responsibleMinistryId"] = query.ministryId;
    if (query.search !== undefined) {
      where["OR"] = [
        { title: { contains: query.search, mode: "insensitive" } },
        { decisionNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.cabinetDecision.findMany({
      where,
      include: {
        session: { select: { id: true, sessionNumber: true, title: true, scheduledAt: true } },
        responsibleMinistry: { select: { id: true, name: true } },
        owner: { select: { id: true, displayName: true } },
        adoptedBy: { select: { id: true, displayName: true } },
        _count: { select: { implementations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.take ?? 50,
    });
  }

  async getDecision(id: string) {
    const decision = await this.prisma.cabinetDecision.findUnique({
      where: { id },
      include: {
        session: { select: { id: true, sessionNumber: true, title: true, scheduledAt: true } },
        agendaItem: { select: { id: true, title: true, order: true } },
        responsibleMinistry: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        adoptedBy: { select: { id: true, displayName: true } },
        implementations: {
          include: {
            assignedTo: { select: { id: true, displayName: true } },
            ministry: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!decision) throw new NotFoundException("Décision introuvable");
    return decision;
  }

  async createDecision(sessionId: string, actor: AuthenticatedUser, dto: CreateDecisionDto) {
    const session = await this.getSession(sessionId);

    // Auto-generate decision number: DEC-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await this.prisma.cabinetDecision.count({
      where: { decisionNumber: { startsWith: `DEC-${year}-` } },
    });
    const decisionNumber = `DEC-${year}-${String(count + 1).padStart(3, "0")}`;

    const decision = await this.prisma.cabinetDecision.create({
      data: {
        decisionNumber,
        sessionId,
        agendaItemId: dto.agendaItemId ?? null,
        title: dto.title,
        content: dto.content,
        priority: (dto.priority ?? "NORMAL") as never,
        responsibleMinistryId: dto.responsibleMinistryId ?? null,
        ownerId: dto.ownerId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        tags: dto.tags ?? [],
        createdById: actor.id,
      },
      include: {
        session: { select: { id: true, sessionNumber: true } },
        responsibleMinistry: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "CABINET_DECISION_CREATED" as never,
      userId: actor.id,
      entityId: decision.id,
      metadata: { decisionNumber, sessionId },
    });

    return decision;
  }

  async updateDecision(id: string, actor: AuthenticatedUser, dto: UpdateDecisionDto) {
    await this.getDecision(id);

    return this.prisma.cabinetDecision.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(dto.priority !== undefined && { priority: dto.priority as never }),
        ...(dto.responsibleMinistryId !== undefined && {
          responsibleMinistryId: dto.responsibleMinistryId,
        }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async adoptDecision(id: string, actor: AuthenticatedUser, voteDto: VoteDecisionDto) {
    const decision = await this.getDecision(id);
    if (decision.status === "ADOPTED") {
      throw new BadRequestException("Décision déjà adoptée");
    }

    const updated = await this.prisma.cabinetDecision.update({
      where: { id },
      data: {
        status: "ADOPTED",
        adoptedAt: new Date(),
        adoptedById: actor.id,
        votesFor: voteDto.votesFor,
        votesAgainst: voteDto.votesAgainst,
        abstentions: voteDto.abstentions,
        votingNotes: voteDto.votingNotes ?? null,
      },
    });

    void this.audit.log({
      action: "CABINET_DECISION_ADOPTED" as never,
      userId: actor.id,
      entityId: id,
      metadata: {
        votesFor: voteDto.votesFor,
        votesAgainst: voteDto.votesAgainst,
        abstentions: voteDto.abstentions,
      },
    });

    return updated;
  }

  async rejectDecision(id: string, actor: AuthenticatedUser) {
    await this.getDecision(id);

    const updated = await this.prisma.cabinetDecision.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    void this.audit.log({
      action: "CABINET_DECISION_REJECTED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  async deferDecision(id: string, actor: AuthenticatedUser) {
    await this.getDecision(id);

    const updated = await this.prisma.cabinetDecision.update({
      where: { id },
      data: { status: "DEFERRED" },
    });

    void this.audit.log({
      action: "CABINET_DECISION_DEFERRED" as never,
      userId: actor.id,
      entityId: id,
    });

    return updated;
  }

  // ── Decision Implementation ───────────────────────────────────────────────────

  async addImplementation(
    decisionId: string,
    actor: AuthenticatedUser,
    dto: CreateImplementationDto,
  ) {
    await this.getDecision(decisionId);

    const impl = await this.prisma.decisionImplementation.create({
      data: {
        decisionId,
        title: dto.title,
        description: dto.description ?? null,
        assignedToId: dto.assignedToId ?? null,
        ministryId: dto.ministryId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdById: actor.id,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true } },
        ministry: { select: { id: true, name: true } },
      },
    });

    void this.audit.log({
      action: "DECISION_IMPLEMENTATION_STARTED" as never,
      userId: actor.id,
      entityId: impl.id,
      metadata: { decisionId },
    });

    return impl;
  }

  async updateImplementation(
    decisionId: string,
    implId: string,
    actor: AuthenticatedUser,
    dto: UpdateImplementationDto,
  ) {
    const impl = await this.prisma.decisionImplementation.findFirst({
      where: { id: implId, decisionId },
    });
    if (!impl) throw new NotFoundException("Mise en œuvre introuvable");

    const updated = await this.prisma.decisionImplementation.update({
      where: { id: implId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(dto.progressPct !== undefined && { progressPct: dto.progressPct }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.evidence !== undefined && { evidence: dto.evidence }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status === "COMPLETED" && { completedAt: new Date() }),
      },
      include: {
        assignedTo: { select: { id: true, displayName: true } },
        ministry: { select: { id: true, name: true } },
      },
    });

    if (dto.status === "COMPLETED") {
      void this.audit.log({
        action: "DECISION_IMPLEMENTATION_COMPLETED" as never,
        userId: actor.id,
        entityId: implId,
      });
    } else {
      void this.audit.log({
        action: "DECISION_IMPLEMENTATION_UPDATED" as never,
        userId: actor.id,
        entityId: implId,
      });
    }

    return updated;
  }
}
