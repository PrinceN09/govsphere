/**
 * Prinodia Workspace — Workflow Web Types (v0.8.1)
 * Shared types for the workflow UI layer.
 */

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

// ─── Workflow Template ────────────────────────────────────────────────────────

export interface WorkflowStepDefinition {
  order: number;
  name: string;
  description: string;
  durationHours: number;
  allowDelegate: boolean;
  allowEscalate: boolean;
  requireComment: boolean;
  requireSign: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  trigger: string;
  stepDefinitions: WorkflowStepDefinition[];
  isSystem: boolean;
  createdAt: string;
  ministry: { id: string; name: string } | null;
}

// ─── Workflow Definition ──────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string | null;
  durationHours: number | null;
  allowDelegate: boolean;
  allowEscalate: boolean;
  requireComment: boolean;
  requireSign: boolean;
  assigneeId: string | null;
  roleId: string | null;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  createdAt: string;
  ministry: { id: string; name: string } | null;
  steps?: WorkflowStep[];
  template?: { id: string; name: string } | null;
  createdBy?: { id: string; displayName: string | null } | null;
  _count?: { steps: number; instances: number };
}

// ─── Workflow Instance ────────────────────────────────────────────────────────

export interface WorkflowAssignment {
  id: string;
  stepOrder: number;
  status: StepStatus;
  dueAt: string | null;
  assignee: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

export interface WorkflowApproval {
  id: string;
  decision: ApprovalDecision;
  comment: string | null;
  stepOrder: number;
  decidedAt: string;
  approver: {
    id: string;
    displayName: string | null;
    email: string;
  };
  delegatedTo?: {
    id: string;
    displayName: string | null;
    email: string;
  } | null;
}

export interface WorkflowComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

export interface DigitalSignature {
  id: string;
  signedAt: string;
  revokedAt: string | null;
  stepOrder?: number;
  qrToken: string;
  signer: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

export interface WorkflowHistory {
  id: string;
  action: string;
  stepOrder: number | null;
  detail: string | null;
  createdAt: string;
  actor: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

export interface WorkflowInstance {
  id: string;
  title: string;
  description: string | null;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  dueAt: string | null;
  createdAt: string;
  definition: {
    id: string;
    title: string;
    trigger: string;
  };
  initiator: {
    id: string;
    displayName: string | null;
    email: string;
  };
  assignments?: WorkflowAssignment[];
  approvals?: WorkflowApproval[];
  comments?: WorkflowComment[];
  signatures?: DigitalSignature[];
  history?: WorkflowHistory[];
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: {
    id: string;
    displayName: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    displayName: string | null;
    email: string;
  };
  instance?: {
    id: string;
    title: string;
  } | null;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "En cours",
  PAUSED: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  REJECTED: "Rejeté",
};

export const WORKFLOW_STATUS_COLOR: Record<WorkflowStatus, string> = {
  DRAFT: "bg-navy-700 text-navy-300",
  ACTIVE: "bg-blue-900/50 text-blue-300",
  PAUSED: "bg-yellow-900/50 text-yellow-300",
  COMPLETED: "bg-green-900/50 text-green-300",
  CANCELLED: "bg-navy-800 text-navy-400",
  REJECTED: "bg-red-900/50 text-red-300",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  SKIPPED: "Ignoré",
  RETURNED: "Retourné",
  DELEGATED: "Délégué",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  BLOCKED: "Bloqué",
  IN_REVIEW: "En revue",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "bg-navy-700 text-navy-300",
  IN_PROGRESS: "bg-blue-900/50 text-blue-300",
  BLOCKED: "bg-red-900/50 text-red-300",
  IN_REVIEW: "bg-yellow-900/50 text-yellow-300",
  DONE: "bg-green-900/50 text-green-300",
  CANCELLED: "bg-navy-800 text-navy-400",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "bg-navy-700 text-navy-400",
  MEDIUM: "bg-blue-900/40 text-blue-300",
  HIGH: "bg-orange-900/50 text-orange-300",
  URGENT: "bg-red-900/50 text-red-300",
};

export const DECISION_LABELS: Record<ApprovalDecision, string> = {
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  REQUEST_CHANGES: "Modifications demandées",
  DELEGATED: "Délégué",
  ESCALATED: "Escaladé",
};

export const DECISION_COLOR: Record<ApprovalDecision, string> = {
  APPROVED: "bg-green-900/50 text-green-300",
  REJECTED: "bg-red-900/50 text-red-300",
  REQUEST_CHANGES: "bg-yellow-900/50 text-yellow-300",
  DELEGATED: "bg-blue-900/50 text-blue-300",
  ESCALATED: "bg-purple-900/50 text-purple-300",
};
