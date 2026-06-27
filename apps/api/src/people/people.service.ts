/**
 * Prinodia People — PeopleService v1.3.0
 *
 * People directory: search users enriched with EmployeeProfile,
 * plus EmployeeProfile upsert, skills management, and workload queries.
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import type {
  QueryPeopleDto,
  UpsertEmployeeProfileDto,
  AddSkillDto,
  QuerySkillsDto,
  CreateSkillDto,
} from "./dto/people.dto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): AnyPrisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma as any;
  }

  // ─── People Directory ─────────────────────────────────────────────────────

  async findAll(query: QueryPeopleDto) {
    const {
      q,
      organizationId,
      orgNodeId,
      workloadStatus,
      skillId,
      department,
      page = 1,
      limit = 20,
    } = query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { deletedAt: null };

    if (organizationId) where["organizationId"] = organizationId;
    if (department) where["departmentId"] = department;

    if (q) {
      where["OR"] = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { matriculeNumber: { contains: q, mode: "insensitive" } },
        { employeeNumber: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileFilter: Record<string, any> = {};
    if (workloadStatus) profileFilter["workloadStatus"] = workloadStatus;
    if (orgNodeId) profileFilter["orgNodeId"] = orgNodeId;
    if (skillId) profileFilter["skills"] = { some: { skillId } };

    const includeProfile = Object.keys(profileFilter).length > 0;
    if (includeProfile) {
      where["employeeProfile"] = { is: profileFilter };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
          matriculeNumber: true,
          employeeNumber: true,
          organizationId: true,
          managerId: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(this._profileSelect() as any),
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        matriculeNumber: true,
        employeeNumber: true,
        username: true,
        organizationId: true,
        managerId: true,
        createdAt: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(this._profileSelect(true) as any),
        // Reporting relations
        manager: {
          select: { id: true, displayName: true, avatarUrl: true, role: true },
        },
        subordinates: {
          where: { deletedAt: null },
          select: { id: true, displayName: true, avatarUrl: true, role: true, status: true },
          take: 20,
        },
      },
    });

    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  // ─── Employee Profile ─────────────────────────────────────────────────────

  async upsertProfile(userId: string, dto: UpsertEmployeeProfileDto, organizationId: string) {
    // Ensure user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.employeeProfile.upsert({
      where: { userId },
      create: {
        userId,
        organizationId: user.organizationId ?? organizationId,
        ...this._profileData(dto),
      },
      update: this._profileData(dto),
      include: {
        orgNode: { select: { id: true, name: true, type: true } },
        skills: {
          include: { skill: { select: { id: true, name: true, slug: true, category: true } } },
        },
      },
    });
  }

  async getProfile(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profile = await this.db.employeeProfile.findUnique({
      where: { userId },
      include: {
        orgNode: { select: { id: true, name: true, type: true } },
        skills: {
          include: { skill: { select: { id: true, name: true, slug: true, category: true } } },
          orderBy: { level: "desc" },
        },
      },
    });
    return profile ?? null;
  }

  // ─── Skills on a profile ─────────────────────────────────────────────────

  async addSkill(userId: string, dto: AddSkillDto) {
    // Ensure profile exists first
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profile = await this.db.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!profile) throw new NotFoundException(`EmployeeProfile for user ${userId} not found`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.employeeSkill.upsert({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { profileId_skillId: { profileId: profile.id as string, skillId: dto.skillId } },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      create: { profileId: profile.id as string, skillId: dto.skillId, level: dto.level },
      update: { level: dto.level },
      include: { skill: { select: { id: true, name: true, slug: true, category: true } } },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profile = await this.db.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!profile) throw new NotFoundException(`EmployeeProfile for user ${userId} not found`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.employeeSkill.delete({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { profileId_skillId: { profileId: profile.id as string, skillId } },
    });
  }

  // ─── Workload summary ────────────────────────────────────────────────────

  async getWorkloadSummary(organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rows = await this.db.employeeProfile.groupBy({
      by: ["workloadStatus"],
      where: { organizationId },
      _count: { _all: true },
    });

    const summary: Record<string, number> = {
      NOT_ASSIGNED: 0,
      AVAILABLE: 0,
      NORMAL: 0,
      BUSY: 0,
      OVERLOADED: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (rows as Array<{ workloadStatus: string; _count: { _all: number } }>).forEach((r) => {
      summary[r.workloadStatus] = r._count._all;
    });
    return summary;
  }

  // ─── Expert Finder ───────────────────────────────────────────────────────

  async findExperts(query: {
    skillId?: string;
    orgNodeId?: string;
    organizationId?: string;
    availability?: boolean;
    limit?: number;
  }) {
    const { skillId, orgNodeId, organizationId, availability, limit = 20 } = query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileWhere: Record<string, any> = {};
    if (orgNodeId) profileWhere["orgNodeId"] = orgNodeId;
    if (skillId) profileWhere["skills"] = { some: { skillId } };
    if (availability)
      profileWhere["workloadStatus"] = {
        in: ["NOT_ASSIGNED", "AVAILABLE", "NORMAL"],
      };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userWhere: Record<string, any> = { deletedAt: null };
    if (organizationId) userWhere["organizationId"] = organizationId;
    if (Object.keys(profileWhere).length > 0) {
      userWhere["employeeProfile"] = { is: profileWhere };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.prisma.user.findMany({
      where: userWhere,
      take: limit,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        organizationId: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(this._profileSelect(true) as any),
      },
      orderBy: { displayName: "asc" },
    });
  }

  // ─── Skills catalog ──────────────────────────────────────────────────────

  async findSkills(query: QuerySkillsDto) {
    const { q, category, page = 1, limit = 50 } = query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true };
    if (category) where["category"] = category;
    if (q)
      where["OR"] = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];

    const [items, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.db.skill.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.db.skill.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  createSkill(dto: CreateSkillDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.db.skill.create({ data: dto });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private _profileData(dto: UpsertEmployeeProfileDto) {
    return {
      bio: dto.bio ?? undefined,
      phone: dto.phone ?? undefined,
      mobile: dto.mobile ?? undefined,
      officeLocation: dto.officeLocation ?? undefined,
      timeZone: dto.timeZone ?? undefined,
      workingHours: dto.workingHours ?? undefined,
      orgNodeId: dto.orgNodeId ?? undefined,
      secondaryOrgNodeIds: dto.secondaryOrgNodeIds ?? undefined,
      workloadStatus: dto.workloadStatus ?? undefined,
      vacationStatus: dto.vacationStatus ?? undefined,
      vacationFrom: dto.vacationFrom ? new Date(dto.vacationFrom) : undefined,
      vacationUntil: dto.vacationUntil ? new Date(dto.vacationUntil) : undefined,
      availabilityNote: dto.availabilityNote ?? undefined,
      languages: dto.languages ?? undefined,
    };
  }

  private _profileSelect(includeSkills = false) {
    return {
      employeeProfile: {
        select: {
          id: true,
          bio: true,
          officeLocation: true,
          timeZone: true,
          workloadStatus: true,
          vacationStatus: true,
          vacationFrom: true,
          vacationUntil: true,
          availabilityNote: true,
          languages: true,
          orgNode: { select: { id: true, name: true, type: true } },
          ...(includeSkills
            ? {
                skills: {
                  include: {
                    skill: { select: { id: true, name: true, slug: true, category: true } },
                  },
                  orderBy: { level: "desc" },
                  take: 20,
                },
              }
            : {}),
        },
      },
    };
  }
}
