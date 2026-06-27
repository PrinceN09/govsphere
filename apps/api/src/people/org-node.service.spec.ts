/**
 * OrgNodeService — unit tests
 * v1.3.0 — Prinodia People Foundation
 */

import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { OrgNodeService } from "./org-node.service";
import { PrismaService } from "../prisma/prisma.service";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockOrgNode = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPrisma = {
  orgNode: mockOrgNode,
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const rootNode = {
  id: "node-root-1",
  organizationId: "org-1",
  name: "Ministère de la Santé",
  type: "DEPARTMENT",
  parentId: null,
  materializedPath: "/",
  isActive: true,
  sortOrder: 0,
  _count: { children: 2, employees: 5 },
};

const childNode = {
  id: "node-child-1",
  organizationId: "org-1",
  name: "Direction Générale",
  type: "DIVISION",
  parentId: "node-root-1",
  materializedPath: "/node-root-1/",
  isActive: true,
  sortOrder: 0,
  _count: { children: 0, employees: 3 },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrgNodeService", () => {
  let service: OrgNodeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrgNodeService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OrgNodeService>(OrgNodeService);
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a root node with materializedPath='/'", async () => {
      mockOrgNode.create.mockResolvedValueOnce(rootNode);

      const result = await service.create({
        organizationId: "org-1",
        name: "Ministère de la Santé",
        type: "DEPARTMENT",
      });

      expect(mockOrgNode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            materializedPath: "/",
            parentId: null,
          }),
        }),
      );
      expect(result).toEqual(rootNode);
    });

    it("computes materializedPath from parent when parentId provided", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce({
        id: "node-root-1",
        materializedPath: "/",
      });
      mockOrgNode.create.mockResolvedValueOnce(childNode);

      await service.create({
        organizationId: "org-1",
        name: "Direction Générale",
        type: "DIVISION",
        parentId: "node-root-1",
      });

      expect(mockOrgNode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            materializedPath: "/node-root-1/",
          }),
        }),
      );
    });

    it("throws NotFoundException when parentId does not exist", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({
          organizationId: "org-1",
          name: "Direction",
          type: "DIVISION",
          parentId: "nonexistent",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns list filtered by organizationId", async () => {
      mockOrgNode.findMany.mockResolvedValueOnce([rootNode]);

      const result = await service.findAll({ organizationId: "org-1" });

      expect(mockOrgNode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
        }),
      );
      expect(result).toEqual([rootNode]);
    });

    it("filters by type when type provided", async () => {
      mockOrgNode.findMany.mockResolvedValueOnce([childNode]);

      await service.findAll({ organizationId: "org-1", type: "DIVISION" });

      expect(mockOrgNode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "DIVISION" }),
        }),
      );
    });

    it("returns empty array when no nodes", async () => {
      mockOrgNode.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll({});

      expect(result).toEqual([]);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("returns node with children and parent included", async () => {
      const fullNode = {
        ...rootNode,
        parent: null,
        children: [childNode],
      };
      mockOrgNode.findUnique.mockResolvedValueOnce(fullNode);

      const result = await service.findOne("node-root-1");

      expect(mockOrgNode.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "node-root-1" },
          include: expect.objectContaining({ children: expect.any(Object) }),
        }),
      );
      expect(result).toEqual(fullNode);
    });

    it("throws NotFoundException when id not found", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne("bad-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTree ───────────────────────────────────────────────────────────────

  describe("getTree", () => {
    it("returns root-level nodes when no parentId given", async () => {
      mockOrgNode.findMany.mockResolvedValueOnce([rootNode]);

      const result = await service.getTree("org-1");

      expect(mockOrgNode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            parentId: null,
            isActive: true,
          }),
        }),
      );
      expect(result).toEqual([rootNode]);
    });

    it("returns children of a given parentId", async () => {
      mockOrgNode.findMany.mockResolvedValueOnce([childNode]);

      const result = await service.getTree("org-1", "node-root-1");

      expect(mockOrgNode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: "node-root-1",
          }),
        }),
      );
      expect(result).toEqual([childNode]);
    });
  });

  // ─── getAncestors ──────────────────────────────────────────────────────────

  describe("getAncestors", () => {
    it("returns empty array for root node (materializedPath='/')", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce({ materializedPath: "/" });

      const result = await service.getAncestors("node-root-1");

      expect(result).toEqual([]);
      // findMany should NOT have been called
      expect(mockOrgNode.findMany).not.toHaveBeenCalled();
    });

    it("extracts ancestor IDs from materializedPath and queries them", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce({
        materializedPath: "/node-root-1/",
      });
      mockOrgNode.findMany.mockResolvedValueOnce([rootNode]);

      const result = await service.getAncestors("node-child-1");

      expect(mockOrgNode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["node-root-1"] } },
        }),
      );
      expect(result).toEqual([rootNode]);
    });

    it("throws NotFoundException when node not found", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(null);

      await expect(service.getAncestors("bad-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates name without touching materializedPath", async () => {
      const updated = { ...rootNode, name: "Ministère de l'Éducation" };
      mockOrgNode.findUnique.mockResolvedValueOnce(rootNode); // findOne check
      mockOrgNode.update.mockResolvedValueOnce(updated);

      const result = await service.update("node-root-1", { name: "Ministère de l'Éducation" });

      expect(mockOrgNode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "node-root-1" } }),
      );
      expect(result.name).toBe("Ministère de l'Éducation");
    });

    it("recomputes materializedPath when parentId changes", async () => {
      const newParent = {
        id: "node-root-2",
        materializedPath: "/",
      };
      mockOrgNode.findUnique
        .mockResolvedValueOnce(childNode) // findOne check
        .mockResolvedValueOnce(newParent); // parent lookup
      mockOrgNode.update.mockResolvedValueOnce({
        ...childNode,
        parentId: "node-root-2",
        materializedPath: "/node-root-2/",
      });

      const result = await service.update("node-child-1", { parentId: "node-root-2" });

      expect(mockOrgNode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ materializedPath: "/node-root-2/" }),
        }),
      );
      expect(result.materializedPath).toBe("/node-root-2/");
    });

    it("throws NotFoundException when node to update not found", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(null);

      await expect(service.update("bad-id", { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("soft-deletes by setting isActive=false", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(rootNode); // findOne check
      mockOrgNode.update.mockResolvedValueOnce({ ...rootNode, isActive: false });

      const result = await service.remove("node-root-1");

      expect(mockOrgNode.update).toHaveBeenCalledWith({
        where: { id: "node-root-1" },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it("throws NotFoundException when node not found", async () => {
      mockOrgNode.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove("bad-id")).rejects.toThrow(NotFoundException);
    });
  });
});
