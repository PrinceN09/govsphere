/**
 * Prinodia Workspace — Executive Office & Cabinet Management types (v1.0.0)
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ExecutiveOfficeType =
  | "PRESIDENCY"
  | "PRIME_MINISTER_OFFICE"
  | "CABINET_SECRETARIAT"
  | "MINISTERIAL"
  | "DEPUTY_MINISTERIAL"
  | "PERMANENT_SECRETARY_OFFICE"
  | "CHIEF_OF_STAFF_OFFICE"
  | "EXECUTIVE_ASSISTANT_OFFICE";

export type CabinetSessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type DecisionStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "ADOPTED"
  | "REJECTED"
  | "DEFERRED"
  | "WITHDRAWN";

export type DecisionPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export type ImplementationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "OVERDUE";

export type BriefingType = "DAILY" | "WEEKLY" | "CABINET" | "EMERGENCY" | "SPECIAL";

export type BriefingStatus = "DRAFT" | "REVIEW" | "APPROVED" | "DISTRIBUTED";

export type CorrespondenceType =
  | "OFFICIAL_LETTER"
  | "PRESIDENTIAL_DIRECTIVE"
  | "MINISTERIAL_MEMO"
  | "CABINET_CIRCULAR"
  | "EXECUTIVE_NOTE"
  | "COMMUNIQUE";

export type CorrespondenceClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export type AnnouncementAudience =
  | "ALL_STAFF"
  | "MINISTERS"
  | "DIRECTORS"
  | "CABINET_MEMBERS"
  | "SPECIFIC_MINISTRY"
  | "PUBLIC";

// ─── Entity interfaces ────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  displayName: string | null;
  email?: string;
  avatarUrl?: string | null;
}

export interface MinistryRef {
  id: string;
  name: string;
  code?: string;
}

export interface ExecutiveOffice {
  id: string;
  name: string;
  officeType: ExecutiveOfficeType;
  code: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  headId: string | null;
  head: UserRef | null;
  ministryId: string | null;
  ministry: MinistryRef | null;
  _count?: { staff: number };
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveOfficeStaff {
  id: string;
  officeId: string;
  userId: string;
  user: UserRef;
  title: string | null;
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
}

export interface CabinetAgendaItem {
  id: string;
  sessionId: string;
  order: number;
  title: string;
  description: string | null;
  presentedById: string | null;
  presentedBy: UserRef | null;
  durationMinutes: number | null;
  supportingDocs: string[];
  completed: boolean;
  notes: string | null;
  decisions?: { id: string; decisionNumber: string; title: string; status: DecisionStatus }[];
  createdAt: string;
}

export interface CabinetSession {
  id: string;
  sessionNumber: number;
  title: string;
  description: string | null;
  status: CabinetSessionStatus;
  location: string | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  chairId: string;
  chair: UserRef;
  secretary: UserRef | null;
  meetingId: string | null;
  agendaItems?: CabinetAgendaItem[];
  decisions?: CabinetDecision[];
  _count?: { agendaItems: number; decisions: number };
  createdAt: string;
}

export interface DecisionImplementation {
  id: string;
  decisionId: string;
  title: string;
  description: string | null;
  status: ImplementationStatus;
  progressPct: number;
  assignedToId: string | null;
  assignedTo: UserRef | null;
  ministryId: string | null;
  ministry: MinistryRef | null;
  dueDate: string | null;
  completedAt: string | null;
  evidence: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CabinetDecision {
  id: string;
  decisionNumber: string;
  sessionId: string;
  session?: { id: string; sessionNumber: number; title: string; scheduledAt: string };
  agendaItemId: string | null;
  agendaItem?: { id: string; title: string; order: number } | null;
  title: string;
  content: string;
  status: DecisionStatus;
  priority: DecisionPriority;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  votingNotes: string | null;
  responsibleMinistryId: string | null;
  responsibleMinistry: MinistryRef | null;
  ownerId: string | null;
  owner: UserRef | null;
  dueDate: string | null;
  adoptedAt: string | null;
  adoptedById: string | null;
  adoptedBy: UserRef | null;
  implementations?: DecisionImplementation[];
  _count?: { implementations: number };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveBriefing {
  id: string;
  title: string;
  briefingType: BriefingType;
  status: BriefingStatus;
  content: Record<string, unknown>;
  summary: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  approvedAt: string | null;
  officeId: string | null;
  office: { id: string; name: string; officeType: ExecutiveOfficeType } | null;
  authorId: string;
  author: UserRef;
  approvedById: string | null;
  approvedBy: UserRef | null;
  attachments: string[];
  meetingRefs: string[];
  versionHistory: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveCorrespondence {
  id: string;
  referenceNumber: string;
  subject: string;
  correspondenceType: CorrespondenceType;
  classification: CorrespondenceClassification;
  content: Record<string, unknown>;
  summary: string | null;
  fromOfficeId: string | null;
  fromOffice: { id: string; name: string; officeType: ExecutiveOfficeType } | null;
  fromUserId: string;
  fromUser: UserRef;
  toMinistryId: string | null;
  toMinistry: MinistryRef | null;
  toUserId: string | null;
  toUser: UserRef | null;
  toExternal: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  acknowledgedAt: string | null;
  parentCorrespondenceId: string | null;
  parentCorrespondence?: { id: string; referenceNumber: string; subject: string } | null;
  replies?: {
    id: string;
    referenceNumber: string;
    subject: string;
    sentAt: string | null;
    fromUser: UserRef;
  }[];
  _count?: { replies: number };
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveAnnouncement {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  isPublished: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  officeId: string | null;
  office: { id: string; name: string; officeType: ExecutiveOfficeType } | null;
  authorId: string;
  author: UserRef;
  targetMinistryId: string | null;
  targetMinistry: MinistryRef | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const OFFICE_TYPE_LABELS: Record<ExecutiveOfficeType, string> = {
  PRESIDENCY: "Présidence",
  PRIME_MINISTER_OFFICE: "Cabinet du Premier Ministre",
  CABINET_SECRETARIAT: "Secrétariat du Conseil des Ministres",
  MINISTERIAL: "Cabinet Ministériel",
  DEPUTY_MINISTERIAL: "Cabinet Vice-Ministériel",
  PERMANENT_SECRETARY_OFFICE: "Secrétariat Général",
  CHIEF_OF_STAFF_OFFICE: "Cabinet Directeur de Cabinet",
  EXECUTIVE_ASSISTANT_OFFICE: "Bureau Adjoint de Direction",
};

export const SESSION_STATUS_LABELS: Record<CabinetSessionStatus, string> = {
  SCHEDULED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const SESSION_STATUS_COLOR: Record<CabinetSessionStatus, string> = {
  SCHEDULED: "bg-blue-900/40 text-blue-300 border border-blue-800",
  IN_PROGRESS: "bg-emerald-900/40 text-emerald-300 border border-emerald-800",
  COMPLETED: "bg-navy-700 text-navy-300 border border-navy-600",
  CANCELLED: "bg-red-900/40 text-red-300 border border-red-800",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  DRAFT: "Brouillon",
  UNDER_REVIEW: "En révision",
  ADOPTED: "Adoptée",
  REJECTED: "Rejetée",
  DEFERRED: "Reportée",
  WITHDRAWN: "Retirée",
};

export const DECISION_STATUS_COLOR: Record<DecisionStatus, string> = {
  DRAFT: "bg-navy-700 text-navy-300 border border-navy-600",
  UNDER_REVIEW: "bg-amber-900/40 text-amber-300 border border-amber-800",
  ADOPTED: "bg-emerald-900/40 text-emerald-300 border border-emerald-800",
  REJECTED: "bg-red-900/40 text-red-300 border border-red-800",
  DEFERRED: "bg-purple-900/40 text-purple-300 border border-purple-800",
  WITHDRAWN: "bg-navy-800 text-navy-400 border border-navy-700",
};

export const DECISION_PRIORITY_LABELS: Record<DecisionPriority, string> = {
  URGENT: "Urgent",
  HIGH: "Haute",
  NORMAL: "Normale",
  LOW: "Basse",
};

export const DECISION_PRIORITY_COLOR: Record<DecisionPriority, string> = {
  URGENT: "text-red-400",
  HIGH: "text-amber-400",
  NORMAL: "text-navy-300",
  LOW: "text-navy-500",
};

export const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> = {
  NOT_STARTED: "Non démarré",
  IN_PROGRESS: "En cours",
  ON_HOLD: "En pause",
  COMPLETED: "Complété",
  OVERDUE: "En retard",
};

export const IMPLEMENTATION_STATUS_COLOR: Record<ImplementationStatus, string> = {
  NOT_STARTED: "bg-navy-700 text-navy-300",
  IN_PROGRESS: "bg-blue-900/40 text-blue-300",
  ON_HOLD: "bg-amber-900/40 text-amber-300",
  COMPLETED: "bg-emerald-900/40 text-emerald-300",
  OVERDUE: "bg-red-900/40 text-red-300",
};

export const BRIEFING_TYPE_LABELS: Record<BriefingType, string> = {
  DAILY: "Briefing quotidien",
  WEEKLY: "Briefing hebdomadaire",
  CABINET: "Briefing du Conseil",
  EMERGENCY: "Briefing d'urgence",
  SPECIAL: "Briefing spécial",
};

export const BRIEFING_STATUS_LABELS: Record<BriefingStatus, string> = {
  DRAFT: "Brouillon",
  REVIEW: "En révision",
  APPROVED: "Approuvé",
  DISTRIBUTED: "Distribué",
};

export const BRIEFING_STATUS_COLOR: Record<BriefingStatus, string> = {
  DRAFT: "bg-navy-700 text-navy-300 border border-navy-600",
  REVIEW: "bg-amber-900/40 text-amber-300 border border-amber-800",
  APPROVED: "bg-blue-900/40 text-blue-300 border border-blue-800",
  DISTRIBUTED: "bg-emerald-900/40 text-emerald-300 border border-emerald-800",
};

export const CORRESPONDENCE_TYPE_LABELS: Record<CorrespondenceType, string> = {
  OFFICIAL_LETTER: "Lettre officielle",
  PRESIDENTIAL_DIRECTIVE: "Directive présidentielle",
  MINISTERIAL_MEMO: "Note ministérielle",
  CABINET_CIRCULAR: "Circulaire du Conseil",
  EXECUTIVE_NOTE: "Note exécutive",
  COMMUNIQUE: "Communiqué",
};

export const CLASSIFICATION_LABELS: Record<CorrespondenceClassification, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  CONFIDENTIAL: "Confidentiel",
  SECRET: "Secret",
  TOP_SECRET: "Très secret",
};

export const CLASSIFICATION_COLOR: Record<CorrespondenceClassification, string> = {
  PUBLIC: "bg-emerald-900/30 text-emerald-300 border border-emerald-800",
  INTERNAL: "bg-blue-900/30 text-blue-300 border border-blue-800",
  CONFIDENTIAL: "bg-amber-900/30 text-amber-300 border border-amber-800",
  SECRET: "bg-red-900/30 text-red-300 border border-red-800",
  TOP_SECRET: "bg-red-900/60 text-red-200 border border-red-700 font-semibold",
};

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL_STAFF: "Tout le personnel",
  MINISTERS: "Ministres",
  DIRECTORS: "Directeurs",
  CABINET_MEMBERS: "Membres du Conseil",
  SPECIFIC_MINISTRY: "Ministère ciblé",
  PUBLIC: "Public",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CD", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CD", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
