import * as crypto from "crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PermissionsService } from "../permissions/permissions.service";

import type { CreateUserDto } from "./dto/create-user.dto";
import type { InviteEmployeeDto } from "./dto/invite-employee.dto";
import type { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

const BCRYPT_ROUNDS = 12;
/** Invitation link expires after 7 days. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Safe user projection — never includes passwordHash, mfaSecret. */
const SAFE_USER_SELECT = {
  id: true,
  matriculeNumber: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  phone: true,
  userType: true,
  role: true,
  status: true,
  preferredLanguage: true,
  mfaEnabled: true,
  ministryId: true,
  departmentId: true,
  divisionId: true,
  officeId: true,
  managerId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Full relations to join on the profile page. */
const PROFILE_INCLUDE = {
  ministry: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  division: { select: { id: true, name: true, code: true } },
  office: { select: { id: true, name: true, code: true } },
  manager: {
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  },
  roleAssignments: {
    where: { isActive: true },
    select: {
      id: true,
      isActive: true,
      grantedAt: true,
      role: {
        select: { id: true, name: true, displayName: true, weight: true },
      },
    },
    orderBy: { grantedAt: "desc" as const },
  },
  loginHistory: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
    select: {
      id: true,
      success: true,
      failReason: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
    },
  },
  sessions: {
    where: { isActive: true },
    orderBy: { lastUsedAt: "desc" as const },
    select: {
      id: true,
      platform: true,
      ipAddress: true,
      userAgent: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  },
  employeeAssignments: {
    where: { isActive: true },
    select: {
      id: true,
      isPrimary: true,
      isActive: true,
      startDate: true,
      position: {
        select: { id: true, title: true, code: true, level: true },
      },
    },
    orderBy: { startDate: "desc" as const },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ---------------------------------------------------------------------------
  // GET PROFILE (for /auth/me)
  // ---------------------------------------------------------------------------

  async getProfile(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    const permissions = await this.permissionsService.resolvePermissionsForUser(userId);
    return { ...user, permissions };
  }

  // ---------------------------------------------------------------------------
  // GET FULL PROFILE (admin view — /users/:id)
  // ---------------------------------------------------------------------------

  async getFullProfile(id: string, requestingUser: AuthenticatedUser): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...SAFE_USER_SELECT,
        ...PROFILE_INCLUDE,
      },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    // Scope check
    if (
      requestingUser.roleWeight < 90 &&
      requestingUser.ministryId &&
      user.ministryId !== requestingUser.ministryId
    ) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    const permissions = await this.permissionsService.resolvePermissionsForUser(id);
    return { ...user, permissions };
  }

  // ---------------------------------------------------------------------------
  // LIST USERS (scoped)
  // ---------------------------------------------------------------------------

  async findMany(
    requestingUser: AuthenticatedUser,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      role?: string;
      ministryId?: string;
      search?: string;
    },
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (requestingUser.roleWeight < 90 && requestingUser.ministryId) {
      where["ministryId"] = requestingUser.ministryId;
    } else if (params.ministryId) {
      where["ministryId"] = params.ministryId;
    }

    if (params.status) where["status"] = params.status;
    if (params.role) where["role"] = params.role;

    if (params.search) {
      where["OR"] = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { matriculeNumber: { contains: params.search } },
        { displayName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...SAFE_USER_SELECT,
          ministry: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, displayName: true } },
        },
        skip,
        take: limit,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // FIND BY ID (lightweight — for compatibility)
  // ---------------------------------------------------------------------------

  async findById(id: string, requestingUser: AuthenticatedUser): Promise<unknown> {
    return this.getFullProfile(id, requestingUser);
  }

  // ---------------------------------------------------------------------------
  // CREATE USER (admin-only, generates temp password, status PENDING)
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateUserDto,
    createdBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<{ id: string; status: string; temporaryPassword: string }> {
    await this.assertEmailFree(dto.email);
    if (dto.matriculeNumber) await this.assertMatriculeFree(dto.matriculeNumber);

    const temporaryPassword = dto.initialPassword ?? this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    const displayName = `${dto.firstName} ${dto.lastName}`;

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        matriculeNumber: dto.matriculeNumber ?? null,
        passwordHash,
        userType: dto.userType ?? "GOVERNMENT_EMPLOYEE",
        role: "EMPLOYEE",
        status: "PENDING",
        preferredLanguage: dto.preferredLanguage ?? "fr",
        ministryId: dto.ministryId ?? null,
        departmentId: dto.departmentId ?? null,
        divisionId: dto.divisionId ?? null,
        officeId: dto.officeId ?? null,
        managerId: dto.managerId ?? null,
      },
      select: { id: true, status: true },
    });

    // If a position was specified, create an assignment
    if (dto.positionId) {
      await this.prisma.employeeAssignment.create({
        data: {
          userId: user.id,
          positionId: dto.positionId,
          startDate: new Date(),
          isPrimary: true,
          isActive: true,
          assignedById: createdBy.id,
        },
      });
    }

    this.auditService.log({
      userId: createdBy.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: user.id,
      metadata: {
        createdBy: createdBy.id,
        ministryId: dto.ministryId,
        departmentId: dto.departmentId,
      },
      ipAddress,
    });

    return { id: user.id, status: user.status, temporaryPassword };
  }

  // ---------------------------------------------------------------------------
  // INVITE EMPLOYEE (creates PENDING user + invitation token)
  // ---------------------------------------------------------------------------

  async invite(
    dto: InviteEmployeeDto,
    invitedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<{ id: string; invitationToken: string }> {
    await this.assertEmailFree(dto.email);

    // Create a stub user with no password — they'll set one via invitation link
    const placeholderHash = await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      BCRYPT_ROUNDS,
    );
    const displayName = `${dto.firstName} ${dto.lastName}`;

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        passwordHash: placeholderHash,
        role: "EMPLOYEE",
        status: "PENDING",
        preferredLanguage: "fr",
        ministryId: dto.ministryId ?? null,
        departmentId: dto.departmentId ?? null,
        divisionId: dto.divisionId ?? null,
        officeId: dto.officeId ?? null,
        managerId: dto.managerId ?? null,
      },
      select: { id: true },
    });

    const invitationToken = await this.createInvitationToken(user.id, invitedBy.id);

    this.auditService.log({
      userId: invitedBy.id,
      action: "EMPLOYEE_INVITED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email: dto.email, ministryId: dto.ministryId },
      ipAddress,
    });

    return { id: user.id, invitationToken };
  }

  // ---------------------------------------------------------------------------
  // RESEND INVITATION
  // ---------------------------------------------------------------------------

  async resendInvitation(
    targetUserId: string,
    requestedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<{ invitationToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, ministryId: true },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    if (user.status !== "PENDING") {
      throw new BadRequestException({
        error: "NOT_PENDING",
        message: "Invitations can only be resent to PENDING users",
      });
    }

    // Expire existing active invitations
    await this.prisma.employeeInvitation.updateMany({
      where: { userId: targetUserId, used: false },
      data: { expiresAt: new Date() },
    });

    const invitationToken = await this.createInvitationToken(targetUserId, requestedBy.id);

    this.auditService.log({
      userId: requestedBy.id,
      action: "EMPLOYEE_INVITATION_RESENT",
      entityType: "USER",
      entityId: targetUserId,
      ipAddress,
    });

    return { invitationToken };
  }

  // ---------------------------------------------------------------------------
  // ACTIVATE (PENDING → ACTIVE)
  // ---------------------------------------------------------------------------

  async activate(
    targetUserId: string,
    activatedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, ministryId: true },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    if (user.status !== "PENDING") {
      throw new BadRequestException({
        error: "NOT_PENDING",
        message: "Only PENDING users can be activated",
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null },
      select: SAFE_USER_SELECT,
    });

    this.auditService.log({
      userId: activatedBy.id,
      action: "EMPLOYEE_ACTIVATED",
      entityType: "USER",
      entityId: targetUserId,
      ipAddress,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // ARCHIVE (DEACTIVATED → ARCHIVED)
  // ---------------------------------------------------------------------------

  async archive(
    targetUserId: string,
    archivedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, ministryId: true },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    if (user.status !== "DEACTIVATED") {
      throw new BadRequestException({
        error: "NOT_DEACTIVATED",
        message: "Only DEACTIVATED users can be archived",
      });
    }

    // Revoke all remaining sessions
    await this.prisma.userSession.updateMany({
      where: { userId: targetUserId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: "ARCHIVED" },
      select: SAFE_USER_SELECT,
    });

    this.permissionsService.invalidateCache(targetUserId);

    this.auditService.log({
      userId: archivedBy.id,
      action: "EMPLOYEE_ARCHIVED",
      entityType: "USER",
      entityId: targetUserId,
      ipAddress,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // UPDATE STATUS (suspend / deactivate / reactivate)
  // ---------------------------------------------------------------------------

  async updateStatus(
    targetUserId: string,
    dto: UpdateUserStatusDto,
    updatedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, ministryId: true },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    if (
      updatedBy.roleWeight < 90 &&
      updatedBy.ministryId &&
      user.ministryId !== updatedBy.ministryId
    ) {
      throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: dto.status,
        ...(dto.status === "ACTIVE" ? { lockedUntil: null, failedLoginCount: 0 } : {}),
      },
      select: SAFE_USER_SELECT,
    });

    if (dto.status === "SUSPENDED" || dto.status === "DEACTIVATED") {
      await this.prisma.userSession.updateMany({
        where: { userId: targetUserId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
      this.permissionsService.invalidateCache(targetUserId);
    }

    const action =
      dto.status === "SUSPENDED"
        ? ("USER_SUSPENDED" as const)
        : dto.status === "DEACTIVATED"
          ? ("USER_DEACTIVATED" as const)
          : ("USER_REACTIVATED" as const);

    this.auditService.log({
      userId: updatedBy.id,
      action,
      entityType: "USER",
      entityId: targetUserId,
      metadata: { status: dto.status, reason: dto.reason },
      ipAddress,
    });

    return updatedUser;
  }

  // ---------------------------------------------------------------------------
  // UNLOCK ACCOUNT
  // ---------------------------------------------------------------------------

  async unlockAccount(
    targetUserId: string,
    unlockedBy: AuthenticatedUser,
    ipAddress: string,
  ): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException({ error: "USER_NOT_FOUND", message: "User not found" });

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: "ACTIVE", lockedUntil: null, failedLoginCount: 0 },
      select: SAFE_USER_SELECT,
    });

    this.auditService.log({
      userId: unlockedBy.id,
      action: "USER_UNLOCKED",
      entityType: "USER",
      entityId: targetUserId,
      metadata: { unlockedBy: unlockedBy.id },
      ipAddress,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async assertEmailFree(email: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException({
        error: "EMAIL_TAKEN",
        message: "Email address is already registered",
      });
    }
  }

  private async assertMatriculeFree(matricule: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { matriculeNumber: matricule },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException({
        error: "MATRICULE_TAKEN",
        message: "Matricule number is already registered",
      });
    }
  }

  private async createInvitationToken(userId: string, invitedById: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await this.prisma.employeeInvitation.create({
      data: {
        userId,
        tokenHash,
        invitedById,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    return rawToken;
  }

  private generateTemporaryPassword(): string {
    const chars = "abcdefghijkmnopqrstuvwxyz";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const special = "!@#$%&*";

    const pick = (set: string) => set[crypto.randomInt(set.length)] ?? set[0];

    const required = [pick(chars), pick(upper), pick(digits), pick(special)];
    const all = chars + upper + digits + special;
    const rest = Array.from({ length: 12 }, () => pick(all));

    return [...required, ...rest].sort(() => crypto.randomInt(3) - 1).join("");
  }
}
