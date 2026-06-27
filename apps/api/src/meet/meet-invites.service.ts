/**
 * Prinodia Meet v1.5.0 — MeetInvitesService
 *
 * Token-based invite links for joining meetings. Supports targeted email
 * invites, usage limits, and expiry. Guest users join via token validation.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type { CreateInviteDto } from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

const INVITE_SELECT = {
  id: true,
  meetingId: true,
  createdById: true,
  createdBy: { select: { id: true, displayName: true } },
  token: true,
  email: true,
  maxUses: true,
  uses: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class MeetInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  async list(meetingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingInvite.findMany({
      where: { meetingId },
      orderBy: { createdAt: "desc" },
      select: INVITE_SELECT,
    });
  }

  async create(meetingId: string, dto: CreateInviteDto, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.meetingInvite.create({
      data: {
        meetingId,
        createdById: actor.id,
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
      select: INVITE_SELECT,
    });
  }

  async validate(token: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const invite = await this.db.meetingInvite.findUnique({
      where: { token },
      select: {
        id: true,
        meetingId: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        revokedAt: true,
        meeting: { select: { id: true, title: true, status: true, isLocked: true } },
      },
    });
    if (!invite) throw new NotFoundException("Invalid invite token");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (invite.revokedAt) throw new BadRequestException("Invite has been revoked");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException("Invite has expired");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new BadRequestException("Invite usage limit reached");
    }

    // Increment usage count
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingInvite.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { id: invite.id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data: { uses: invite.uses + 1 },
    });

    return invite;
  }

  async revoke(inviteId: string, actor: AuthenticatedUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const invite = await this.db.meetingInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, createdById: true },
    });
    if (!invite) throw new NotFoundException("Invite not found");

    const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "GOVERNMENT_ADMIN";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!isAdmin && invite.createdById !== actor.id) {
      throw new ForbiddenException("Cannot revoke this invite");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.db.meetingInvite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }
}
