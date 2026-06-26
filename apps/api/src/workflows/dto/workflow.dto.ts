/**
 * Prinodia Workspace — Workflow & Approvals DTOs (v0.8.1)
 */

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

// ─── Local enum string unions (used until `prisma generate` runs on host) ─────
type WorkflowTrigger =
  | "MANUAL"
  | "DOCUMENT_CREATED"
  | "DOCUMENT_PUBLISHED"
  | "EMPLOYEE_TRANSFERRED"
  | "BUDGET_SUBMITTED"
  | "CONTRACT_UPLOADED"
  | "CUSTOM";
type WorkflowStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "REJECTED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";

// ─── Workflow Definitions ─────────────────────────────────────────────────────

export class StepDefinitionDto {
  @IsInt()
  @Min(0)
  order!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number;

  @IsOptional()
  @IsBoolean()
  allowDelegate?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEscalate?: boolean;

  @IsOptional()
  @IsBoolean()
  requireComment?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSign?: boolean;
}

export class CreateWorkflowDefinitionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum([
    "MANUAL",
    "DOCUMENT_CREATED",
    "DOCUMENT_PUBLISHED",
    "EMPLOYEE_TRANSFERRED",
    "BUDGET_SUBMITTED",
    "CONTRACT_UPLOADED",
    "CUSTOM",
  ])
  trigger?: WorkflowTrigger;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsArray()
  steps!: StepDefinitionDto[];
}

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  steps?: StepDefinitionDto[];
}

// ─── Workflow Instances ───────────────────────────────────────────────────────

export class StartWorkflowDto {
  @IsString()
  definitionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WorkflowQueryDto {
  @IsOptional()
  @IsEnum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "REJECTED"])
  status?: WorkflowStatus;

  @IsOptional()
  @IsString()
  initiatorId?: string;

  @IsOptional()
  @IsString()
  definitionId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

// ─── Approval Actions ─────────────────────────────────────────────────────────

export class ApproveStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  signDigitally?: boolean;
}

export class RejectStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

export class RequestChangesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

export class DelegateStepDto {
  @IsString()
  delegateTo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class EscalateStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReturnStepDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  targetStep?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

export class CancelWorkflowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export class AddWorkflowCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

// ─── Workflow Templates ───────────────────────────────────────────────────────

export class CreateWorkflowTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum([
    "MANUAL",
    "DOCUMENT_CREATED",
    "DOCUMENT_PUBLISHED",
    "EMPLOYEE_TRANSFERRED",
    "BUDGET_SUBMITTED",
    "CONTRACT_UPLOADED",
    "CUSTOM",
  ])
  trigger?: WorkflowTrigger;

  @IsArray()
  stepDefinitions!: StepDefinitionDto[];

  @IsOptional()
  @IsString()
  ministryId?: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  instanceId?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TaskQueryDto {
  @IsOptional()
  @IsEnum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  instanceId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class AddTaskCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;
}
