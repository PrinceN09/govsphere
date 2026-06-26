/**
 * Prinodia Workspace — Calendar & Meetings DTOs (v0.9.0)
 */

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from "class-validator";

import type {
  AttendanceStatus,
  CalendarScope,
  EventStatus,
  MeetingClassification,
  MeetingStatus,
  MeetingType,
  ParticipantRole,
  RecurrenceFrequency,
  ReminderChannel,
  ResourceType,
  RsvpStatus,
} from "../calendar-db.types";

// ─── Recurring Rule ───────────────────────────────────────────────────────────

export class RecurringRuleDto {
  @IsEnum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
  frequency!: RecurrenceFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @IsOptional()
  @IsISO8601()
  untilDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  occurrences?: number;
}

// ─── Calendar Event ───────────────────────────────────────────────────────────

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineMeetingUrl?: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(["TENTATIVE", "CONFIRMED", "CANCELLED"])
  status?: EventStatus;

  @IsOptional()
  @IsEnum(["PERSONAL", "TEAM", "DEPARTMENT", "MINISTRY", "PROVINCE", "NATIONAL"])
  scope?: CalendarScope;

  @IsOptional()
  @IsEnum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"])
  classification?: MeetingClassification;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  recurringRule?: RecurringRuleDto;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineMeetingUrl?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(["TENTATIVE", "CONFIRMED", "CANCELLED"])
  status?: EventStatus;

  @IsOptional()
  @IsString()
  color?: string;
}

export class EventQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(["PERSONAL", "TEAM", "DEPARTMENT", "MINISTRY", "PROVINCE", "NATIONAL"])
  scope?: CalendarScope;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsEnum(["TENTATIVE", "CONFIRMED", "CANCELLED"])
  status?: EventStatus;
}

// ─── Reminder ─────────────────────────────────────────────────────────────────

export class AddReminderDto {
  @IsInt()
  @Min(0)
  minutesBefore!: number;

  @IsOptional()
  @IsEnum(["IN_APP", "EMAIL", "SMS"])
  channel?: ReminderChannel;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export class CreateMeetingDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineMeetingUrl?: string;

  @IsOptional()
  @IsEnum([
    "REGULAR",
    "EMERGENCY",
    "CABINET",
    "MINISTERIAL",
    "COMMITTEE",
    "WORKING_GROUP",
    "BILATERAL",
    "TRILATERAL",
    "VIRTUAL",
    "HYBRID",
  ])
  meetingType?: MeetingType;

  @IsOptional()
  @IsEnum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"])
  classification?: MeetingClassification;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineMeetingUrl?: string;

  @IsOptional()
  @IsEnum([
    "REGULAR",
    "EMERGENCY",
    "CABINET",
    "MINISTERIAL",
    "COMMITTEE",
    "WORKING_GROUP",
    "BILATERAL",
    "TRILATERAL",
    "VIRTUAL",
    "HYBRID",
  ])
  meetingType?: MeetingType;

  @IsOptional()
  @IsEnum(["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"])
  status?: MeetingStatus;

  @IsOptional()
  @IsEnum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"])
  classification?: MeetingClassification;

  @IsOptional()
  @IsString()
  roomId?: string;
}

export class MeetingQueryDto {
  @IsOptional()
  @IsEnum(["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"])
  status?: MeetingStatus;

  @IsOptional()
  @IsEnum([
    "REGULAR",
    "EMERGENCY",
    "CABINET",
    "MINISTERIAL",
    "COMMITTEE",
    "WORKING_GROUP",
    "BILATERAL",
    "TRILATERAL",
    "VIRTUAL",
    "HYBRID",
  ])
  meetingType?: MeetingType;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CancelMeetingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Participants ─────────────────────────────────────────────────────────────

export class AddParticipantDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(["ORGANIZER", "REQUIRED", "OPTIONAL", "PRESENTER", "OBSERVER", "SECRETARY"])
  role?: ParticipantRole;
}

export class UpdateRsvpDto {
  @IsEnum(["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE", "DELEGATED"])
  rsvpStatus!: RsvpStatus;

  @IsOptional()
  @IsString()
  delegatedToId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordAttendanceDto {
  @IsString()
  participantId!: string;

  @IsEnum(["ABSENT", "PRESENT", "LATE", "EXCUSED", "DELEGATED"])
  attendanceStatus!: AttendanceStatus;
}

// ─── Agenda ───────────────────────────────────────────────────────────────────

export class CreateAgendaItemDto {
  @IsInt()
  @Min(1)
  order!: number;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  presenterId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingDocs?: string[];

  @IsOptional()
  @IsString()
  expectedDecision?: string;
}

export class UpdateAgendaItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  presenterId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Minutes ──────────────────────────────────────────────────────────────────

export class CreateMinutesDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class UpdateMinutesDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export class CreateActionItemDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsEnum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: string;

  @IsOptional()
  @IsString()
  agendaItemId?: string;

  @IsOptional()
  @IsString()
  sourceNote?: string;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(["MEETING_ROOM", "PROJECTOR", "VEHICLE", "FACILITY", "EQUIPMENT"])
  type?: ResourceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsString()
  ministryId?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RoomQueryDto {
  @IsOptional()
  @IsEnum(["MEETING_ROOM", "PROJECTOR", "VEHICLE", "FACILITY", "EQUIPMENT"])
  type?: ResourceType;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @IsOptional()
  @IsISO8601()
  availableTo?: string;
}

export class BookRoomDto {
  @IsString()
  roomId!: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
