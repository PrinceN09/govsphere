/**
 * GovSphere — Calendar Prisma Type Shim (v0.9.0)
 *
 * Provides typed delegate interfaces for the new calendar models so that
 * the API compiles before the user runs `npx prisma generate` on the host.
 * Once prisma generate runs, PrismaService will natively expose all of these
 * through its inherited PrismaClient type — this file can then be removed.
 *
 * Rules: no `any`, all fields are typed explicitly.
 */

// ─── Enum string unions ───────────────────────────────────────────────────────

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
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type ResourceType = "MEETING_ROOM" | "PROJECTOR" | "VEHICLE" | "FACILITY" | "EQUIPMENT";
export type ReminderChannel = "IN_APP" | "EMAIL" | "SMS";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";

// ─── Calendar AuditAction string union ───────────────────────────────────────

export type CalendarAuditAction =
  | "EVENT_CREATED"
  | "EVENT_UPDATED"
  | "EVENT_DELETED"
  | "EVENT_CANCELLED"
  | "MEETING_CREATED"
  | "MEETING_UPDATED"
  | "MEETING_CANCELLED"
  | "MEETING_COMPLETED"
  | "MEETING_PARTICIPANT_INVITED"
  | "MEETING_RSVP_ACCEPTED"
  | "MEETING_RSVP_DECLINED"
  | "MEETING_RSVP_DELEGATED"
  | "MEETING_ATTENDANCE_RECORDED"
  | "MEETING_MINUTES_CREATED"
  | "MEETING_MINUTES_PUBLISHED"
  | "MEETING_ACTION_ITEM_CREATED"
  | "ROOM_BOOKED"
  | "ROOM_BOOKING_CANCELLED";

// ─── Base record types ────────────────────────────────────────────────────────

export interface RecurringRuleRecord {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  monthOfYear: number | null;
  untilDate: Date | null;
  occurrences: number | null;
  createdAt: Date;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  onlineMeetingUrl: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  timezone: string;
  status: EventStatus;
  scope: CalendarScope;
  classification: MeetingClassification;
  color: string | null;
  createdById: string;
  ministryId: string | null;
  departmentId: string | null;
  divisionId: string | null;
  provinceId: string | null;
  recurringRuleId: string | null;
  parentEventId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventReminderRecord {
  id: string;
  eventId: string;
  userId: string;
  minutesBefore: number;
  channel: ReminderChannel;
  sentAt: Date | null;
  createdAt: Date;
}

export interface RoomRecord {
  id: string;
  name: string;
  code: string | null;
  type: ResourceType;
  capacity: number | null;
  location: string | null;
  description: string | null;
  amenities: string[];
  ministryId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingRecord {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  location: string | null;
  onlineMeetingUrl: string | null;
  meetingType: MeetingType;
  status: MeetingStatus;
  classification: MeetingClassification;
  organizerId: string;
  roomId: string | null;
  briefDocumentId: string | null;
  workflowInstanceId: string | null;
  metadata: unknown;
  cancelledAt: Date | null;
  cancelReason: string | null;
  completedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipantRecord {
  id: string;
  meetingId: string;
  userId: string;
  role: ParticipantRole;
  rsvpStatus: RsvpStatus;
  attendanceStatus: AttendanceStatus | null;
  rsvpAt: Date | null;
  delegatedToId: string | null;
  reminderSentAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAgendaItemRecord {
  id: string;
  meetingId: string;
  order: number;
  title: string;
  description: string | null;
  presenterId: string | null;
  durationMinutes: number | null;
  supportingDocs: string[];
  expectedDecision: string | null;
  completed: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingMinutesRecord {
  id: string;
  meetingId: string;
  documentId: string | null;
  authorId: string;
  content: string | null;
  isDraft: boolean;
  publishedAt: Date | null;
  publishedById: string | null;
  workflowInstanceId: string | null;
  versionHistory: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingActionItemRecord {
  id: string;
  meetingId: string;
  taskId: string;
  agendaItemId: string | null;
  sourceNote: string | null;
  createdAt: Date;
}

export interface MeetingAttachmentRecord {
  id: string;
  meetingId: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  documentId: string | null;
  createdAt: Date;
}

export interface RoomBookingRecord {
  id: string;
  roomId: string;
  bookedById: string;
  startAt: Date;
  endAt: Date;
  purpose: string | null;
  eventId: string | null;
  cancelledAt: Date | null;
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

// ─── Delegate interfaces ──────────────────────────────────────────────────────

export interface RecurringRuleDelegate {
  create(args: { data: Record<string, unknown> }): Promise<RecurringRuleRecord>;
}

export interface CalendarEventDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
  }): Promise<(CalendarEventRecord & Record<string, unknown>)[]>;
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<(CalendarEventRecord & Record<string, unknown>) | null>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<CalendarEventRecord & Record<string, unknown>>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<CalendarEventRecord>;
}

export interface EventReminderDelegate {
  create(args: { data: Record<string, unknown> }): Promise<EventReminderRecord>;
  findUnique(args: { where: { id: string } }): Promise<EventReminderRecord | null>;
  delete(args: { where: { id: string } }): Promise<EventReminderRecord>;
}

export interface RoomDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<(RoomRecord & Record<string, unknown>)[]>;
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<(RoomRecord & Record<string, unknown>) | null>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<RoomRecord & Record<string, unknown>>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<RoomRecord>;
}

export interface MeetingDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
    cursor?: { id: string };
    skip?: number;
  }): Promise<(MeetingRecord & Record<string, unknown>)[]>;
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<(MeetingRecord & Record<string, unknown>) | null>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MeetingRecord & Record<string, unknown>>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MeetingRecord & Record<string, unknown>>;
}

