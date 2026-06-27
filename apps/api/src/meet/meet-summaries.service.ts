/**
 * Prinodia Meet v1.5.0 — MeetSummariesService
 *
 * Post-meeting summaries: overview, decisions, action items, key points.
 * Designed for future AI generation pipeline — aiGenerated flag + structured
 * JSON fields ready for LLM output ingestion.
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { CreateSummaryDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const SUMMARY_SELECT = {
  id: true,
  meetingId: true,
  authorId: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
  overview: true,
  decisions: true,
  actionItems: true,
  keyPoints: true,
  nextSteps: true,
  aiGenerated: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MeetSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingSummary.findMany({
      where: { meetingId },
      orderBy: { createdAt: "desc" },
      select: SUMMARY_SELECT,
    });
  }

  async create(meetingId: string, dto: CreateSummaryDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingSummary.create({
      data: {
        meetingId,
        authorId: actor.id,
        overview: dto.overview ?? null,
        decisions: dto.decisions ?? [],
        actionItems: dto.actionItems ?? [],
        keyPoints: dto.keyPoints ?? [],
        nextSteps: dto.nextSteps ?? null,
        aiGenerated: false,
      },
      select: SUMMARY_SELECT,
    });
  }

  async publish(summaryId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const summary = await this.db.meetingSummary.findUnique({
      where: { id: summaryId },
      select: { id: true },
    });
    if (!summary) throw new NotFoundException("Summary not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingSummary.update({
      where: { id: summaryId },
      data: { publishedAt: new Date() },
      select: SUMMARY_SELECT,
    });
  }
}
