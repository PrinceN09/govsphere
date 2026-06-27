/**
 * Prinodia Meet v1.5.0 — MeetRecordingsService
 *
 * Recording lifecycle: start → processing → ready. Designed for future AI
 * pipeline integration (transcript generation, summary extraction).
 */

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { UpdateRecordingDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const RECORDING_SELECT = {
  id: true,
  meetingId: true,
  startedById: true,
  startedBy: { select: { id: true, displayName: true } },
  status: true,
  storageKey: true,
  filename: true,
  durationSeconds: true,
  sizeBytes: true,
  mimeType: true,
  startedAt: true,
  stoppedAt: true,
  processedAt: true,
  downloadUrl: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MeetRecordingsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingRecording.findMany({
      where: { meetingId },
      orderBy: { startedAt: "desc" },
      select: RECORDING_SELECT,
    });
  }

  async start(meetingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingRecording.create({
      data: {
        meetingId,
        startedById: actor.id,
        status: "RECORDING",
        startedAt: new Date(),
      },
      select: RECORDING_SELECT,
    });
  }

  async stop(recordingId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rec = await this.db.meetingRecording.findUnique({
      where: { id: recordingId },
      select: { id: true, startedById: true, status: true },
    });
    if (!rec) throw new NotFoundException("Recording not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingRecording.update({
      where: { id: recordingId },
      data: { status: "PROCESSING", stoppedAt: new Date() },
      select: RECORDING_SELECT,
    });
  }

  async get(recordingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rec = await this.db.meetingRecording.findUnique({
      where: { id: recordingId },
      select: RECORDING_SELECT,
    });
    if (!rec) throw new NotFoundException("Recording not found");
    return rec;
  }

  async update(recordingId: string, dto: UpdateRecordingDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rec = await this.db.meetingRecording.findUnique({
      where: { id: recordingId },
      select: { id: true, startedById: true },
    });
    if (!rec) throw new NotFoundException("Recording not found");

    const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!isAdmin && rec.startedById !== actor.id) {
      throw new ForbiddenException("Cannot update this recording");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingRecording.update({
      where: { id: recordingId },
      data: {
        ...(dto.storageKey !== undefined ? { storageKey: dto.storageKey } : {}),
        ...(dto.filename !== undefined ? { filename: dto.filename } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.downloadUrl !== undefined ? { downloadUrl: dto.downloadUrl } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
        status: "READY",
        processedAt: new Date(),
      },
      select: RECORDING_SELECT,
    });
  }
}
