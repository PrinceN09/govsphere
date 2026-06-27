/**
 * Prinodia People — DTOs v1.3.0
 */

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

// ─── Enums (mirrors schema — cannot import from @prisma/client until generate runs) ───

export const ORG_NODE_TYPES = ["ORGANIZATION", "DIVISION", "DEPARTMENT", "TEAM", "CUSTOM"] as const;
export type OrgNodeTypeValue = (typeof ORG_NODE_TYPES)[number];

export const WORKLOAD_STATUSES = [
  "NOT_ASSIGNED",
  "AVAILABLE",
  "NORMAL",
  "BUSY",
  "OVERLOADED",
] as const;
export type WorkloadStatusValue = (typeof WORKLOAD_STATUSES)[number];

export const VACATION_STATUSES = [
  "VACATION",
  "SICK_LEAVE",
  "REMOTE",
  "OFFICE",
  "TRAVEL",
  "TRAINING",
] as const;
export type VacationStatusValue = (typeof VACATION_STATUSES)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"] as const;
export type SkillLevelValue = (typeof SKILL_LEVELS)[number];

export const SKILL_CATEGORIES = [
  "TECHNICAL",
  "DOMAIN",
  "SOFT",
  "LANGUAGE",
  "CERTIFICATION",
] as const;
export type SkillCategoryValue = (typeof SKILL_CATEGORIES)[number];

// ─── OrgNode DTOs ─────────────────────────────────────────────────────────────

export class CreateOrgNodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEnum(ORG_NODE_TYPES)
  type!: OrgNodeTypeValue;

  @IsString()
  organizationId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateOrgNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(ORG_NODE_TYPES)
  type?: OrgNodeTypeValue;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryOrgNodesDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsEnum(ORG_NODE_TYPES)
  type?: OrgNodeTypeValue;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── EmployeeProfile DTOs ─────────────────────────────────────────────────────

export class UpsertEmployeeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  officeLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeZone?: string;

  @IsOptional()
  workingHours?: Record<string, string[]>;

  @IsOptional()
  @IsString()
  orgNodeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryOrgNodeIds?: string[];

  @IsOptional()
  @IsEnum(WORKLOAD_STATUSES)
  workloadStatus?: WorkloadStatusValue;

  @IsOptional()
  @IsEnum(VACATION_STATUSES)
  vacationStatus?: VacationStatusValue;

  @IsOptional()
  vacationFrom?: string;

  @IsOptional()
  vacationUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  availabilityNote?: string;

  @IsOptional()
  @IsArray()
  languages?: Array<{ code: string; level: string }>;
}

export class AddSkillDto {
  @IsString()
  skillId!: string;

  @IsEnum(SKILL_LEVELS)
  level!: SkillLevelValue;
}

// ─── People directory query ───────────────────────────────────────────────────

export class QueryPeopleDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  orgNodeId?: string;

  @IsOptional()
  @IsEnum(WORKLOAD_STATUSES)
  workloadStatus?: WorkloadStatusValue;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ─── Skill DTOs ───────────────────────────────────────────────────────────────

export class CreateSkillDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsEnum(SKILL_CATEGORIES)
  category!: SkillCategoryValue;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class QuerySkillsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(SKILL_CATEGORIES)
  category?: SkillCategoryValue;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
