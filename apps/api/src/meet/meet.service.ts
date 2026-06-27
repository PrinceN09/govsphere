/**
 * Prinodia Meet v1.5.0 — MeetService
 *
 * Manages live session lifecycle: start, end, lock, admit, mute, hand-raise,
 * host transfer. Extends the existing Calendar MeetingsService infrastructure.
 */

import { randomBytes } from "crypto";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { MeetReactionDto, TransferHostDto, UpdateMeetSettingsDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const MEET_SELECT = {
  id: true,
  title: true,
  description: true,
  onlineMeetingUrl: true,
  meetingType: true,
  status: true,
  classification: true,
  organizerId: true,
  organizer: { select: { id: true, displayName: true, avatarUrl: true } },
  channelId: true,
  joinToken: true,
  isLocked: true,
  waitingRoomEnabled: true,
  maxParticipants: true,
  recordingEnabled: true,
  videoEnabled: true,
  audioEnabled: true,
  screenShareEnabled: true,
  liveStartedAt: true,
  liveEndedAt: true,
  event: { select: { startAt: true, endAt: true } },
  participants: {
    select: {
      id: true,
      userId: true,
      liveRole: true,
      rsvpStatus: true,
      attendanceStatus: true,
      joinedAt: true,
      leftAt: true,
      isAudioMuted: true,
      isVideoOff: true,
      isHandRaised: true,
      isInWaitingRoom: true,
      connectionQuality: true,
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
  _count: { select: { participants: true, recordings: true, polls: true } },
} as const;

@Injectable()
export class MeetService {
  private readonly logger = new Logger(MeetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ── Discovery ─────────────────────────────────────────────────────────────

  async findUpcoming(actor: AuthenticatedUser) {
    const now = new Date();
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meeting.findMany({
      where: {
        deletedAt: null,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        OR: [{ organizerId: actor.id }, { participants: { some: { userId: actor.id } } }],
        event: { startAt: { gte: now, lte: next7d } },
      },
      orderBy: { event: { startAt: "asc" } },
      take: 20,
      select: MEET_SELECT,
    });
  }

  async findActive(actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meeting.findMany({
      where: {
        deletedAt: null,
        status: "IN_PROGRESS",
        OR: [{ organizerId: actor.id }, { participants: { some: { userId: actor.id } } }],
      },
      orderBy: { liveStartedAt: "desc" },
      take: 10,
      select: MEET_SELECT,
    });
  }

  async findById(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.db.meeting.findUnique({
      where: { id: meetingId },
      select: MEET_SELECT,
    });
    if (!meeting) throw new NotFoundException("Meeting not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.assertAccess(meetingId, actor);
    return meeting;
  }

  async findByToken(token: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.db.meeting.findUnique({
      where: { joinToken: token },
      select: MEET_SELECT,
    });
    if (!meeting) throw new NotFoundException("Invalid join token");
    return meeting;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async start(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.getMeetingOrThrow(meetingId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.status === "IN_PROGRESS") return { started: true, meetingId };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.status === "COMPLETED" || meeting.status === "CANCELLED") {
      throw new BadRequestException("Meeting cannot be started in its current state");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isOrganizer = meeting.organizerId === actor.id;
    const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN";
    if (!isOrganizer && !isAdmin) {
      throw new ForbiddenException("Only the organizer can start a meeting");
    }

    const joinToken = randomBytes(16).toString("hex");
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    await this.db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "IN_PROGRESS",
        liveStartedAt: now,
        joinToken,
      },
    });

    // Create session record
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingSession.create({
      data: { meetingId, hostId: actor.id },
    });

    // Mark organizer participant as HOST
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: actor.id },
      data: {
        liveRole: "HOST",
        joinedAt: now,
        isInWaitingRoom: false,
      },
    });

    void this.audit.log({
      userId: actor.id,
      action: "MEETING_STARTED" as never,
      entityType: "MEETING",
      entityId: meetingId,
      metadata: { joinToken },
    });

    this.logger.log(`[Meet] Meeting ${meetingId} started by ${actor.id}`);
    return { started: true, meetingId, joinToken };
  }

  async end(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.getMeetingOrThrow(meetingId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.status !== "IN_PROGRESS") {
      throw new BadRequestException("Meeting is not in progress");
    }
    await this.assertHostOrOrganizer(meetingId, actor);

    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meeting.update({
      where: { id: meetingId },
      data: { status: "COMPLETED", completedAt: now, liveEndedAt: now },
    });

    // Close open session
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const session = await this.db.meetingSession.findFirst({
      where: { meetingId, endedAt: null },
      select: { id: true, startedAt: true, participantCount: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const durationSeconds = Math.floor(
        (now.getTime() - new Date(session.startedAt).getTime()) / 1000,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.db.meetingSession.update({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { id: session.id },
        data: { endedAt: now, durationSeconds },
      });
    }

    // Mark all participants as left
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, leftAt: null },
      data: { leftAt: now },
    });

    void this.audit.log({
      userId: actor.id,
      action: "MEETING_ENDED" as never,
      entityType: "MEETING",
      entityId: meetingId,
      metadata: {},
    });

    this.logger.log(`[Meet] Meeting ${meetingId} ended by ${actor.id}`);
    return { ended: true, meetingId };
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  async updateSettings(meetingId: string, dto: UpdateMeetSettingsDto, actor: AuthenticatedUser) {
    await this.getMeetingOrThrow(meetingId);
    await this.assertHostOrOrganizer(meetingId, actor);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meeting.update({
      where: { id: meetingId },
      data: {
        ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
        ...(dto.waitingRoomEnabled !== undefined
          ? { waitingRoomEnabled: dto.waitingRoomEnabled }
          : {}),
        ...(dto.maxParticipants !== undefined ? { maxParticipants: dto.maxParticipants } : {}),
        ...(dto.recordingEnabled !== undefined ? { recordingEnabled: dto.recordingEnabled } : {}),
        ...(dto.videoEnabled !== undefined ? { videoEnabled: dto.videoEnabled } : {}),
        ...(dto.audioEnabled !== undefined ? { audioEnabled: dto.audioEnabled } : {}),
        ...(dto.screenShareEnabled !== undefined
          ? { screenShareEnabled: dto.screenShareEnabled }
          : {}),
      },
      select: {
        id: true,
        isLocked: true,
        waitingRoomEnabled: true,
        maxParticipants: true,
        recordingEnabled: true,
        videoEnabled: true,
        audioEnabled: true,
        screenShareEnabled: true,
      },
    });
  }

  // ── Participant Controls ──────────────────────────────────────────────────

  async joinMeeting(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.getMeetingOrThrow(meetingId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.status !== "IN_PROGRESS") {
      throw new BadRequestException("Meeting is not active");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.isLocked) {
      throw new ForbiddenException("Meeting is locked");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let participant = await this.db.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: actor.id } },
      select: { id: true, liveRole: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isOrganizer = meeting.organizerId === actor.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const inWaiting = meeting.waitingRoomEnabled && !isOrganizer;

    if (!participant) {
      // Add as guest participant
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      participant = await this.db.meetingParticipant.create({
        data: {
          meetingId,
          userId: actor.id,
          role: "OPTIONAL",
          rsvpStatus: "ACCEPTED",
          liveRole: isOrganizer ? "HOST" : "GUEST",
          joinedAt: inWaiting ? null : new Date(),
          isInWaitingRoom: inWaiting,
        },
        select: { id: true, liveRole: true },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.db.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId: actor.id } },
        data: {
          joinedAt: inWaiting ? undefined : new Date(),
          isInWaitingRoom: inWaiting,
          leftAt: null,
        },
      });
    }

    // Update session participant count
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const session = await this.db.meetingSession.findFirst({
      where: { meetingId, endedAt: null },
      select: { id: true, participantCount: true, peakParticipantCount: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (session && !inWaiting) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const newCount = session.participantCount + 1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.db.meetingSession.update({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { id: session.id },
        data: {
          participantCount: newCount,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          peakParticipantCount: Math.max(newCount, session.peakParticipantCount),
        },
      });
    }

    return { joined: true, inWaitingRoom: inWaiting };
  }

  async leaveMeeting(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: actor.id },
      data: { leftAt: new Date() },
    });
    return { left: true };
  }

  async admitFromWaiting(meetingId: string, participantUserId: string, actor: AuthenticatedUser) {
    await this.assertHostOrOrganizer(meetingId, actor);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: participantUserId },
      data: { isInWaitingRoom: false, joinedAt: new Date() },
    });
    return { admitted: true };
  }

  async muteParticipant(meetingId: string, participantUserId: string, actor: AuthenticatedUser) {
    await this.assertHostOrOrganizer(meetingId, actor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: participantUserId },
      data: { isAudioMuted: true },
    });
    return { muted: true };
  }

  async muteAll(meetingId: string, actor: AuthenticatedUser) {
    await this.assertHostOrOrganizer(meetingId, actor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, liveRole: { not: "HOST" } },
      data: { isAudioMuted: true },
    });
    return { mutedAll: true };
  }

  async raiseHand(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: actor.id },
      data: { isHandRaised: true },
    });
    return { raised: true };
  }

  async lowerHand(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: actor.id },
      data: { isHandRaised: false },
    });
    return { lowered: true };
  }

  async transferHost(meetingId: string, dto: TransferHostDto, actor: AuthenticatedUser) {
    await this.assertHostOrOrganizer(meetingId, actor);

    // Demote current host(s)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, liveRole: "HOST" },
      data: { liveRole: "PARTICIPANT" },
    });

    // Promote new host
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingParticipant.updateMany({
      where: { meetingId, userId: dto.newHostId },
      data: { liveRole: "HOST" },
    });

    return { transferred: true };
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  async addReaction(meetingId: string, dto: MeetReactionDto, actor: AuthenticatedUser) {
    await this.getMeetingOrThrow(meetingId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const reaction = await this.db.meetingReaction.create({
      data: { meetingId, userId: actor.id, emoji: dto.emoji },
      select: { id: true, emoji: true, userId: true, createdAt: true },
    });
    return reaction;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getMeetingOrThrow(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.db.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        organizerId: true,
        status: true,
        isLocked: true,
        waitingRoomEnabled: true,
        deletedAt: true,
      },
    });
    if (!meeting) throw new NotFoundException("Meeting not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (meeting.deletedAt) throw new NotFoundException("Meeting not found");
    return meeting;
  }

  private async assertAccess(meetingId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const participant = await this.db.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: actor.id } },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const meeting = await this.db.meeting.findUnique({
      where: { id: meetingId },
      select: { organizerId: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!participant && meeting?.organizerId !== actor.id) {
      throw new ForbiddenException("Not a participant of this meeting");
    }
  }

  private async assertHostOrOrganizer(meetingId: string, actor: AuthenticatedUser) {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN") return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [meeting, participant] = await Promise.all([
      this.db.meeting.findUnique({
        where: { id: meetingId },
        select: { organizerId: true },
      }),
      this.db.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId, userId: actor.id } },
        select: { liveRole: true },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isOrganizer = meeting?.organizerId === actor.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isHost = participant?.liveRole === "HOST" || participant?.liveRole === "CO_HOST";

    if (!isOrganizer && !isHost) {
      throw new ForbiddenException("Host or organizer access required");
    }
  }
}
