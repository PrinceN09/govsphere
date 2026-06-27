/**
 * Prinodia Meet v1.5.0 — MeetPollsService
 *
 * Live polls during a meeting: create, launch, vote, close, aggregate results.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { CreatePollDto, VotePollDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const POLL_SELECT = {
  id: true,
  meetingId: true,
  createdById: true,
  createdBy: { select: { id: true, displayName: true } },
  question: true,
  status: true,
  isAnonymous: true,
  allowMultiple: true,
  startedAt: true,
  closedAt: true,
  createdAt: true,
  options: {
    select: { id: true, text: true, order: true },
    orderBy: { order: "asc" as const },
  },
  _count: { select: { votes: true } },
} as const;

@Injectable()
export class MeetPollsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingPoll.findMany({
      where: { meetingId },
      orderBy: { createdAt: "desc" },
      select: POLL_SELECT,
    });
  }

  async create(meetingId: string, dto: CreatePollDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingPoll.create({
      data: {
        meetingId,
        createdById: actor.id,
        question: dto.question,
        isAnonymous: dto.isAnonymous ?? false,
        allowMultiple: dto.allowMultiple ?? false,
        options: {
          create: dto.options.map((o) => ({ text: o.text, order: o.order })),
        },
      },
      select: POLL_SELECT,
    });
  }

  async start(pollId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const poll = await this.db.meetingPoll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true, createdById: true },
    });
    if (!poll) throw new NotFoundException("Poll not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (poll.status !== "DRAFT") throw new BadRequestException("Poll already started or closed");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingPoll.update({
      where: { id: pollId },
      data: { status: "ACTIVE", startedAt: new Date() },
      select: POLL_SELECT,
    });
  }

  async close(pollId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const poll = await this.db.meetingPoll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true },
    });
    if (!poll) throw new NotFoundException("Poll not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (poll.status !== "ACTIVE") throw new BadRequestException("Poll is not active");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingPoll.update({
      where: { id: pollId },
      data: { status: "CLOSED", closedAt: new Date() },
      select: POLL_SELECT,
    });
  }

  async vote(pollId: string, dto: VotePollDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const poll = await this.db.meetingPoll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true, allowMultiple: true },
    });
    if (!poll) throw new NotFoundException("Poll not found");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (poll.status !== "ACTIVE") throw new BadRequestException("Poll is not accepting votes");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const option = await this.db.meetingPollOption.findFirst({
      where: { id: dto.optionId, pollId },
      select: { id: true },
    });
    if (!option) throw new BadRequestException("Option not found in this poll");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingPollVote.upsert({
      where: {
        pollId_optionId_userId: {
          pollId,
          optionId: dto.optionId,
          userId: actor.id,
        },
      },
      create: { pollId, optionId: dto.optionId, userId: actor.id },
      update: {},
      select: { id: true, optionId: true, userId: true, votedAt: true },
    });
  }

  async results(pollId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const poll = await this.db.meetingPoll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        question: true,
        status: true,
        isAnonymous: true,
        options: {
          select: {
            id: true,
            text: true,
            order: true,
            votes: { select: { userId: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!poll) throw new NotFoundException("Poll not found");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const totalVotes: number = poll.options.reduce(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (sum: number, o: { votes: unknown[] }) => sum + o.votes.length,
      0,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: poll.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      question: poll.question,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      status: poll.status,
      totalVotes,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      options: poll.options.map(
        (o: { id: string; text: string; order: number; votes: { userId: string }[] }) => ({
          id: o.id,
          text: o.text,
          order: o.order,
          votes: o.votes.length,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          percentage: totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          voters: poll.isAnonymous ? undefined : o.votes.map((v) => v.userId),
        }),
      ),
    };
  }
}
