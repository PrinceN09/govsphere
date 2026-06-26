/**
 * Prinodia Workspace — CalendarService (v0.9.0)
 *
 * Manages calendar events across all scopes (Personal → National).
 * Timezone-aware. Recurring event support.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CalendarDb } from "./calendar-db.types";
import type {
  AddReminderDto,
  CreateEventDto,
  EventQueryDto,
  UpdateEventDto,
} from "./dto/calendar.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get db(): CalendarDb {
    return this.prisma as unknown as CalendarDb;
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  async listEvents(actor: AuthenticatedUser, query: EventQueryDto) {
    const { from, to, scope, ministryId, departmentId, provinceId, status } = query;

    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { createdById: actor.id },
        { scope: "MINISTRY", ministryId: actor.ministryId },
        { scope: "DEPARTMENT", departmentId: actor.departmentId },
        { scope: "NATIONAL" },
      ],
    };

    if (scope !== undefined) where["scope"] = scope;
    if (status !== undefined) where["status"] = status;
    if (ministryId !== undefined) where["ministryId"] = ministryId;
    if (departmentId !== undefined) where["departmentId"] = departmentId;
    if (provinceId !== undefined) where["provinceId"] = provinceId;
    if (from !== undefined || to !== undefined) {
      where["startAt"] = {
        ...(from !== undefined ? { gte: new Date(from) } : {}),
        ...(to !== undefined ? { lte: new Date(to) } : {}),
      };
    }

    return this.db.calendarEvent.findMany({
      where,
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
        meeting: { select: { id: true, status: true, meetingType: true } },
        recurringRule: true,
      },
      orderBy: { startAt: "asc" },
      take: 200,
    });
  }

  async getEvent(id: string, actor: AuthenticatedUser) {
    const event = await this.db.calendarEvent.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
        ministry: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        province: { select: { id: true, name: true } },
        recurringRule: true,
        instances: { select: { id: true, startAt: true, endAt: true, status: true }, take: 50 },
        meeting: {
          select: {
            id: true,
            status: true,
            meetingType: true,
            classification: true,
            organizer: { select: { id: true, displayName: true, email: true } },
            participants: {
              select: {
                id: true,
                role: true,
                rsvpStatus: true,
                user: { select: { id: true, displayName: true, email: true } },
              },
            },
          },
        },
        reminders: {
          where: { userId: actor.id },
          select: { id: true, minutesBefore: true, channel: true, sentAt: true },
        },
      },
    });

    if (!event || event.deletedAt !== null) throw new NotFoundException("Événement introuvable");
    return event;
  }

  async createEvent(dto: CreateEventDto, actor: AuthenticatedUser) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start)
      throw new BadRequestException("La date de fin doit être après la date de début");

    let recurringRuleId: string | undefined;
    if (dto.recurringRule) {
      const rule = await this.db.recurringRule.create({
        data: {
          frequency: dto.recurringRule.frequency,
          interval: dto.recurringRule.interval ?? 1,
          daysOfWeek: dto.recurringRule.daysOfWeek ?? [],
          ...(dto.recurringRule.dayOfMonth !== undefined
            ? { dayOfMonth: dto.recurringRule.dayOfMonth }
            : {}),
          ...(dto.recurringRule.monthOfYear !== undefined
            ? { monthOfYear: dto.recurringRule.monthOfYear }
            : {}),
          ...(dto.recurringRule.untilDate !== undefined
            ? { untilDate: new Date(dto.recurringRule.untilDate) }
            : {}),
          ...(dto.recurringRule.occurrences !== undefined
            ? { occurrences: dto.recurringRule.occurrences }
            : {}),
        },
      });
      recurringRuleId = rule.id;
    }

    const event = await this.db.calendarEvent.create({
      data: {
        title: dto.title,
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.onlineMeetingUrl !== undefined ? { onlineMeetingUrl: dto.onlineMeetingUrl } : {}),
        startAt: start,
        endAt: end,
        allDay: dto.allDay ?? false,
        timezone: dto.timezone ?? "Africa/Kinshasa",
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        scope: dto.scope ?? "PERSONAL",
        ...(dto.classification !== undefined ? { classification: dto.classification } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        createdById: actor.id,
        ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.divisionId !== undefined ? { divisionId: dto.divisionId } : {}),
        ...(dto.provinceId !== undefined ? { provinceId: dto.provinceId } : {}),
        ...(recurringRuleId !== undefined ? { recurringRuleId } : {}),
      },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
        recurringRule: true,
      },
    });

    void this.audit.log({
      action: "EVENT_CREATED" as AuditAction,
      userId: actor.id,
      entityId: (event as { id: string }).id,
      metadata: {
        title: (event as { title: string }).title,
        scope: (event as { scope: string }).scope,
      },
    });
    return event;
  }

  async updateEvent(id: string, dto: UpdateEventDto, actor: AuthenticatedUser) {
    const event = await this.db.calendarEvent.findUnique({ where: { id } });
    if (!event || event.deletedAt !== null) throw new NotFoundException("Événement introuvable");
    if (
      (event as { createdById: string }).createdById !== actor.id &&
      !actor.permissions.includes("CALENDAR:MANAGE")
    )
      throw new ForbiddenException("Accès non autorisé");

    const updated = await this.db.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.onlineMeetingUrl !== undefined ? { onlineMeetingUrl: dto.onlineMeetingUrl } : {}),
        ...(dto.startAt !== undefined ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
    });

    void this.audit.log({ action: "EVENT_UPDATED" as AuditAction, userId: actor.id, entityId: id });
    return updated;
  }

  async deleteEvent(id: string, actor: AuthenticatedUser) {
    const event = await this.db.calendarEvent.findUnique({ where: { id } });
    if (!event || event.deletedAt !== null) throw new NotFoundException("Événement introuvable");
    if (
      (event as { createdById: string }).createdById !== actor.id &&
      !actor.permissions.includes("CALENDAR:MANAGE")
    )
      throw new ForbiddenException("Accès non autorisé");

    await this.db.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    void this.audit.log({ action: "EVENT_DELETED" as AuditAction, userId: actor.id, entityId: id });
    return { success: true };
  }

  // ── Reminders ───────────────────────────────────────────────────────────────

  async addReminder(eventId: string, dto: AddReminderDto, actor: AuthenticatedUser) {
    const event = await this.db.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event || event.deletedAt !== null) throw new NotFoundException("Événement introuvable");

    return this.db.eventReminder.create({
      data: {
        eventId,
        userId: actor.id,
        minutesBefore: dto.minutesBefore,
        ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
      },
    });
  }

  async deleteReminder(reminderId: string, actor: AuthenticatedUser) {
    const reminder = await this.db.eventReminder.findUnique({ where: { id: reminderId } });
    if (!reminder) throw new NotFoundException("Rappel introuvable");
    if ((reminder as { userId: string }).userId !== actor.id)
      throw new ForbiddenException("Accès non autorisé");
    await this.db.eventReminder.delete({ where: { id: reminderId } });
    return { success: true };
  }

  // ── My Calendar ─────────────────────────────────────────────────────────────

  async myCalendar(actor: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    return this.db.calendarEvent.findMany({
      where: {
        deletedAt: null,
        startAt: { gte: start },
        endAt: { lte: end },
        OR: [
          { createdById: actor.id },
          { scope: "MINISTRY", ministryId: actor.ministryId },
          { scope: "DEPARTMENT", departmentId: actor.departmentId },
          { scope: "NATIONAL" },
          { meeting: { participants: { some: { userId: actor.id } } } },
        ],
      },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
        meeting: {
          select: {
            id: true,
            status: true,
            meetingType: true,
            participants: {
              where: { userId: actor.id },
              select: { rsvpStatus: true, role: true },
            },
          },
        },
      },
      orderBy: { startAt: "asc" },
    });
  }
}
