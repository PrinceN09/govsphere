/**
 * CanvasService — unit tests
 * v1.6.0 — Prinodia Canvas Foundation
 *
 * Tests cover: createBoard, listBoards, getBoard, updateBoard, deleteBoard,
 * createFromMeeting, createFromChannel, listBoardsForMeeting,
 * listBoardsForChannel, listTemplates, and access guards.
 */

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { CanvasService } from "./canvas.service";
import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../common/types/auth.types";

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockCanvasBoard = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};
const mockCanvasParticipant = {
  create: jest.fn(),
  findUnique: jest.fn(),
  upsert: jest.fn(),
  count: jest.fn(),
};
const mockCanvasTemplate = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockMeeting = {
  findUnique: jest.fn(),
};
const mockChannel = {
  findUnique: jest.fn(),
};

const mockPrisma = {
  canvasBoard: mockCanvasBoard,
  canvasParticipant: mockCanvasParticipant,
  canvasTemplate: mockCanvasTemplate,
  meeting: mockMeeting,
  channel: mockChannel,
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const actor: AuthenticatedUser = {
  id: "user-1",
  email: "editor@gov.cd",
  matriculeNumber: "AGT-001",
  role: "EMPLOYEE",
  roleWeight: 10,
  ministryId: null,
  departmentId: null,
  divisionId: null,
  sessionId: "sess-abc",
  permissions: [],
  mfaEnabled: false,
};

const adminActor: AuthenticatedUser = {
  ...actor,
  id: "admin-1",
  role: "SUPER_ADMIN",
  roleWeight: 100,
};

const boardRow = {
  id: "board-1",
  organizationId: "org-1",
  ownerId: "user-1",
  title: "Mon tableau",
  boardType: "WHITEBOARD",
  status: "ACTIVE",
  isPublic: false,
  isLocked: false,
  elementCount: 0,
  lastActivityAt: new Date(),
  background: "#FFFFFF",
  deletedAt: null,
  owner: { id: "user-1", displayName: "Alice", avatarUrl: null },
  participants: [],
  _count: { elements: 0, comments: 0, sessions: 0 },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("CanvasService", () => {
  let service: CanvasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanvasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<CanvasService>(CanvasService);
  });

  // ── createBoard ─────────────────────────────────────────────────────────

  describe("createBoard", () => {
    it("creates a board and adds owner as OWNER participant", async () => {
      mockCanvasBoard.create.mockResolvedValue(boardRow);
      mockCanvasParticipant.create.mockResolvedValue({ id: "p-1" });

      const result = await service.createBoard({ title: "Mon tableau" }, actor);

      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "Mon tableau", ownerId: "user-1" }),
        }),
      );
      expect(mockCanvasParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ boardId: "board-1", userId: "user-1", role: "OWNER" }),
        }),
      );
      expect(result).toEqual(boardRow);
    });

    it("defaults boardType to WHITEBOARD", async () => {
      mockCanvasBoard.create.mockResolvedValue(boardRow);
      mockCanvasParticipant.create.mockResolvedValue({ id: "p-1" });

      await service.createBoard({ title: "Test" }, actor);

      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ boardType: "WHITEBOARD" }),
        }),
      );
    });

    it("uses meetingId when provided", async () => {
      mockCanvasBoard.create.mockResolvedValue({ ...boardRow, meetingId: "meet-1" });
      mockCanvasParticipant.create.mockResolvedValue({ id: "p-1" });

      await service.createBoard({ title: "Meeting Board", meetingId: "meet-1" }, actor);

      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ meetingId: "meet-1" }),
        }),
      );
    });
  });

  // ── listBoards ──────────────────────────────────────────────────────────

  describe("listBoards", () => {
    it("returns paginated boards", async () => {
      mockCanvasBoard.findMany.mockResolvedValue([boardRow]);
      mockCanvasBoard.count.mockResolvedValue(1);

      const result = await service.listBoards(actor, 1, 20);

      expect(result.boards).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("returns empty when no boards", async () => {
      mockCanvasBoard.findMany.mockResolvedValue([]);
      mockCanvasBoard.count.mockResolvedValue(0);

      const result = await service.listBoards(actor, 1, 20);
      expect(result.boards).toHaveLength(0);
    });
  });

  // ── getBoard ────────────────────────────────────────────────────────────

  describe("getBoard", () => {
    it("returns board when participant exists", async () => {
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce(boardRow) // getBoard
        .mockResolvedValueOnce({ ownerId: "user-1", isPublic: false }); // assertBoardAccess
      mockCanvasParticipant.findUnique.mockResolvedValue({ role: "OWNER" });

      const result = await service.getBoard("board-1", actor);
      expect(result).toEqual(boardRow);
    });

    it("throws NotFoundException when board missing", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue(null);

      await expect(service.getBoard("bad-id", actor)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when board soft-deleted", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue({ ...boardRow, deletedAt: new Date() });

      await expect(service.getBoard("board-1", actor)).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when not a participant and not public", async () => {
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce({ ...boardRow, deletedAt: null })
        .mockResolvedValueOnce({ ownerId: "other-user", isPublic: false });
      mockCanvasParticipant.findUnique.mockResolvedValue(null);

      await expect(service.getBoard("board-1", actor)).rejects.toThrow(ForbiddenException);
    });

    it("allows access to public boards without participation", async () => {
      const publicBoard = { ...boardRow, isPublic: true, deletedAt: null };
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce(publicBoard)
        .mockResolvedValueOnce({ ownerId: "other-user", isPublic: true });
      mockCanvasParticipant.findUnique.mockResolvedValue(null);

      const result = await service.getBoard("board-1", actor);
      expect(result).toEqual(publicBoard);
    });

    it("SUPER_ADMIN bypasses access check", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue({ ...boardRow, deletedAt: null });
      // No participant mock needed — SUPER_ADMIN returns early
      const result = await service.getBoard("board-1", adminActor);
      expect(result).toEqual({ ...boardRow, deletedAt: null });
    });
  });

  // ── updateBoard ─────────────────────────────────────────────────────────

  describe("updateBoard", () => {
    it("updates board when user is editor", async () => {
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce({ id: "board-1", status: "ACTIVE", deletedAt: null }) // getBoardOrThrow
        .mockResolvedValueOnce({ ownerId: "other-user" }) // assertEditorOrOwner
        .mockResolvedValueOnce({ ...boardRow, title: "Nouveau titre" }); // update result
      mockCanvasParticipant.findUnique.mockResolvedValue({ role: "EDITOR" });
      mockCanvasBoard.update.mockResolvedValue({ ...boardRow, title: "Nouveau titre" });

      await service.updateBoard("board-1", { title: "Nouveau titre" }, actor);
      expect(mockCanvasBoard.update).toHaveBeenCalled();
    });

    it("throws ForbiddenException when viewer tries to update", async () => {
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce({ id: "board-1", status: "ACTIVE", deletedAt: null })
        .mockResolvedValueOnce({ ownerId: "other-user" });
      mockCanvasParticipant.findUnique.mockResolvedValue({ role: "VIEWER" });

      await expect(service.updateBoard("board-1", { title: "Hack" }, actor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── deleteBoard ─────────────────────────────────────────────────────────

  describe("deleteBoard", () => {
    it("soft-deletes board when owner", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue({
        id: "board-1",
        ownerId: "user-1",
        status: "ACTIVE",
        deletedAt: null,
      });
      mockCanvasBoard.update.mockResolvedValue({ ...boardRow, deletedAt: new Date() });

      const result = await service.deleteBoard("board-1", actor);
      expect(result).toEqual({ deleted: true });
      expect(mockCanvasBoard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "board-1" },
          data: expect.objectContaining({ status: "DELETED" }),
        }),
      );
    });

    it("throws ForbiddenException when non-owner tries to delete", async () => {
      mockCanvasBoard.findUnique
        .mockResolvedValueOnce({ id: "board-1", status: "ACTIVE", deletedAt: null })
        .mockResolvedValueOnce({ ownerId: "other-user" });

      await expect(service.deleteBoard("board-1", actor)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── createFromMeeting ───────────────────────────────────────────────────

  describe("createFromMeeting", () => {
    it("creates board from meeting and adds all participants", async () => {
      mockMeeting.findUnique.mockResolvedValue({
        id: "meet-1",
        title: "Stand-up",
        organizerId: "user-1",
        participants: [{ userId: "user-2" }, { userId: "user-3" }],
      });
      mockCanvasBoard.create.mockResolvedValue({
        ...boardRow,
        meetingId: "meet-1",
        boardType: "MEETING_BOARD",
      });
      mockCanvasParticipant.upsert.mockResolvedValue({ id: "p-1" });

      await service.createFromMeeting("meet-1", {}, actor);

      expect(mockMeeting.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "meet-1" } }),
      );
      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ meetingId: "meet-1", boardType: "MEETING_BOARD" }),
        }),
      );
      // owner + 2 participants = 3 upserts
      expect(mockCanvasParticipant.upsert).toHaveBeenCalledTimes(3);
    });

    it("throws NotFoundException when meeting not found", async () => {
      mockMeeting.findUnique.mockResolvedValue(null);

      await expect(service.createFromMeeting("bad-meet", {}, actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("uses custom title when provided", async () => {
      mockMeeting.findUnique.mockResolvedValue({
        id: "meet-1",
        title: "Sprint Review",
        organizerId: "user-1",
        participants: [],
      });
      mockCanvasBoard.create.mockResolvedValue(boardRow);
      mockCanvasParticipant.upsert.mockResolvedValue({ id: "p-1" });

      await service.createFromMeeting("meet-1", { title: "Mon Canvas Sprint" }, actor);

      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "Mon Canvas Sprint" }),
        }),
      );
    });
  });

  // ── createFromChannel ───────────────────────────────────────────────────

  describe("createFromChannel", () => {
    it("creates board linked to channel", async () => {
      mockChannel.findUnique.mockResolvedValue({ id: "ch-1", name: "general" });
      mockCanvasBoard.create.mockResolvedValue({ ...boardRow, channelId: "ch-1" });
      mockCanvasParticipant.create.mockResolvedValue({ id: "p-1" });

      await service.createFromChannel("ch-1", {}, actor);

      expect(mockCanvasBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ channelId: "ch-1" }),
        }),
      );
    });

    it("throws NotFoundException when channel not found", async () => {
      mockChannel.findUnique.mockResolvedValue(null);

      await expect(service.createFromChannel("bad-ch", {}, actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listBoardsForMeeting ────────────────────────────────────────────────

  describe("listBoardsForMeeting", () => {
    it("returns boards for the meeting", async () => {
      mockCanvasBoard.findMany.mockResolvedValue([boardRow]);

      const result = await service.listBoardsForMeeting("meet-1", actor);

      expect(mockCanvasBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ meetingId: "meet-1" }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("returns empty when no boards for meeting", async () => {
      mockCanvasBoard.findMany.mockResolvedValue([]);

      const result = await service.listBoardsForMeeting("meet-1", actor);
      expect(result).toHaveLength(0);
    });
  });

  // ── listBoardsForChannel ────────────────────────────────────────────────

  describe("listBoardsForChannel", () => {
    it("returns boards for the channel", async () => {
      mockCanvasBoard.findMany.mockResolvedValue([{ ...boardRow, channelId: "ch-1" }]);

      const result = await service.listBoardsForChannel("ch-1", actor);

      expect(mockCanvasBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channelId: "ch-1" }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── listTemplates ───────────────────────────────────────────────────────

  describe("listTemplates", () => {
    it("returns all public templates", async () => {
      const tpl = { id: "tpl-1", name: "Base", boardType: "WHITEBOARD", isPublic: true };
      mockCanvasTemplate.findMany.mockResolvedValue([tpl]);

      const result = await service.listTemplates();

      expect(mockCanvasTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("filters by boardType when provided", async () => {
      mockCanvasTemplate.findMany.mockResolvedValue([]);

      await service.listTemplates("CODE_BOARD");

      expect(mockCanvasTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ boardType: "CODE_BOARD" }),
        }),
      );
    });
  });

  // ── access helpers ──────────────────────────────────────────────────────

  describe("assertOwner", () => {
    it("allows SUPER_ADMIN without checking ownership", async () => {
      await expect(service.assertOwner("board-1", adminActor)).resolves.not.toThrow();
      expect(mockCanvasBoard.findUnique).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when non-owner", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue({ ownerId: "other-user" });

      await expect(service.assertOwner("board-1", actor)).rejects.toThrow(ForbiddenException);
    });

    it("allows board owner", async () => {
      mockCanvasBoard.findUnique.mockResolvedValue({ ownerId: "user-1" });

      await expect(service.assertOwner("board-1", actor)).resolves.not.toThrow();
    });
  });
});
