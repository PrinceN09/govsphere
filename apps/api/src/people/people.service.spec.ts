/**
 * PeopleService — unit tests
 * v1.3.0 — Prinodia People Foundation
 */

import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { PeopleService } from "./people.service";
import { PrismaService } from "../prisma/prisma.service";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockUser = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockEmployeeProfile = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  groupBy: jest.fn(),
};

const mockEmployeeSkill = {
  upsert: jest.fn(),
  delete: jest.fn(),
};

const mockSkill = {
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};

const mockPrisma = {
  user: mockUser,
  employeeProfile: mockEmployeeProfile,
  employeeSkill: mockEmployeeSkill,
  skill: mockSkill,
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const userFixture = {
  id: "user-1",
  firstName: "Marie",
  lastName: "Dupont",
  displayName: "Marie Dupont",
  email: "marie@gov.cd",
  avatarUrl: null,
  role: "EMPLOYEE",
  status: "ACTIVE",
  matriculeNumber: "AGT-001",
  employeeNumber: null,
  organizationId: "org-1",
  managerId: "user-manager-1",
  deletedAt: null,
};

const profileFixture = {
  id: "profile-1",
  userId: "user-1",
  organizationId: "org-1",
  workloadStatus: "AVAILABLE",
  vacationStatus: null,
  orgNode: { id: "node-1", name: "Direction Générale", type: "DIVISION" },
  skills: [],
};

const skillFixture = {
  id: "skill-ts",
  name: "TypeScript",
  slug: "typescript",
  category: "TECHNICAL",
  isActive: true,
};

const employeeSkillFixture = {
  id: "es-1",
  profileId: "profile-1",
  skillId: "skill-ts",
  level: "EXPERT",
  verified: false,
  skill: skillFixture,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PeopleService", () => {
  let service: PeopleService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PeopleService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns paginated people with default page/limit", async () => {
      mockUser.findMany.mockResolvedValueOnce([userFixture]);
      mockUser.count.mockResolvedValueOnce(1);

      const result = await service.findAll({ organizationId: "org-1" });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it("applies text search filter using q param", async () => {
      mockUser.findMany.mockResolvedValueOnce([userFixture]);
      mockUser.count.mockResolvedValueOnce(1);

      await service.findAll({ q: "marie" });

      expect(mockUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ matriculeNumber: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it("filters by workloadStatus using employeeProfile nested filter", async () => {
      mockUser.findMany.mockResolvedValueOnce([]);
      mockUser.count.mockResolvedValueOnce(0);

      await service.findAll({ workloadStatus: "BUSY" });

      expect(mockUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeProfile: { is: { workloadStatus: "BUSY" } },
          }),
        }),
      );
    });

    it("returns empty items and totalPages=1 when no results", async () => {
      mockUser.findMany.mockResolvedValueOnce([]);
      mockUser.count.mockResolvedValueOnce(0);

      const result = await service.findAll({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it("computes totalPages correctly for multi-page results", async () => {
      mockUser.findMany.mockResolvedValueOnce(Array.from({ length: 20 }, () => userFixture));
      mockUser.count.mockResolvedValueOnce(45);

      const result = await service.findAll({ limit: 20, page: 1 });

      expect(result.totalPages).toBe(3); // ceil(45/20)
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("returns user with profile, manager and subordinates", async () => {
      const fullUser = {
        ...userFixture,
        phone: null,
        username: "marie.dupont",
        createdAt: new Date().toISOString(),
        employeeProfile: profileFixture,
        manager: { id: "user-manager-1", displayName: "Chef" },
        subordinates: [],
      };
      mockUser.findUnique.mockResolvedValueOnce(fullUser);

      const result = await service.findOne("user-1");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = result as any;
      expect(r["id"]).toBe("user-1");
      expect(r["employeeProfile"]).toBeDefined();
      expect(r["manager"]).toEqual({ id: "user-manager-1", displayName: "Chef" });
    });

    it("throws NotFoundException when user not found", async () => {
      mockUser.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe("getProfile", () => {
    it("returns the employee profile when it exists", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce(profileFixture);

      const result = await service.getProfile("user-1");

      expect(result).toEqual(profileFixture);
    });

    it("returns null when no profile exists", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce(null);

      const result = await service.getProfile("user-no-profile");

      expect(result).toBeNull();
    });
  });

  // ─── upsertProfile ─────────────────────────────────────────────────────────

  describe("upsertProfile", () => {
    it("creates a profile for an existing user", async () => {
      mockUser.findUnique.mockResolvedValueOnce({
        id: "user-1",
        organizationId: "org-1",
      });
      mockEmployeeProfile.upsert.mockResolvedValueOnce(profileFixture);

      const result = await service.upsertProfile(
        "user-1",
        { workloadStatus: "AVAILABLE", bio: "Agent de santé" },
        "org-1",
      );

      expect(mockEmployeeProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          create: expect.objectContaining({ userId: "user-1", organizationId: "org-1" }),
        }),
      );
      expect(result).toEqual(profileFixture);
    });

    it("throws NotFoundException when user does not exist", async () => {
      mockUser.findUnique.mockResolvedValueOnce(null);

      await expect(service.upsertProfile("ghost", { bio: "..." }, "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── addSkill ──────────────────────────────────────────────────────────────

  describe("addSkill", () => {
    it("upserts a skill on the employee profile", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce({ id: "profile-1" });
      mockEmployeeSkill.upsert.mockResolvedValueOnce(employeeSkillFixture);

      const result = await service.addSkill("user-1", {
        skillId: "skill-ts",
        level: "EXPERT",
      });

      expect(mockEmployeeSkill.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId_skillId: { profileId: "profile-1", skillId: "skill-ts" } },
          create: expect.objectContaining({ level: "EXPERT" }),
          update: { level: "EXPERT" },
        }),
      );
      expect(result).toEqual(employeeSkillFixture);
    });

    it("throws NotFoundException when no profile exists for user", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addSkill("user-no-profile", { skillId: "skill-ts", level: "BEGINNER" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeSkill ───────────────────────────────────────────────────────────

  describe("removeSkill", () => {
    it("deletes the employee skill", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce({ id: "profile-1" });
      mockEmployeeSkill.delete.mockResolvedValueOnce({ id: "es-1" });

      await service.removeSkill("user-1", "skill-ts");

      expect(mockEmployeeSkill.delete).toHaveBeenCalledWith({
        where: { profileId_skillId: { profileId: "profile-1", skillId: "skill-ts" } },
      });
    });

    it("throws NotFoundException when profile not found", async () => {
      mockEmployeeProfile.findUnique.mockResolvedValueOnce(null);

      await expect(service.removeSkill("user-1", "skill-ts")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getWorkloadSummary ────────────────────────────────────────────────────

  describe("getWorkloadSummary", () => {
    it("returns counts per workload status including zero-counts", async () => {
      mockEmployeeProfile.groupBy.mockResolvedValueOnce([
        { workloadStatus: "AVAILABLE", _count: { _all: 12 } },
        { workloadStatus: "BUSY", _count: { _all: 3 } },
      ]);

      const result = await service.getWorkloadSummary("org-1");

      expect(result["AVAILABLE"]).toBe(12);
      expect(result["BUSY"]).toBe(3);
      // Zero-count statuses default to 0
      expect(result["NOT_ASSIGNED"]).toBe(0);
      expect(result["OVERLOADED"]).toBe(0);
    });

    it("returns all zeros when no profiles exist", async () => {
      mockEmployeeProfile.groupBy.mockResolvedValueOnce([]);

      const result = await service.getWorkloadSummary("org-1");

      expect(Object.values(result).every((v) => v === 0)).toBe(true);
    });
  });

  // ─── findSkills ────────────────────────────────────────────────────────────

  describe("findSkills", () => {
    it("returns paginated skills with default limit", async () => {
      mockSkill.findMany.mockResolvedValueOnce([skillFixture]);
      mockSkill.count.mockResolvedValueOnce(1);

      const result = await service.findSkills({});

      expect(result.items).toHaveLength(1);
      expect(result.limit).toBe(50);
    });

    it("filters by category", async () => {
      mockSkill.findMany.mockResolvedValueOnce([skillFixture]);
      mockSkill.count.mockResolvedValueOnce(1);

      await service.findSkills({ category: "TECHNICAL" });

      expect(mockSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "TECHNICAL" }),
        }),
      );
    });

    it("applies text search on name and slug", async () => {
      mockSkill.findMany.mockResolvedValueOnce([]);
      mockSkill.count.mockResolvedValueOnce(0);

      await service.findSkills({ q: "type" });

      expect(mockSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ slug: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  // ─── createSkill ───────────────────────────────────────────────────────────

  describe("createSkill", () => {
    it("creates a new skill in the catalog", async () => {
      mockSkill.create.mockResolvedValueOnce(skillFixture);

      const result = await service.createSkill({
        name: "TypeScript",
        slug: "typescript",
        category: "TECHNICAL",
      });

      expect(mockSkill.create).toHaveBeenCalledWith({
        data: { name: "TypeScript", slug: "typescript", category: "TECHNICAL" },
      });
      expect(result).toEqual(skillFixture);
    });
  });
});
