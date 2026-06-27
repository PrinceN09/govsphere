/**
 * BookmarksService — unit tests
 * v1.4.0 — Prinodia Chat Foundation
 */

import { BadRequestException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { BookmarksService } from "./bookmarks.service";
import { PrismaService } from "../../prisma/prisma.service";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockBookmark = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = { bookmark: mockBookmark };

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const actor = { id: "user-1", role: "EMPLOYEE" } as Parameters<BookmarksService["list"]>[0];

const messageBookmark = {
  id: "bm-1",
  messageId: "msg-1",
  dmId: null,
  note: null,
  createdAt: new Date().toISOString(),
  message: {
    id: "msg-1",
    content: "Hello",
    createdAt: new Date().toISOString(),
    channelId: "ch-1",
    sender: { id: "user-2", displayName: "Jean", avatarUrl: null },
  },
  dm: null,
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("BookmarksService", () => {
  let service: BookmarksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
    jest.clearAllMocks();
  });

  // ── list() ──────────────────────────────────────────────────────────────────

  describe("list()", () => {
    it("returns user bookmarks ordered by createdAt desc", async () => {
      mockBookmark.findMany.mockResolvedValueOnce([messageBookmark]);
      const result = await service.list(actor);
      expect(result).toEqual([messageBookmark]);
      expect(mockBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: actor.id },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("returns empty array when user has no bookmarks", async () => {
      mockBookmark.findMany.mockResolvedValueOnce([]);
      const result = await service.list(actor);
      expect(result).toEqual([]);
    });
  });

  // ── create() ────────────────────────────────────────────────────────────────

  describe("create()", () => {
    it("creates a message bookmark", async () => {
      mockBookmark.upsert.mockResolvedValueOnce({ id: "bm-1", messageId: "msg-1", dmId: null, note: null, createdAt: new Date() });
      const dto = { messageId: "msg-1" };
      const result = await service.create(dto, actor);
      expect(mockBookmark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_messageId: { userId: actor.id, messageId: "msg-1" } },
          create: expect.objectContaining({ userId: actor.id, messageId: "msg-1" }),
        }),
      );
      expect(result).toBeDefined();
    });

    it("creates a DM bookmark", async () => {
      mockBookmark.upsert.mockResolvedValueOnce({ id: "bm-2", messageId: null, dmId: "dm-1", note: null, createdAt: new Date() });
      const dto = { dmId: "dm-1" };
      const result = await service.create(dto, actor);
      expect(mockBookmark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_dmId: { userId: actor.id, dmId: "dm-1" } },
        }),
      );
      expect(result).toBeDefined();
    });

    it("throws BadRequestException when neither messageId nor dmId provided", async () => {
      await expect(service.create({}, actor)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when both messageId and dmId provided", async () => {
      await expect(
        service.create({ messageId: "msg-1", dmId: "dm-1" }, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it("stores optional note", async () => {
      mockBookmark.upsert.mockResolvedValueOnce({ id: "bm-3", messageId: "msg-2", dmId: null, note: "Important", createdAt: new Date() });
      const dto = { messageId: "msg-2", note: "Important" };
      await service.create(dto, actor);
      expect(mockBookmark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ note: "Important" }),
          update: expect.objectContaining({ note: "Important" }),
        }),
      );
    });
  });

  // ── remove() ────────────────────────────────────────────────────────────────

  describe("remove()", () => {
    it("deletes bookmark owned by the actor and returns { deleted: true }", async () => {
      mockBookmark.findUnique.mockResolvedValueOnce({ id: "bm-1", userId: actor.id });
      const result = await service.remove("bm-1", actor);
      expect(result).toEqual({ deleted: true });
      expect(mockBookmark.delete).toHaveBeenCalledWith({ where: { id: "bm-1" } });
    });

    it("returns { deleted: false } when bookmark not found", async () => {
      mockBookmark.findUnique.mockResolvedValueOnce(null);
      const result = await service.remove("bm-999", actor);
      expect(result).toEqual({ deleted: false });
      expect(mockBookmark.delete).not.toHaveBeenCalled();
    });

    it("returns { deleted: false } when bookmark belongs to another user", async () => {
      mockBookmark.findUnique.mockResolvedValueOnce({ id: "bm-1", userId: "other-user" });
      const result = await service.remove("bm-1", actor);
      expect(result).toEqual({ deleted: false });
      expect(mockBookmark.delete).not.toHaveBeenCalled();
    });
  });
});