export interface MeetingParticipantDelegate {
  findFirst(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<(MeetingParticipantRecord & Record<string, unknown>) | null>;
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
  }): Promise<(MeetingParticipantRecord & Record<string, unknown>)[]>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MeetingParticipantRecord & Record<string, unknown>>;
  createMany(args: {
    data: Array<Record<string, unknown>>;
    skipDuplicates?: boolean;
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<MeetingParticipantRecord>;
  delete(args: { where: { id: string } }): Promise<MeetingParticipantRecord>;
}

export interface MeetingAgendaItemDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<(MeetingAgendaItemRecord & Record<string, unknown>)[]>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MeetingAgendaItemRecord & Record<string, unknown>>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<MeetingAgendaItemRecord>;
  delete(args: { where: { id: string } }): Promise<MeetingAgendaItemRecord>;
}

export interface MeetingMinutesDelegate {
  findUnique(args: {
    where: { meetingId: string } | { id: string };
    include?: Record<string, unknown>;
  }): Promise<(MeetingMinutesRecord & Record<string, unknown>) | null>;
  create(args: { data: Record<string, unknown> }): Promise<MeetingMinutesRecord>;
  update(args: {
    where: { meetingId: string };
    data: Record<string, unknown>;
  }): Promise<MeetingMinutesRecord>;
}

export interface MeetingActionItemDelegate {
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MeetingActionItemRecord & Record<string, unknown>>;
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<(MeetingActionItemRecord & Record<string, unknown>)[]>;
}

export interface RoomBookingDelegate {
  findFirst(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<(RoomBookingRecord & Record<string, unknown>) | null>;
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
    select?: Record<string, unknown>;
  }): Promise<(RoomBookingRecord & Record<string, unknown>)[]>;
  create(args: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<RoomBookingRecord & Record<string, unknown>>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<RoomBookingRecord>;
}

export interface TaskDelegate {
  create(args: { data: Record<string, unknown> }): Promise<TaskRecord>;
}

// ─── Augmented PrismaService interface ───────────────────────────────────────

export interface CalendarDb {
  recurringRule: RecurringRuleDelegate;
  calendarEvent: CalendarEventDelegate;
  eventReminder: EventReminderDelegate;
  room: RoomDelegate;
  meeting: MeetingDelegate;
  meetingParticipant: MeetingParticipantDelegate;
  meetingAgendaItem: MeetingAgendaItemDelegate;
  meetingMinutes: MeetingMinutesDelegate;
  meetingActionItem: MeetingActionItemDelegate;
  meetingAttachment: {
    create(args: { data: Record<string, unknown> }): Promise<MeetingAttachmentRecord>;
  };
  roomBooking: RoomBookingDelegate;
  task: TaskDelegate;
  // Pass-through transaction
  $transaction<T>(fn: (tx: CalendarDb) => Promise<T>): Promise<T>;
}
