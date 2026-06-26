/**
 * Prinodia Workspace — MeetingsService (v0.9.0)
 *
 * Full meeting lifecycle: create → schedule → run → complete → minutes → action items.
 * Integrates with Task system, Workflow engine, and Audit platform.
 */

import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { QUEUES, NOTIFICATION_JOBS } from "../infrastructure/queue/queues";
import { PrismaService } from "../prisma/prisma.service";

import type { CalendarDb, MeetingRecord } from "./calendar-db.types";
import type {
  AddParticipantDto,
  CancelMeetingDto,
  CreateActionItemDto,
  CreateAgendaItemDto,
  CreateMeetingDto,
  CreateMinutesDto,
  MeetingQueryDto,
  RecordAttendanceDto,
  UpdateAgendaItemDto,
  UpdateMeetingDto,
  UpdateMinutesDto,
  UpdateRsvpDto,
} from "./dto/calendar.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";
import type { Queue } from "bull";

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUES.NOTIFICATION) private readonly notifQueue: Queue,
  ) {}

  private get db(): CalendarDb {
    return this.prisma as unknown as CalendarDb;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async listMeetings(actor: AuthenticatedUser, query: MeetingQueryDto) {
    const { status, meetingType, from, to, search, cursor, limit = 20 } = query;

    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { organizerId: actor.id },
        { participants: { some: { userId: actor.id } } },
        { event: { scope: "MINISTRY", ministryId: actor.ministryId } },
        { event: { scope: "NATIONAL" } },
      ],
    };

    if (status !== undefined) where["status"] = status;
    if (meetingType !== undefined) where["meetingType"] = meetingType;
    if (search !== undefined) where["title"] = { contains: search, mode: "insensitive" };
    if (from !== undefined || to !== undefined) {
      where["event"] = {
        startAt: {
          ...(from !== undefined ? { gte: new Date(from) } : {}),
          ...(to !== undefined ? { lte: new Date(to) } : {}),
        },
      };
    }

    const meetings = await this.db.meeting.findMany({
      where,
      include: {
        event: { select: { id: true, startAt: true, endAt: true, timezone: true, scope: true } },
        organizer: { select: { id: true, displayName: true, email: true } },
        room: { select: { id: true, name: true, location: true } },
        participants: {
          select: {
            id: true,
            role: true,
            rsvpStatus: true,
            user: { select: { id: true, displayName: true, email: true } },
          },
          take: 10,
        },
        _count: { select: { agendaItems: true, actionItems: true, participants: true } },
      },
      orderBy: { event: { startAt: "asc" } },
      ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      meetings,
      nextCursor:
        meetings.length === limit
          ? (meetings[meetings.length - 1] as MeetingRecord & { id: string }).id
          : null,
    };
  }

  async getMeeting(id: string, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({
      where: { id },
      include: {
        event: true,
        organizer: { select: { id: true, displayName: true, email: true } },
        room: true,
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
            delegatedTo: { select: { id: true, displayName: true, email: true } },
          },
          orderBy: { role: "asc" },
        },
        agendaItems: {
          include: { presenter: { select: { id: true, displayName: true, email: true } } },
          orderBy: { order: "asc" },
        },
        minutes: {
          include: {
            author: { select: { id: true, displayName: true, email: true } },
            publishedBy: { select: { id: true, displayName: true, email: true } },
          },
        },
        actionItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueAt: true,
                assignee: { select: { id: true, displayName: true, email: true } },
              },
            },
          },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, displayName: true } } },
        },
        _count: { select: { participants: true, agendaItems: true, actionItems: true } },
      },
    });

    if (!meeting || (meeting as MeetingRecord).deletedAt !== null)
      throw new NotFoundException("Réunion introuvable");

    const participantList = (
      meeting as unknown as MeetingRecord & { participants: Array<{ user: { id: string } }> }
    ).participants;
    const isParticipant = participantList.some((p) => p.user.id === actor.id);
    const isOrganizer = (meeting as MeetingRecord).organizerId === actor.id;
    const hasReadPerm = actor.permissions.includes("CALENDAR:READ");
    if (!isOrganizer && !isParticipant && !hasReadPerm)
      throw new ForbiddenException("Accès non autorisé");

    return meeting;
  }

  async createMeeting(dto: CreateMeetingDto, actor: AuthenticatedUser) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start)
      throw new BadRequestException("La date de fin doit être après la date de début");

    if (dto.roomId !== undefined) await this.assertRoomAvailable(dto.roomId, start, end);

    const result = await this.db.$transaction(async (tx) => {
      const event = await tx.calendarEvent.create({
        data: {
          title: dto.title,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.onlineMeetingUrl !== undefined ? { onlineMeetingUrl: dto.onlineMeetingUrl } : {}),
          startAt: start,
          endAt: end,
          timezone: dto.timezone ?? "Africa/Kinshasa",
          scope:
            dto.ministryId !== undefined
              ? "MINISTRY"
              : dto.departmentId !== undefined
                ? "DEPARTMENT"
                : "PERSONAL",
          classification: dto.classification ?? "INTERNAL",
          createdById: actor.id,
          ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
          ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
          ...(dto.provinceId !== undefined ? { provinceId: dto.provinceId } : {}),
        },
      });

      const meeting = await tx.meeting.create({
        data: {
          eventId: (event as { id: string }).id,
          title: dto.title,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.onlineMeetingUrl !== undefined ? { onlineMeetingUrl: dto.onlineMeetingUrl } : {}),
          meetingType: dto.meetingType ?? "REGULAR",
          classification: dto.classification ?? "INTERNAL",
          organizerId: actor.id,
          ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        },
      });

      await tx.meetingParticipant.create({
        data: {
          meetingId: (meeting as MeetingRecord & { id: string }).id,
          userId: actor.id,
          role: "ORGANIZER",
          rsvpStatus: "ACCEPTED",
          rsvpAt: new Date(),
        },
      });

      if (dto.participantIds?.length) {
        await tx.meetingParticipant.createMany({
          data: dto.participantIds
            .filter((uid) => uid !== actor.id)
            .map((userId) => ({
              meetingId: (meeting as MeetingRecord & { id: string }).id,
              userId,
              role: "REQUIRED" as const,
              rsvpStatus: "PENDING" as const,
            })),
          skipDuplicates: true,
        });
      }

      if (dto.roomId !== undefined) {
        await tx.roomBooking.create({
          data: {
            roomId: dto.roomId,
            bookedById: actor.id,
            startAt: start,
            endAt: end,
            purpose: dto.title,
            eventId: (event as { id: string }).id,
          },
        });
      }

      return { event, meeting };
    });

    void this.audit.log({
      action: "MEETING_CREATED" as AuditAction,
      userId: actor.id,
      entityId: (result.meeting as MeetingRecord & { id: string }).id,
      metadata: { title: dto.title, meetingType: dto.meetingType },
    });

    void this.notifQueue.add(NOTIFICATION_JOBS.IN_APP, {
      meetingId: (result.meeting as MeetingRecord & { id: string }).id,
      type: "MEETING_INVITATION",
      participantIds: dto.participantIds ?? [],
    });

    return result.meeting;
  }

  async updateMeeting(id: string, dto: UpdateMeetingDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!meeting || (meeting as MeetingRecord).deletedAt !== null)
      throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    const updatedMeeting = await this.db.$transaction(async (tx) => {
      if (dto.startAt !== undefined || dto.endAt !== undefined) {
        const existingEvent = (
          meeting as unknown as MeetingRecord & { event: { startAt: Date; endAt: Date } }
        ).event;
        const newStart = dto.startAt !== undefined ? new Date(dto.startAt) : existingEvent.startAt;
        const newEnd = dto.endAt !== undefined ? new Date(dto.endAt) : existingEvent.endAt;
        if (newEnd <= newStart)
          throw new BadRequestException("La date de fin doit être après la date de début");

        const roomId = dto.roomId ?? (meeting as MeetingRecord).roomId;
        if (roomId !== null && roomId !== undefined) {
          await this.assertRoomAvailable(roomId, newStart, newEnd, id);
        }

        await tx.calendarEvent.update({
          where: { id: (meeting as MeetingRecord).eventId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.location !== undefined ? { location: dto.location } : {}),
            ...(dto.startAt !== undefined ? { startAt: newStart } : {}),
            ...(dto.endAt !== undefined ? { endAt: newEnd } : {}),
          },
        });
      }

      return tx.meeting.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.onlineMeetingUrl !== undefined ? { onlineMeetingUrl: dto.onlineMeetingUrl } : {}),
          ...(dto.meetingType !== undefined ? { meetingType: dto.meetingType } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.classification !== undefined ? { classification: dto.classification } : {}),
          ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        },
      });
    });

    void this.audit.log({
      action: "MEETING_UPDATED" as AuditAction,
      userId: actor.id,
      entityId: id,
    });
    return updatedMeeting;
  }

  async cancelMeeting(id: string, dto: CancelMeetingDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id } });
    if (!meeting || (meeting as MeetingRecord).deletedAt !== null)
      throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    const updated = await this.db.meeting.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        ...(dto.reason !== undefined ? { cancelReason: dto.reason } : {}),
      },
    });

    await this.db.calendarEvent.update({
      where: { id: (meeting as MeetingRecord).eventId },
      data: { status: "CANCELLED" },
    });

    void this.audit.log({
      action: "MEETING_CANCELLED" as AuditAction,
      userId: actor.id,
      entityId: id,
      metadata: { reason: dto.reason },
    });
    return updated;
  }

  async completeMeeting(id: string, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id } });
    if (!meeting || (meeting as MeetingRecord).deletedAt !== null)
      throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    const updated = await this.db.meeting.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    void this.audit.log({
      action: "MEETING_COMPLETED" as AuditAction,
      userId: actor.id,
      entityId: id,
    });
    return updated;
  }

  // ── My Meetings ─────────────────────────────────────────────────────────────

  async myMeetings(actor: AuthenticatedUser, from?: string, to?: string) {
    return this.db.meeting.findMany({
      where: {
        deletedAt: null,
        participants: { some: { userId: actor.id } },
        ...(from !== undefined || to !== undefined
          ? {
              event: {
                startAt: {
                  ...(from !== undefined ? { gte: new Date(from) } : {}),
                  ...(to !== undefined ? { lte: new Date(to) } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        event: { select: { startAt: true, endAt: true, timezone: true } },
        organizer: { select: { id: true, displayName: true, email: true } },
        room: { select: { id: true, name: true } },
        participants: {
          where: { userId: actor.id },
          select: { rsvpStatus: true, role: true, attendanceStatus: true },
        },
        _count: { select: { participants: true, agendaItems: true } },
      },
      orderBy: { event: { startAt: "asc" } },
    });
  }

  // ── Participants ─────────────────────────────────────────────────────────────

  async addParticipant(meetingId: string, dto: AddParticipantDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting || (meeting as MeetingRecord).deletedAt !== null)
      throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    const participant = await this.db.meetingParticipant.create({
      data: {
        meetingId,
        userId: dto.userId,
        role: dto.role ?? "REQUIRED",
        rsvpStatus: "PENDING",
      },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    void this.audit.log({
      action: "MEETING_PARTICIPANT_INVITED" as AuditAction,
      userId: actor.id,
      entityId: meetingId,
      metadata: { participantId: dto.userId },
    });
    return participant;
  }

  async removeParticipant(meetingId: string, participantId: string, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    await this.db.meetingParticipant.delete({ where: { id: participantId } });
    return { success: true };
  }

  async updateRsvp(meetingId: string, dto: UpdateRsvpDto, actor: AuthenticatedUser) {
    const participant = await this.db.meetingParticipant.findFirst({
      where: { meetingId, userId: actor.id },
    });
    if (!participant) throw new NotFoundException("Participation introuvable");

    const updated = await this.db.meetingParticipant.update({
      where: { id: (participant as { id: string }).id },
      data: {
        rsvpStatus: dto.rsvpStatus,
        rsvpAt: new Date(),
        ...(dto.delegatedToId !== undefined ? { delegatedToId: dto.delegatedToId } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });

    const auditAction: AuditAction =
      dto.rsvpStatus === "ACCEPTED"
        ? ("MEETING_RSVP_ACCEPTED" as AuditAction)
        : dto.rsvpStatus === "DECLINED"
          ? ("MEETING_RSVP_DECLINED" as AuditAction)
          : ("MEETING_RSVP_DELEGATED" as AuditAction);
    void this.audit.log({ action: auditAction, userId: actor.id, entityId: meetingId });
    return updated;
  }

  async recordAttendance(meetingId: string, dto: RecordAttendanceDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    const updated = await this.db.meetingParticipant.update({
      where: { id: dto.participantId },
      data: { attendanceStatus: dto.attendanceStatus },
    });

    void this.audit.log({
      action: "MEETING_ATTENDANCE_RECORDED" as AuditAction,
      userId: actor.id,
      entityId: meetingId,
    });
    return updated;
  }

  // ── Agenda ──────────────────────────────────────────────────────────────────

  async listAgendaItems(meetingId: string) {
    return this.db.meetingAgendaItem.findMany({
      where: { meetingId },
      include: { presenter: { select: { id: true, displayName: true, email: true } } },
      orderBy: { order: "asc" },
    });
  }

  async addAgendaItem(meetingId: string, dto: CreateAgendaItemDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    return this.db.meetingAgendaItem.create({
      data: {
        meetingId,
        order: dto.order,
        title: dto.title,
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.presenterId !== undefined ? { presenterId: dto.presenterId } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        supportingDocs: dto.supportingDocs ?? [],
        ...(dto.expectedDecision !== undefined ? { expectedDecision: dto.expectedDecision } : {}),
      },
      include: { presenter: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async updateAgendaItem(
    meetingId: string,
    itemId: string,
    dto: UpdateAgendaItemDto,
    actor: AuthenticatedUser,
  ) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    return this.db.meetingAgendaItem.update({
      where: { id: itemId },
      data: {
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.presenterId !== undefined ? { presenterId: dto.presenterId } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async deleteAgendaItem(meetingId: string, itemId: string, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");
    this.assertOrganizer(meeting as MeetingRecord, actor);

    await this.db.meetingAgendaItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  // ── Minutes ──────────────────────────────────────────────────────────────────

  async createMinutes(meetingId: string, dto: CreateMinutesDto, actor: AuthenticatedUser) {
    const existing = await this.db.meetingMinutes.findUnique({ where: { meetingId } });
    if (existing) throw new ConflictException("Le compte-rendu existe déjà pour cette réunion");

    const minutes = await this.db.meetingMinutes.create({
      data: {
        meetingId,
        authorId: actor.id,
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
      },
    });

    void this.audit.log({
      action: "MEETING_MINUTES_CREATED" as AuditAction,
      userId: actor.id,
      entityId: meetingId,
    });
    return minutes;
  }

  async updateMinutes(meetingId: string, dto: UpdateMinutesDto, _actor: AuthenticatedUser) {
    const minutes = await this.db.meetingMinutes.findUnique({ where: { meetingId } });
    if (!minutes) throw new NotFoundException("Compte-rendu introuvable");

    return this.db.meetingMinutes.update({
      where: { meetingId },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
      },
    });
  }

  async publishMinutes(meetingId: string, actor: AuthenticatedUser) {
    const minutes = await this.db.meetingMinutes.findUnique({ where: { meetingId } });
    if (!minutes) throw new NotFoundException("Compte-rendu introuvable");
    if (!(minutes as { isDraft: boolean }).isDraft)
      throw new ConflictException("Le compte-rendu est déjà publié");

    const updated = await this.db.meetingMinutes.update({
      where: { meetingId },
      data: { isDraft: false, publishedAt: new Date(), publishedById: actor.id },
    });

    void this.audit.log({
      action: "MEETING_MINUTES_PUBLISHED" as AuditAction,
      userId: actor.id,
      entityId: meetingId,
    });
    return updated;
  }

  // ── Action Items ─────────────────────────────────────────────────────────────

  async createActionItem(meetingId: string, dto: CreateActionItemDto, actor: AuthenticatedUser) {
    const meeting = await this.db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable");

    const result = await this.db.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: dto.title,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
          createdById: actor.id,
          ...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
          priority: dto.priority ?? "MEDIUM",
        },
      });

      const actionItem = await tx.meetingActionItem.create({
        data: {
          meetingId,
          taskId: (task as { id: string }).id,
          ...(dto.agendaItemId !== undefined ? { agendaItemId: dto.agendaItemId } : {}),
          ...(dto.sourceNote !== undefined ? { sourceNote: dto.sourceNote } : {}),
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueAt: true,
              assignee: { select: { id: true, displayName: true, email: true } },
            },
          },
        },
      });

      return actionItem;
    });

    void this.audit.log({
      action: "MEETING_ACTION_ITEM_CREATED" as AuditAction,
      userId: actor.id,
      entityId: meetingId,
      metadata: { taskTitle: dto.title },
    });
    return result;
  }

  // ── Room availability ─────────────────────────────────────────────────────────

  private async assertRoomAvailable(
    roomId: string,
    startAt: Date,
    endAt: Date,
    _excludeMeetingId?: string,
  ) {
    const conflicting = await this.db.roomBooking.findFirst({
      where: {
        roomId,
        cancelledAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (conflicting) throw new ConflictException("La salle n'est pas disponible pour ce créneau");
  }

  private assertOrganizer(meeting: MeetingRecord, actor: AuthenticatedUser) {
    if (meeting.organizerId !== actor.id && !actor.permissions.includes("CALENDAR:MANAGE"))
      throw new ForbiddenException("Seul l'organisateur peut effectuer cette action");
  }
}
