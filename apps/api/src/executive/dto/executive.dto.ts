/**
 * Prinodia Workspace — ExecutiveModule DTOs (v1.0.0)
 */

import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ExecutiveOfficeTypeDto {
  PRESIDENCY = "PRESIDENCY",
  PRIME_MINISTER_OFFICE = "PRIME_MINISTER_OFFICE",
  CABINET_SECRETARIAT = "CABINET_SECRETARIAT",
  MINISTERIAL = "MINISTERIAL",
  DEPUTY_MINISTERIAL = "DEPUTY_MINISTERIAL",
  PERMANENT_SECRETARY_OFFICE = "PERMANENT_SECRETARY_OFFICE",
  CHIEF_OF_STAFF_OFFICE = "CHIEF_OF_STAFF_OFFICE",
  EXECUTIVE_ASSISTANT_OFFICE = "EXECUTIVE_ASSISTANT_OFFICE",
}

export enum CabinetSessionStatusDto {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum DecisionStatusDto {
  DRAFT = "DRAFT",
  UNDER_REVIEW = "UNDER_REVIEW",
  ADOPTED = "ADOPTED",
  REJECTED = "REJECTED",
  DEFERRED = "DEFERRED",
  WITHDRAWN = "WITHDRAWN",
}

export enum DecisionPriorityDto {
  URGENT = "URGENT",
  HIGH = "HIGH",
  NORMAL = "NORMAL",
  LOW = "LOW",
}

export enum ImplementationStatusDto {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE",
}

export enum BriefingTypeDto {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  CABINET = "CABINET",
  EMERGENCY = "EMERGENCY",
  SPECIAL = "SPECIAL",
}

export enum BriefingStatusDto {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  APPROVED = "APPROVED",
  DISTRIBUTED = "DISTRIBUTED",
}

export enum CorrespondenceTypeDto {
  OFFICIAL_LETTER = "OFFICIAL_LETTER",
  PRESIDENTIAL_DIRECTIVE = "PRESIDENTIAL_DIRECTIVE",
  MINISTERIAL_MEMO = "MINISTERIAL_MEMO",
  CABINET_CIRCULAR = "CABINET_CIRCULAR",
  EXECUTIVE_NOTE = "EXECUTIVE_NOTE",
  COMMUNIQUE = "COMMUNIQUE",
}

export enum CorrespondenceClassificationDto {
  PUBLIC = "PUBLIC",
  INTERNAL = "INTERNAL",
  CONFIDENTIAL = "CONFIDENTIAL",
  SECRET = "SECRET",
  TOP_SECRET = "TOP_SECRET",
}

export enum AnnouncementAudienceDto {
  ALL_STAFF = "ALL_STAFF",
  MINISTERS = "MINISTERS",
  DIRECTORS = "DIRECTORS",
  CABINET_MEMBERS = "CABINET_MEMBERS",
  SPECIFIC_MINISTRY = "SPECIFIC_MINISTRY",
  PUBLIC = "PUBLIC",
}

// ─── Executive Office DTOs ────────────────────────────────────────────────────

export class CreateExecutiveOfficeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsEnum(ExecutiveOfficeTypeDto)
  officeType!: ExecutiveOfficeTypeDto;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  headId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;
}

export class UpdateExecutiveOfficeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  headId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExecutiveOfficeQueryDto {
  @IsOptional()
  @IsEnum(ExecutiveOfficeTypeDto)
  officeType?: ExecutiveOfficeTypeDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  ministryId?: string;
}

// ─── Cabinet Session DTOs ─────────────────────────────────────────────────────

export class CreateCabinetSessionDto {
  @IsInt()
  @Min(1)
  sessionNumber!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  secretaryId?: string;

  @IsOptional()
  @IsString()
  meetingId?: string;
}

export class UpdateCabinetSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  secretaryId?: string;

  @IsOptional()
  @IsEnum(CabinetSessionStatusDto)
  status?: CabinetSessionStatusDto;
}

export class CabinetSessionQueryDto {
  @IsOptional()
  @IsEnum(CabinetSessionStatusDto)
  status?: CabinetSessionStatusDto;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class CreateAgendaItemDto {
  @IsInt()
  @Min(1)
  order!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  presentedById?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingDocs?: string[];
}

export class UpdateAgendaItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Cabinet Decision DTOs ────────────────────────────────────────────────────

export class CreateDecisionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsEnum(DecisionPriorityDto)
  priority?: DecisionPriorityDto;

  @IsOptional()
  @IsString()
  agendaItemId?: string;

  @IsOptional()
  @IsString()
  responsibleMinistryId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(DecisionStatusDto)
  status?: DecisionStatusDto;

  @IsOptional()
  @IsEnum(DecisionPriorityDto)
  priority?: DecisionPriorityDto;

  @IsOptional()
  @IsString()
  responsibleMinistryId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class VoteDecisionDto {
  @IsInt()
  @Min(0)
  votesFor!: number;

  @IsInt()
  @Min(0)
  votesAgainst!: number;

  @IsInt()
  @Min(0)
  abstentions!: number;

  @IsOptional()
  @IsString()
  votingNotes?: string;
}

export class DecisionQueryDto {
  @IsOptional()
  @IsEnum(DecisionStatusDto)
  status?: DecisionStatusDto;

  @IsOptional()
  @IsEnum(DecisionPriorityDto)
  priority?: DecisionPriorityDto;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

// ─── Decision Implementation DTOs ─────────────────────────────────────────────

export class CreateImplementationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateImplementationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ImplementationStatusDto)
  status?: ImplementationStatusDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Briefing DTOs ────────────────────────────────────────────────────────────

export class CreateBriefingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsEnum(BriefingTypeDto)
  briefingType!: BriefingTypeDto;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meetingRefs?: string[];
}

export class UpdateBriefingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsEnum(BriefingStatusDto)
  status?: BriefingStatusDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class BriefingQueryDto {
  @IsOptional()
  @IsEnum(BriefingTypeDto)
  briefingType?: BriefingTypeDto;

  @IsOptional()
  @IsEnum(BriefingStatusDto)
  status?: BriefingStatusDto;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

// ─── Correspondence DTOs ──────────────────────────────────────────────────────

export class CreateCorrespondenceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  subject!: string;

  @IsEnum(CorrespondenceTypeDto)
  correspondenceType!: CorrespondenceTypeDto;

  @IsOptional()
  @IsEnum(CorrespondenceClassificationDto)
  classification?: CorrespondenceClassificationDto;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  fromOfficeId?: string;

  @IsOptional()
  @IsString()
  toMinistryId?: string;

  @IsOptional()
  @IsString()
  toUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  toExternal?: string;

  @IsOptional()
  @IsString()
  parentCorrespondenceId?: string;
}

export class UpdateCorrespondenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(CorrespondenceClassificationDto)
  classification?: CorrespondenceClassificationDto;
}

export class CorrespondenceQueryDto {
  @IsOptional()
  @IsEnum(CorrespondenceTypeDto)
  correspondenceType?: CorrespondenceTypeDto;

  @IsOptional()
  @IsEnum(CorrespondenceClassificationDto)
  classification?: CorrespondenceClassificationDto;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

// ─── Announcement DTOs ────────────────────────────────────────────────────────

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsEnum(AnnouncementAudienceDto)
  audience?: AnnouncementAudienceDto;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  targetMinistryId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(AnnouncementAudienceDto)
  audience?: AnnouncementAudienceDto;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class AnnouncementQueryDto {
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(AnnouncementAudienceDto)
  audience?: AnnouncementAudienceDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
