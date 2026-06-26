/**
 * Prinodia Workspace — RoomsService (v0.9.0)
 *
 * Manages meeting rooms and resources. Prevents double-bookings.
 */

import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CalendarDb, RoomRecord, RoomBookingRecord } from "./calendar-db.types";
import type { BookRoomDto, CreateRoomDto, RoomQueryDto, UpdateRoomDto } from "./dto/calendar.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get db(): CalendarDb {
    return this.prisma as unknown as CalendarDb;
  }

  async listRooms(query: RoomQueryDto) {
    const { type, ministryId, isActive, availableFrom, availableTo } = query;

    const rooms = await this.db.room.findMany({
      where: {
        ...(type !== undefined ? { type } : {}),
        ...(ministryId !== undefined ? { ministryId } : {}),
        ...(isActive !== undefined ? { isActive } : { isActive: true }),
      },
      include: {
        ministry: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    });

    if (availableFrom !== undefined && availableTo !== undefined) {
      const start = new Date(availableFrom);
      const end = new Date(availableTo);
      const bookedBookings = await this.db.roomBooking.findMany({
        where: {
          cancelledAt: null,
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { roomId: true },
      });
      const bookedRoomIds = new Set(
        (bookedBookings as Array<{ roomId: string }>).map((b) => b.roomId),
      );
      return rooms.map((r) => ({
        ...r,
        availableForSlot: !bookedRoomIds.has((r as RoomRecord).id),
      }));
    }

    return rooms;
  }

  async getRoom(id: string) {
    const room = await this.db.room.findUnique({
      where: { id },
      include: {
        ministry: { select: { id: true, name: true } },
        bookings: {
          where: {
            cancelledAt: null,
            endAt: { gte: new Date() },
          },
          include: { bookedBy: { select: { id: true, displayName: true } } },
          orderBy: { startAt: "asc" },
          take: 20,
        },
      },
    });
    if (!room) throw new NotFoundException("Salle introuvable");
    return room;
  }

  async createRoom(dto: CreateRoomDto, _actor: AuthenticatedUser) {
    return this.db.room.create({
      data: {
        name: dto.name,
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        type: dto.type ?? "MEETING_ROOM",
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        amenities: dto.amenities ?? [],
        ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
      },
      include: { ministry: { select: { id: true, name: true } } },
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDto, _actor: AuthenticatedUser) {
    const room = await this.db.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException("Salle introuvable");

    return this.db.room.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amenities !== undefined ? { amenities: dto.amenities } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async bookRoom(dto: BookRoomDto, actor: AuthenticatedUser) {
    const room = await this.db.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException("Salle introuvable");
    if (!(room as RoomRecord).isActive)
      throw new ConflictException("La salle n'est pas disponible");

    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    const conflict = await this.db.roomBooking.findFirst({
      where: {
        roomId: dto.roomId,
        cancelledAt: null,
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
    if (conflict) throw new ConflictException("La salle n'est pas disponible pour ce créneau");

    const booking = await this.db.roomBooking.create({
      data: {
        roomId: dto.roomId,
        bookedById: actor.id,
        startAt: start,
        endAt: end,
        ...(dto.purpose !== undefined ? { purpose: dto.purpose } : {}),
      },
      include: {
        room: { select: { id: true, name: true, location: true } },
        bookedBy: { select: { id: true, displayName: true, email: true } },
      },
    });

    void this.audit.log({
      action: "ROOM_BOOKED" as AuditAction,
      userId: actor.id,
      entityId: dto.roomId,
      metadata: { startAt: dto.startAt, endAt: dto.endAt },
    });
    return booking;
  }

  async cancelBooking(bookingId: string, actor: AuthenticatedUser) {
    const booking = await this.db.roomBooking.findFirst({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Réservation introuvable");
    if (
      (booking as RoomBookingRecord).bookedById !== actor.id &&
      !actor.permissions.includes("CALENDAR:MANAGE")
    )
      throw new ConflictException("Accès non autorisé");

    const updated = await this.db.roomBooking.update({
      where: { id: bookingId },
      data: { cancelledAt: new Date() },
    });

    void this.audit.log({
      action: "ROOM_BOOKING_CANCELLED" as AuditAction,
      userId: actor.id,
      entityId: bookingId,
    });
    return updated;
  }

  async getRoomAvailability(roomId: string, from: string, to: string) {
    const room = await this.db.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Salle introuvable");

    const bookings = await this.db.roomBooking.findMany({
      where: {
        roomId,
        cancelledAt: null,
        startAt: { lt: new Date(to) },
        endAt: { gt: new Date(from) },
      },
      orderBy: { startAt: "asc" },
      include: { bookedBy: { select: { id: true, displayName: true } } },
    });

    return { room, bookings };
  }
}
