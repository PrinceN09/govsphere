/**
 * Prinodia Meet v1.5.0 — DTOs
 */

import { Type } from "class-transformer";
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
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

// ─── Meeting Settings ─────────────────────────────────────────────────────────

export class UpdateMeetSettingsDto {
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  videoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  screenShareEnabled?: boolean;
}

// ─── Transfer Host ────────────────────────────────────────────────────────────

export class TransferHostDto {
  @IsString()
  newHostId!: string;
}

// ─── Emoji Reaction ───────────────────────────────────────────────────────────

export class MeetReactionDto {
  @IsString()
  @MaxLength(10)
  emoji!: string;
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

export class PollOptionDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class CreatePollDto {
  @IsString()
  @MaxLength(1000)
  question!: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options!: PollOptionDto[];
}

export class VotePollDto {
  @IsString()
  optionId!: string;
}

// ─── Breakout Room ────────────────────────────────────────────────────────────

export class CreateBreakoutRoomDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  capacity?: number;
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export class CreateSummaryDto {
  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsArray()
  decisions?: Array<{ text: string; madeBy?: string }>;

  @IsOptional()
  @IsArray()
  actionItems?: Array<{ text: string; assigneeId?: string; dueDate?: string }>;

  @IsOptional()
  @IsArray()
  keyPoints?: string[];

  @IsOptional()
  @IsString()
  nextSteps?: string;
}

// ─── Recording ────────────────────────────────────────────────────────────────

export class UpdateRecordingDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  storageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  filename?: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @IsOptional()
  @IsUrl()
  downloadUrl?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
