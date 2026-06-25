/**
 * GovSphere — Calendar & Meetings Web Types (v0.9.0)
 *
 * Client-side type definitions for the Calendar & Meetings platform.
 * Mirror of the API response shapes — not importing from @prisma/client.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type CalendarScope =
  | "PERSONAL"
  | "TEAM"
  | "DEPARTMENT"
  | "MINISTRY"
  | "PROVINCE"
  | "NATIONAL";

export type EventStatus = "TENTATIVE" | "CONFIRMED" | "CANCELLED";

export type MeetingStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";

export type MeetingType =
  | "REGULAR"
  | "EMERGENCY"
  | "CABINET"
  | "MINISTERIAL"
  | "COMMITTEE"
  | "WORKING_GROUP"
  | "BILATERAL"
  | "TRILATERAL"
  | "VIRTUAL"
  | "HYBRID";

export type MeetingClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";

export type ParticipantRole =
  | "ORGANIZER"
  | "REQUIRED"
  | "OPTIONAL"
  | "PRESENTER"
  | "OBSERVER"
  | "SECRETARY";

export type RsvpStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE" | "DELEGATED";

export type AttendanceStatus = "ABSENT" | "PRESENT" | "LATE" | "EXCUSED" | "DELEGATED";

export type ResourceType = "MEETING_ROOM" | "PROJECTOR" | "VEHICLE" | "FACILITY" | "EQUIPMENT";

// ─── Base shapes ──────────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  displayName: string | null;
  email: string;
  avatarUrl?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  onlineMeetingUrl?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  status: EventStatus;
  scope: CalendarScope;
  classification: MeetingClassification;
  color?: string | null;
  createdById: string;
  createdBy: UserRef;
  recurringRuleId?: string | null;
  meeting?: {
    id: string;
    status: MeetingStatus;
    meetingType: MeetingType;
    classification?: MeetingClassification;
  } | null;
  reminders?: EventReminder[];
  createdAt: string;
  updatedAt: string;
}

export interface EventReminder {
  id: string;
  minutesBefore: number;
  channel: "IN_APP" | "EMAIL" | "SMS";
  sentAt?: string | null;
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  user: UserRef;
  role: ParticipantRole;
  rsvpStatus: RsvpStatus;
  attendanceStatus?: AttendanceStatus | null;
  rsvpAt?: string | null;
  delegatedToId?: string | null;
  delegatedTo?: UserRef | null;
  note?: string | null;
}

export interface MeetingAgendaItem {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  presenterId?: string | null;
  presenter?: UserRef | null;
  durationMinutes?: number | null;
  supportingDocs: string[];
  expectedDecision?: string | null;
  completed: boolean;
  notes?: string | null;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  authorId: string;
  author: UserRef;
  content?: string | null;
  isDraft: boolean;
  publishedAt?: string | null;
  publishedById?: string | null;
  publishedBy?: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  agendaItemId?: string | null;
  sourceNote?: string | null;
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueAt?: string | null;
    assignee?: UserRef | null;
  };
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  code?: string | null;
  type: ResourceType;
  capacity?: number | null;
  location?: string | null;
  description?: string | null;
  amenities: string[];
  ministryId?: string | null;
  isActive: boolean;
}

export interface Meeting {
  id: string;
  eventId: string;
  event: {
    id: string;
    startAt: string;
    endAt: string;
    timezone: string;
    scope: CalendarScope;
  };
  title: string;
  description?: string | null;
  location?: string | null;
  onlineMeetingUrl?: string | null;
  meetingType: MeetingType;
  status: MeetingStatus;
  classification: MeetingClassification;
  organizerId: string;
  organizer: UserRef;
  roomId?: string | null;
  room?: Room | null;
  participants: MeetingParticipant[];
  agendaItems?: MeetingAgendaItem[];
  minutes?: MeetingMinutes | null;
  actionItems?: MeetingActionItem[];
  _count?: {
    participants: number;
    agendaItems: number;
    actionItems: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Label / color maps ───────────────────────────────────────────────────────

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  POSTPONED: "Reportée",
};

export const MEETING_STATUS_COLOR: Record<MeetingStatus, string> = {
  DRAFT: "bg-navy-700 text-navy-200",
  SCHEDULED: "bg-blue-900 text-blue-200",
  IN_PROGRESS: "bg-amber-900 text-amber-200",
  COMPLETED: "bg-emerald-900 text-emerald-200",
  CANCELLED: "bg-red-900 text-red-200",
  POSTPONED: "bg-orange-900 text-orange-200",
};

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  REGULAR: "Régulière",
  EMERGENCY: "Urgence",
  CABINET: "Conseil des ministres",
  MINISTERIAL: "Ministérielle",
  COMMITTEE: "Comité",
  WORKING_GROUP: "Groupe de travail",
  BILATERAL: "Bilatérale",
  TRILATERAL: "Trilatérale",
  VIRTUAL: "Virtuelle",
  HYBRID: "Hybride",
};

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  DECLINED: "Refusé",
  TENTATIVE: "Peut-être",
  DELEGATED: "Délégué",
};

export const RSVP_STATUS_COLOR: Record<RsvpStatus, string> = {
  PENDING: "bg-navy-700 text-navy-200",
  ACCEPTED: "bg-emerald-900 text-emerald-200",
  DECLINED: "bg-red-900 text-red-200",
  TENTATIVE: "bg-amber-900 text-amber-200",
  DELEGATED: "bg-purple-900 text-purple-200",
};

export const CLASSIFICATION_COLOR: Record<MeetingClassification, string> = {
  PUBLIC: "bg-emerald-900 text-emerald-200",
  INTERNAL: "bg-blue-900 text-blue-200",
  CONFIDENTIAL: "bg-amber-900 text-amber-200",
  SECRET: "bg-red-900 text-red-200",
};

export const CLASSIFICATION_LABELS: Record<MeetingClassification, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  CONFIDENTIAL: "Confidentiel",
  SECRET: "Secret",
};

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  ORGANIZER: "Organisateur",
  REQUIRED: "Requis",
  OPTIONAL: "Optionnel",
  PRESENTER: "Présentateur",
  OBSERVER: "Observateur",
  SECRETARY: "Secrétaire",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  ABSENT: "Absent",
  PRESENT: "Présent",
  LATE: "En retard",
  EXCUSED: "Excusé",
  DELEGATED: "Délégué",
};

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  ABSENT: "bg-red-900 text-red-200",
  PRESENT: "bg-emerald-900 text-emerald-200",
  LATE: "bg-amber-900 text-amber-200",
  EXCUSED: "bg-blue-900 text-blue-200",
  DELEGATED: "bg-purple-900 text-purple-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CD", {
    day: "2-digit",
    month: "short",
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

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-CD", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDuration(startIso: string, endIso: string): string {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}
