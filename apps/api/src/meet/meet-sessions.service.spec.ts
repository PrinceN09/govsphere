/**
 * MeetSessionsService — unit tests
 * v1.5.0 — Prinodia Meet Foundation
 */

import { Test, type TestingModule } from "@nestjs/testing";

import { MeetSessionsService } from "./meet-sessions.service";
import { PrismaService } from "../prisma/prisma.service";

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockMeetingSession = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
};

const mockPrisma = {
  meetingSession: mockMeetingSession,
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sessionFixture = {
  id: "sess-1",
  meetingId: "meet-1",
  hostId: "user-1",
  host: { id: "user-1", displayName: "Alice Dupont", avatarUrl: null },
  startedAt: new Date("2026-06-28T10:00:00Z"),
  endedAt: null,
  durationSeconds: null,
  participantCount: 3,
  peakParticipantCount: 5,
  roomSid: null,
  createdAt: new Date("2026-06-28T10:00:00Z"),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("MeetSessionsService", () => {
  let service: MeetSessionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetSessionsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<MeetSessionsService>(MeetSessionsService);
  });

  describe("list()", () => {
    it("returns all sessions for a meeting in reverse-chronological order", async () => {
      const sessions = [sessionFixture, { ...sessionFixture, id: "sess-2" }];
      mockMeetingSession.findMany.mockResolvedValue(sessions);

      const result = await service.list("meet-1");
      expect(result).toHaveLength(2);
      expect(mockMeetingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1" },
          orderBy: { startedAt: "desc" },
        }),
      );
    });

    it("returns an empty array when no sessions exist", async () => {
      mockMeetingSession.findMany.mockResolvedValue([]);
      const result = await service.list("meet-99");
      expect(result).toEqual([]);
    });
  });

  describe("getCurrent()", () => {
    it("returns the active (open) session", async () => {
      mockMeetingSession.findFirst.mockResolvedValue(sessionFixture);
      const result = await service.getCurrent("meet-1");

      expect(result?.id).toBe("sess-1");
      expect(result?.endedAt).toBeNull();
      expect(mockMeetingSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: "meet-1", endedAt: null },
        }),
      );
    });

    it("returns null when there is no active session", async () => {
      mockMeetingSession.findFirst.mockResolvedValue(null);
      const result = await service.getCurrent("meet-1");
      expect(result).toBeNull();
    });
  });
});
