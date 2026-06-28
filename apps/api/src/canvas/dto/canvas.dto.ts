/**
 * Prinodia Canvas v1.6.0 — DTOs
 */

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CanvasBoardType {
  WHITEBOARD = "WHITEBOARD",
  MEETING_BOARD = "MEETING_BOARD",
  PROJECT_BOARD = "PROJECT_BOARD",
  DOCUMENT_BOARD = "DOCUMENT_BOARD",
  WORKFLOW_BOARD = "WORKFLOW_BOARD",
  CODE_BOARD = "CODE_BOARD",
  DIAGRAM_BOARD = "DIAGRAM_BOARD",
  BRAINSTORM_BOARD = "BRAINSTORM_BOARD",
}

export enum CanvasParticipantRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  PRESENTER = "PRESENTER",
  VIEWER = "VIEWER",
}

export enum CanvasElementType {
  PENCIL_STROKE = "PENCIL_STROKE",
  HIGHLIGHTER_STROKE = "HIGHLIGHTER_STROKE",
  TEXT = "TEXT",
  STICKY_NOTE = "STICKY_NOTE",
  SHAPE = "SHAPE",
  CONNECTOR = "CONNECTOR",
  ARROW = "ARROW",
  IMAGE = "IMAGE",
  PDF = "PDF",
  DOCUMENT_LINK = "DOCUMENT_LINK",
  CODE_BLOCK = "CODE_BLOCK",
  TABLE = "TABLE",
  MIND_MAP_NODE = "MIND_MAP_NODE",
  FLOWCHART_NODE = "FLOWCHART_NODE",
  COMMENT_PIN = "COMMENT_PIN",
  LASER_POINTER = "LASER_POINTER",
  SCREEN_ANNOTATION = "SCREEN_ANNOTATION",
}

export enum CanvasExportFormat {
  PNG = "PNG",
  PDF = "PDF",
  SVG = "SVG",
  JSON = "JSON",
}

export enum CanvasShareAccess {
  VIEW = "VIEW",
  EDIT = "EDIT",
}

// ─── Board DTOs ───────────────────────────────────────────────────────────────

export class CreateBoardDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CanvasBoardType)
  boardType?: CanvasBoardType;

  @IsOptional()
  @IsString()
  meetingId?: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  background?: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  background?: string;

  @IsOptional()
  viewportState?: Record<string, unknown>;
}

// ─── Element DTOs ─────────────────────────────────────────────────────────────

export class CreateElementDto {
  @IsEnum(CanvasElementType)
  elementType!: CanvasElementType;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsInt()
  layerIndex?: number;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsOptional()
  style?: Record<string, unknown>;
}

export class UpdateElementDto {
  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsInt()
  layerIndex?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsOptional()
  style?: Record<string, unknown>;
}

// ─── Participant DTOs ─────────────────────────────────────────────────────────

export class AddParticipantDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(CanvasParticipantRole)
  role?: CanvasParticipantRole;
}

export class UpdateParticipantRoleDto {
  @IsEnum(CanvasParticipantRole)
  role!: CanvasParticipantRole;
}

// ─── Comment DTOs ─────────────────────────────────────────────────────────────

export class CreateCommentDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  elementId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  posX?: number;

  @IsOptional()
  @IsNumber()
  posY?: number;
}

// ─── Export DTOs ──────────────────────────────────────────────────────────────

export class CreateExportDto {
  @IsEnum(CanvasExportFormat)
  format!: CanvasExportFormat;

  @IsOptional()
  @IsString()
  pageRange?: string;

  @IsOptional()
  options?: Record<string, unknown>;
}

// ─── Share DTOs ───────────────────────────────────────────────────────────────

export class CreateShareDto {
  @IsOptional()
  @IsEnum(CanvasShareAccess)
  access?: CanvasShareAccess;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date string

  @IsOptional()
  @IsString()
  password?: string;
}

// ─── From-meeting / from-chat DTOs ───────────────────────────────────────────

export class CreateFromMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(CanvasBoardType)
  boardType?: CanvasBoardType;
}

export class CreateFromChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(CanvasBoardType)
  boardType?: CanvasBoardType;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
