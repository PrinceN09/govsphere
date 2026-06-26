/**
 * Prinodia Workspace — Workflow Prisma Type Shim (v0.8.1)
 *
 * Provides typed delegate interfaces for the new workflow models so that
 * the API compiles before the user runs `npx prisma generate` on the host.
 * Once prisma generate runs, PrismaService will natively expose all of these
 * through its inherited PrismaClient type — this file can then be removed.
 *
 * Rules: no `any`, all fields are typed explicitly.
 */

// ─── Enum string unions ───────────────────────────────────────────────────────

export type WorkflowStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type StepStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "SKIPPED"
  | "RETURNED"
  | "DELEGATED";
export type ApprovalDecision =
  | "APPROVED"
  | "REJECTED"
  | "REQUEST_CHANGES"
  | "DELEGATED"
  | "ESCALATED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkflowTrigger =
  | "MANUAL"
  | "DOCUMENT_CREATED"
  | "DOCUMENT_PUBLISHED"
  | "EMPLOYEE_TRANSFERRED"
  | "BUDGET_SUBMITTED"
  | "CONTRACT_UPLOADED"
  | "CUSTOM";

// ─── Base record types ────────────────────────────────────────────────────────

export interface WorkflowTemplateRecord {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  trigger: WorkflowTrigger;
  stepDefinitions: unknown;
  isSystem: boolean;
  isActive: boolean;
  ministryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinitionRecord {
  id: string;
  title: string;
  description: string | null;
  templateId: string | null;
  trigger: WorkflowTrigger;
  isActive: boolean;
  ministryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStepRecord {
  id: string;
  definitionId: string;
  order: number;
  name: string;
  description: string | null;
  roleId: string | null;
  assigneeId: string | null;
  durationHours: number | null;
  allowDelegate: boolean;
  allowEscalate: boolean;
  requireComment: boolean;
  requireSign: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstanceRecord {
  id: string;
  definitionId: string;
  title: string;
  description: string | null;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  initiatorId: string;
  documentId: string | null;
  metadata: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
  dueAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAssignmentRecord {
  id: string;
  instanceId: string;
  stepId: string;
  assigneeId: string;
  stepOrder: number;
  status: StepStatus;
  dueAt: Date | null;
  notifiedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowApprovalRecord {
  id: string;
  instanceId: string;
  assignmentId: string;
  approverId: string;
  decision: ApprovalDecision;
  comment: string | null;
  delegatedToId: string | null;
  stepOrder: number;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCommentRecord {
  id: string;
  instanceId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  isInternal: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowHistoryRecord {
  id: string;
  instanceId: string;
  actorId: string;
  action: string;
  stepOrder: number | null;
  detail: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface DigitalSignatureRecord {
  id: string;
  instanceId: string;
  approvalId: string | null;
  signerId: string;
  signedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  certificateRef: string | null;
  qrToken: string;
  revokedAt: Date | null;
  revokedById: string | null;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  createdById: string;
  instanceId: string | null;
  documentId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  deletedAt: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Minimal delegate interfaces ──────────────────────────────────────────────
// Only the operations actually used in this module.

export interface WorkflowTemplateDelegate {
  findMany(args: {
    where?: Partial<WorkflowTemplateRecord> & {
      OR?: Array<Partial<WorkflowTemplateRecord>>;
      isActive?: boolean;
    };
    select?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<WorkflowTemplateRecord[]>;
  findUnique(args: {
    where: { id?: string; slug?: string };
  }): Promise<WorkflowTemplateRecord | null>;
  create(args: {
    data: Omit<WorkflowTemplateRecord, "id" | "createdAt" | "updatedAt"> & { id?: string };
  }): Promise<WorkflowTemplateRecord>;
}

export interface WorkflowDefinitionDelegate {
  findMany(args: {
    where?: {
      isActive?: boolean;
      ministryId?: string | null;
      OR?: Array<{ ministryId?: string | null }>;
    };
    select?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<WorkflowDefinitionRecord[]>;
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<(WorkflowDefinitionRecord & { steps?: WorkflowStepRecord[] }) | null>;
  create(args: { data: Record<string, unknown> }): Promise<WorkflowDefinitionRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<WorkflowDefinitionRecord>;
}

export interface WorkflowStepDelegate {
  createMany(args: { data: Array<Record<string, unknown>> }): Promise<{ count: number }>;
}

export interface WorkflowInstanceDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    take?: number;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<WorkflowInstanceRecord[]>;
  findUnique(args: {
    where: { id: string };
    select?: Record<string, unknown>;
  }): Promise<WorkflowInstanceRecord | null>;
  create(args: { data: Record<string, unknown> }): Promise<WorkflowInstanceRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<WorkflowInstanceRecord>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

export interface WorkflowAssignmentDelegate {
  findFirst(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<
    | (WorkflowAssignmentRecord & {
        step: WorkflowStepRecord & {
          definition: WorkflowDefinitionRecord & { steps: WorkflowStepRecord[] };
        };
        instance: WorkflowInstanceRecord;
      })
    | null
  >;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<WorkflowAssignmentRecord[]>;
  create(args: { data: Record<string, unknown> }): Promise<WorkflowAssignmentRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<WorkflowAssignmentRecord>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

export interface WorkflowApprovalDelegate {
  create(args: { data: Record<string, unknown> }): Promise<WorkflowApprovalRecord>;
}

export interface WorkflowCommentDelegate {
  create(args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<WorkflowCommentRecord>;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<WorkflowCommentRecord[]>;
}

export interface WorkflowHistoryDelegate {
  create(args: { data: Record<string, unknown> }): Promise<WorkflowHistoryRecord>;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<WorkflowHistoryRecord[]>;
}

export interface DigitalSignatureDelegate {
  create(args: { data: Record<string, unknown> }): Promise<DigitalSignatureRecord>;
  findUnique(args: {
    where: { id?: string; qrToken?: string };
    include?: Record<string, unknown>;
  }): Promise<DigitalSignatureRecord | null>;
  findMany(args: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<DigitalSignatureRecord[]>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<DigitalSignatureRecord>;
}

export interface TaskDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    take?: number;
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TaskRecord[]>;
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<TaskRecord | null>;
  create(args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<TaskRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<TaskRecord>;
}

export interface TaskCommentDelegate {
  create(args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<TaskCommentRecord>;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<TaskCommentRecord[]>;
}

// ─── Augmented PrismaService interface ───────────────────────────────────────

export interface WorkflowDb {
  workflowTemplate: WorkflowTemplateDelegate;
  workflowDefinition: WorkflowDefinitionDelegate;
  workflowStep: WorkflowStepDelegate;
  workflowInstance: WorkflowInstanceDelegate;
  workflowAssignment: WorkflowAssignmentDelegate;
  workflowApproval: WorkflowApprovalDelegate;
  workflowComment: WorkflowCommentDelegate;
  workflowHistory: WorkflowHistoryDelegate;
  digitalSignature: DigitalSignatureDelegate;
  task: TaskDelegate;
  taskComment: TaskCommentDelegate;
  // Pass-through the existing $transaction method from PrismaClient
  $transaction<T>(fn: (tx: WorkflowDb) => Promise<T>): Promise<T>;
  user: {
    findUnique(args: {
      where: { id: string };
      select?: Record<string, unknown>;
    }): Promise<{ id: string; displayName: string | null; email: string } | null>;
  };
}
