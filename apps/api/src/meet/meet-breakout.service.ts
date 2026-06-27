/**
 * Prinodia Meet v1.5.0 — MeetBreakoutService
 *
 * Breakout room management: create, join, leave, close.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { CreateBreakoutRoomDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const ROOM_SELECT = {
  id: true,
  meetingId: true,
  name: true,
  capacity: true,
  status: true,
  openedAt: true,
  closedAt: true,
  participants: {
    where: { leftAt: null },
    select: {
      id: true,
      userId: true,
      joinedAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
  _count: { select: { participants: true } },
} as const;

@Injectable()
export class MeetBreakoutService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingBreakoutRoom.findMany({
      where: { meetingId },
      orderBy: { openedAt: "asc" },
      select: ROOM_SELECT,
    });
  }

  async create(meetingId: string, dto: CreateBreakoutRoomDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingBreakoutRoom.create({
      data: {
        meetingId,
        name: dto.name,
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        status: "OPEN",
      },
      select: ROOM_SELECT,
    });
  }

  async join(roomId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const room = await this.db.meetingBreakoutRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        status: true,
        capacity: true,
        _count: { select: { participants: true } },
      },
    });
    if (!room) throw new NotFoundException("Breakout room not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (room.status === "CLOSED") throw new BadRequestException("Breakout room is closed");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (room.capacity && room._count.participants >= room.capacity) {
      throw new BadRequestException("Breakout room is at capacity");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingBreakoutRoomParticipant.upsert({
      where: { roomId_userId: { roomId, userId: actor.id } },
      create: { roomId, userId: actor.id },
      update: { joinedAt: new Date(), leftAt: null },
      select: { id: true, roomId: true, userId: true, joinedAt: true },
    });
  }

  async leave(roomId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingBreakoutRoomParticipant.updateMany({
      where: { roomId, userId: actor.id, leftAt: null },
      data: { leftAt: new Date() },
    });
    return { left: true };
  }

  async close(roomId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const room = await this.db.meetingBreakoutRoom.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room) throw new NotFoundException("Breakout room not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingBreakoutRoom.update({
      where: { id: roomId },
      data: { status: "CLOSED", closedAt: new Date() },
      select: ROOM_SELECT,
    });
  }
}
