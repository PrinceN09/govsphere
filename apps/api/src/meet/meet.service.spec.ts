/**
 * MeetService — unit tests
 * v1.5.0 — Prinodia Meet Foundation
 *
 * Tests cover: start, end, joinMeeting, leaveMeeting,
 * admitFromWaiting, muteAll, raiseHand/lowerHand, transferHost,
 * addReaction, findById, findByToken — including edge-cases
 * (already IN_PROGRESS, locked, waiting-room, permissions).
 */

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { MeetService } from "./meet.service";
import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AuthenticatedUser } from "../common/types/auth.types";

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockMeeting = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
};
const mockParticipant = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
};
const mockSession = {
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockReaction = { create: jest.fn() };

const mockPrisma = {
  meeting: mockMeeting,
  meetingParticipant: mockParticipant,
  meetingSession: mockSession,
  meetingReaction: mockReaction,
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const actor: AuthenticatedUser = {
  id: "user-1",
  email: "host@gov.cd",
  matriculeNumber: "AGT-001",
  role: "EMPLOYEE",
  roleWeight: 10,
  ministryId: null,
  departmentId: null,
  divisionId: null,
  sessionId: "sess-abc",
  permissions: [],
  mfaEnabled: false,
};

const adminActor: AuthenticatedUser = {
  ...actor,
  id: "admin-1",
  role: "SUPER_ADMIN",
  roleWeight: 100,
};

const scheduledMeeting = {
  id: "meet-1",
  organizerId: "user-1",
  status: "SCHEDULED",
  isLocked: false,
  waitingRoomEnabled: true,
  deletedAt: null,
};

const inProgressMeeting = { ...scheduledMeeting, status: "IN_PROGRESS" };
const completedMeeting = { ...scheduledMeeting, status: "COMPLETED" };
const cancelledMeeting = { ...scheduledMeeting, status: "CANCELLED" };
const lockedMeeting = { ...inProgressMeeting, isLocked: true };

// ─── Helper ───────────────────────────────────────────────────────────────────

function meetFindUnique(meeting: object | null) {
  mockMeeting.findUnique.mockResolvedValue(meeting);
}

function participantFindUnique(participant: object | null) {
  mockParticipant.findUnique.mockResolvedValue(participant);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("MeetService", () => {
  let service: MeetService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MeetService>(MeetService);
  });

  // ── start() ────────────────────────────────────────────────────────────────

  describe("start()", () => {
    it("starts a SCHEDULED meeting as organizer", async () => {
      meetFindUnique(scheduledMeeting);
      mockMeeting.update.mockResolvedValue({});
      mockSession.create.mockResolvedValue({ id: "sess-1" });
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.start("meet-1", actor);

      expect(result.started).toBe(true);
      expect(result.joinToken).toHaveLength(32); // 16 bytes hex = 32 chars
      expect(mockMeeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "meet-1" },
          data: expect.objectContaining({ status: "IN_PROGRESS" }),
        }),
      );
    });

    it("returns immediately if meeting already IN_PROGRESS", async () => {
      meetFindUnique(inProgressMeeting);
      const result = await service.start("meet-1", actor);
      expect(result.started).toBe(true);
      expect(mockMeeting.update).not.toHaveBeenCalled();
    });

    it("throws BadRequestException for COMPLETED meeting", async () => {
      meetFindUnique(completedMeeting);
      await expect(service.start("meet-1", actor)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for CANCELLED meeting", async () => {
      meetFindUnique(cancelledMeeting);
      await expect(service.start("meet-1", actor)).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException when non-organizer tries to start", async () => {
      meetFindUnique({ ...scheduledMeeting, organizerId: "other-user" });
      const nonOrganizer: AuthenticatedUser = { ...actor, id: "user-99" };
      await expect(service.start("meet-1", nonOrganizer)).rejects.toThrow(ForbiddenException);
    });

    it("allows SUPER_ADMIN to start any meeting", async () => {
      meetFindUnique({ ...scheduledMeeting, organizerId: "other-user" });
      mockMeeting.update.mockResolvedValue({});
      mockSession.create.mockResolvedValue({ id: "sess-1" });
      mockParticipant.updateMany.mockResolvedValue({ count: 0 });
      const result = await service.start("meet-1", adminActor);
      expect(result.started).toBe(true);
    });

    it("throws NotFoundException for unknown meeting", async () => {
      meetFindUnique(null);
      await expect(service.start("meet-x", actor)).rejects.toThrow(NotFoundException);
    });
  });

  // ── end() ──────────────────────────────────────────────────────────────────

  describe("end()", () => {
    beforeEach(() => {
      // assertHostOrOrganizer calls meeting + participant in parallel
      mockMeeting.findUnique
        .mockResolvedValueOnce(inProgressMeeting) // getMeetingOrThrow
        .mockResolvedValueOnce({ organizerId: "user-1" }); // assertHostOrOrganizer
      participantFindUnique({ liveRole: "HOST" });
      mockMeeting.update.mockResolvedValue({});
      mockSession.findFirst.mockResolvedValue({
        id: "sess-1",
        startedAt: new Date(Date.now() - 3600_000).toISOString(),
        participantCount: 5,
      });
      mockSession.update.mockResolvedValue({});
      mockParticipant.updateMany.mockResolvedValue({ count: 5 });
    });

    it("ends an IN_PROGRESS meeting", async () => {
      const result = await service.end("meet-1", actor);
      expect(result.ended).toBe(true);
      expect(mockMeeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "COMPLETED" }),
        }),
      );
    });

    it("closes the open session with durationSeconds", async () => {
      await service.end("meet-1", actor);
      expect(mockSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationSeconds: expect.any(Number),
          }),
        }),
      );
    });

    it("marks all participants as left", async () => {
      await service.end("meet-1", actor);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1", leftAt: null },
          data: { leftAt: expect.any(Date) },
        }),
      );
    });

    it("throws BadRequestException if meeting is not IN_PROGRESS", async () => {
      // override getMeetingOrThrow
      mockMeeting.findUnique.mockReset().mockResolvedValue(scheduledMeeting);
      await expect(service.end("meet-1", actor)).rejects.toThrow(BadRequestException);
    });
  });

  // ── joinMeeting() ──────────────────────────────────────────────────────────

  describe("joinMeeting()", () => {
    it("puts a non-organizer in waiting room when waitingRoom is enabled", async () => {
      meetFindUnique(inProgressMeeting); // waitingRoomEnabled: true
      participantFindUnique(null); // not yet a participant
      mockParticipant.create.mockResolvedValue({ id: "part-x", liveRole: "GUEST" });
      mockSession.findFirst.mockResolvedValue(null);

      const other: AuthenticatedUser = { ...actor, id: "user-99" };
      const result = await service.joinMeeting("meet-1", other);

      expect(result.inWaitingRoom).toBe(true);
      expect(mockParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isInWaitingRoom: true }),
        }),
      );
    });

    it("admits organizer directly without waiting room", async () => {
      // organizer: user-1, waitingRoomEnabled: true
      meetFindUnique(inProgressMeeting);
      participantFindUnique(null);
      mockParticipant.create.mockResolvedValue({ id: "part-y", liveRole: "HOST" });
      mockSession.findFirst.mockResolvedValue({
        id: "sess-1",
        participantCount: 2,
        peakParticipantCount: 2,
      });
      mockSession.update.mockResolvedValue({});

      const result = await service.joinMeeting("meet-1", actor); // actor.id === organizerId

      expect(result.inWaitingRoom).toBe(false);
      expect(mockParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isInWaitingRoom: false }),
        }),
      );
    });

    it("throws BadRequestException if meeting not IN_PROGRESS", async () => {
      meetFindUnique(scheduledMeeting);
      await expect(service.joinMeeting("meet-1", actor)).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException if meeting is locked", async () => {
      meetFindUnique(lockedMeeting);
      await expect(service.joinMeeting("meet-1", actor)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── leaveMeeting() ─────────────────────────────────────────────────────────

  describe("leaveMeeting()", () => {
    it("marks participant as left", async () => {
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.leaveMeeting("meet-1", actor);
      expect(result.left).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1", userId: actor.id },
          data: { leftAt: expect.any(Date) },
        }),
      );
    });
  });

  // ── admitFromWaiting() ─────────────────────────────────────────────────────

  describe("admitFromWaiting()", () => {
    it("admits a participant as HOST", async () => {
      // assertHostOrOrganizer — parallel mock
      mockMeeting.findUnique.mockResolvedValue({ organizerId: "user-1" });
      participantFindUnique({ liveRole: "HOST" });
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.admitFromWaiting("meet-1", "user-waiting", actor);
      expect(result.admitted).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1", userId: "user-waiting" },
          data: { isInWaitingRoom: false, joinedAt: expect.any(Date) },
        }),
      );
    });

    it("throws ForbiddenException for non-host, non-organizer", async () => {
      mockMeeting.findUnique.mockResolvedValue({ organizerId: "other-user" });
      participantFindUnique({ liveRole: "PARTICIPANT" });

      const other: AuthenticatedUser = { ...actor, id: "user-99" };
      await expect(service.admitFromWaiting("meet-1", "user-waiting", other)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── muteAll() ──────────────────────────────────────────────────────────────

  describe("muteAll()", () => {
    it("mutes all non-host participants", async () => {
      mockMeeting.findUnique.mockResolvedValue({ organizerId: "user-1" });
      participantFindUnique({ liveRole: "HOST" });
      mockParticipant.updateMany.mockResolvedValue({ count: 4 });

      const result = await service.muteAll("meet-1", actor);
      expect(result.mutedAll).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1", liveRole: { not: "HOST" } },
          data: { isAudioMuted: true },
        }),
      );
    });
  });

  // ── raiseHand / lowerHand ──────────────────────────────────────────────────

  describe("raiseHand()", () => {
    it("sets isHandRaised to true", async () => {
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.raiseHand("meet-1", actor);
      expect(result.raised).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isHandRaised: true },
        }),
      );
    });
  });

  describe("lowerHand()", () => {
    it("sets isHandRaised to false", async () => {
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.lowerHand("meet-1", actor);
      expect(result.lowered).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isHandRaised: false },
        }),
      );
    });
  });

  // ── transferHost() ─────────────────────────────────────────────────────────

  describe("transferHost()", () => {
    it("demotes old host and promotes new one", async () => {
      mockMeeting.findUnique.mockResolvedValue({ organizerId: "user-1" });
      participantFindUnique({ liveRole: "HOST" });
      mockParticipant.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.transferHost("meet-1", { newHostId: "user-2" }, actor);
      expect(result.transferred).toBe(true);
      expect(mockParticipant.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  // ── addReaction() ──────────────────────────────────────────────────────────

  describe("addReaction()", () => {
    it("creates a reaction record", async () => {
      meetFindUnique(inProgressMeeting);
      const reactionFixture = {
        id: "react-1",
        emoji: "👍",
        userId: "user-1",
        createdAt: new Date(),
      };
      mockReaction.create.mockResolvedValue(reactionFixture);

      const result = await service.addReaction("meet-1", { emoji: "👍" }, actor);
      expect(result.emoji).toBe("👍");
      expect(mockReaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { meetingId: "meet-1", userId: "user-1", emoji: "👍" },
        }),
      );
    });
  });

  // ── findByToken() ──────────────────────────────────────────────────────────

  describe("findByToken()", () => {
    it("returns meeting for a valid token", async () => {
      const fullMeeting = { id: "meet-1", title: "Test", joinToken: "abc123" };
      mockMeeting.findUnique.mockResolvedValue(fullMeeting);
      const result = await service.findByToken("abc123");
      expect(result.id).toBe("meet-1");
    });

    it("throws NotFoundException for invalid token", async () => {
      mockMeeting.findUnique.mockResolvedValue(null);
      await expect(service.findByToken("bad-token")).rejects.toThrow(NotFoundException);
    });
  });

  // ── findById() ─────────────────────────────────────────────────────────────

  describe("findById()", () => {
    it("throws NotFoundException for missing meeting", async () => {
      // First call: findById, second call: assertAccess
      mockMeeting.findUnique.mockResolvedValueOnce(null);
      await expect(service.findById("meet-x", actor)).rejects.toThrow(NotFoundException);
    });

    it("returns meeting when user is participant", async () => {
      const fullMeeting = { id: "meet-1", title: "Test", organizerId: "user-1" };
      mockMeeting.findUnique.mockResolvedValue(fullMeeting);
      participantFindUnique({ id: "part-1" });

      const result = await service.findById("meet-1", actor);
      expect(result.id).toBe("meet-1");
    });
  });
});
