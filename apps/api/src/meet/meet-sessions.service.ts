/**
 * Prinodia Meet v1.5.0 — MeetSessionsService
 *
 * Manages meeting session records: history, participant counts.
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const SESSION_SELECT = {
  id: true,
  meetingId: true,
  hostId: true,
  host: { select: { id: true, displayName: true, avatarUrl: true } },
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  participantCount: true,
  peakParticipantCount: true,
  roomSid: true,
  createdAt: true,
} as const;

@Injectable()
export class MeetSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingSession.findMany({
      where: { meetingId },
      orderBy: { startedAt: "desc" },
      select: SESSION_SELECT,
    });
  }

  async getCurrent(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingSession.findFirst({
      where: { meetingId, endedAt: null },
      select: SESSION_SELECT,
    });
  }
}
