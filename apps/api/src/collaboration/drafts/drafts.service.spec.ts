/**
 * DraftsService — unit tests
 * v1.4.0 — Prinodia Chat Foundation
 */

import { Test, type TestingModule } from "@nestjs/testing";

import { DraftsService } from "./drafts.service";
import { PrismaService } from "../../prisma/prisma.service";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockDraft = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = {
  draft: mockDraft,
};

// ─── Fixture ──────────────────────────────────────────────────────────────────

const actor = { id: "user-1", role: "EMPLOYEE" } as Parameters<
  DraftsService["getChannelDraft"]
>[1];

const channelId = "channel-1";
const conversationId = "conv-1";

const draftFixture = {
  id: "draft-1",
  content: "Hello draft",
  replyToId: null,
  channelId,
  conversationId: null,
  updatedAt: new Date().toISOString(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("DraftsService", () => {
  let service: DraftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DraftsService>(DraftsService);
    jest.clearAllMocks();
  });

  // ── Channel drafts ──────────────────────────────────────────────────────────

  describe("getChannelDraft()", () => {
    it("returns the draft when it exists", async () => {
      mockDraft.findUnique.mockResolvedValueOnce(draftFixture);
      const result = await service.getChannelDraft(channelId, actor);
      expect(result).toEqual(draftFixture);
      expect(mockDraft.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_channelId: { userId: actor.id, channelId } },
        }),
      );
    });

    it("returns null when no draft exists", async () => {
      mockDraft.findUnique.mockResolvedValueOnce(null);
      const result = await service.getChannelDraft(channelId, actor);
      expect(result).toBeNull();
    });
  });

  describe("upsertChannelDraft()", () => {
    it("calls prisma.draft.upsert with correct data", async () => {
      mockDraft.upsert.mockResolvedValueOnce(draftFixture);
      const dto = { content: "Hello draft" };
      const result = await service.upsertChannelDraft(channelId, dto, actor);
      expect(result).toEqual(draftFixture);
      expect(mockDraft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_channelId: { userId: actor.id, channelId } },
          create: expect.objectContaining({ userId: actor.id, channelId, content: "Hello draft" }),
          update: expect.objectContaining({ content: "Hello draft" }),
        }),
      );
    });

    it("includes replyToId when provided", async () => {
      mockDraft.upsert.mockResolvedValueOnce({ ...draftFixture, replyToId: "msg-1" });
      const dto = { content: "Reply draft", replyToId: "msg-1" };
      await service.upsertChannelDraft(channelId, dto, actor);
      expect(mockDraft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ replyToId: "msg-1" }),
        }),
      );
    });
  });

  describe("deleteChannelDraft()", () => {
    it("deletes draft and returns { deleted: true } when it exists", async () => {
      mockDraft.findUnique.mockResolvedValueOnce({ id: "draft-1" });
      const result = await service.deleteChannelDraft(channelId, actor);
      expect(result).toEqual({ deleted: true });
      expect(mockDraft.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_channelId: { userId: actor.id, channelId } },
        }),
      );
    });

    it("returns { deleted: false } when no draft exists", async () => {
      mockDraft.findUnique.mockResolvedValueOnce(null);
      const result = await service.deleteChannelDraft(channelId, actor);
      expect(result).toEqual({ deleted: false });
      expect(mockDraft.delete).not.toHaveBeenCalled();
    });
  });

  // ── Conversation drafts ─────────────────────────────────────────────────────

  describe("getConversationDraft()", () => {
    it("returns the draft when it exists", async () => {
      const convDraft = { ...draftFixture, channelId: null, conversationId };
      mockDraft.findUnique.mockResolvedValueOnce(convDraft);
      const result = await service.getConversationDraft(conversationId, actor);
      expect(result).toEqual(convDraft);
      expect(mockDraft.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_conversationId: { userId: actor.id, conversationId } },
        }),
      );
    });

    it("returns null when no draft exists", async () => {
      mockDraft.findUnique.mockResolvedValueOnce(null);
      const result = await service.getConversationDraft(conversationId, actor);
      expect(result).toBeNull();
    });
  });

  describe("upsertConversationDraft()", () => {
    it("calls prisma.draft.upsert with correct conversationId", async () => {
      const convDraft = { ...draftFixture, channelId: null, conversationId };
      mockDraft.upsert.mockResolvedValueOnce(convDraft);
      const dto = { content: "DM draft" };
      const result = await service.upsertConversationDraft(conversationId, dto, actor);
      expect(result).toEqual(convDraft);
      expect(mockDraft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_conversationId: { userId: actor.id, conversationId } },
          create: expect.objectContaining({ conversationId, content: "DM draft" }),
        }),
      );
    });
  });

  describe("deleteConversationDraft()", () => {
    it("deletes draft and returns { deleted: true }", async () => {
      mockDraft.findUnique.mockResolvedValueOnce({ id: "draft-2" });
      const result = await service.deleteConversationDraft(conversationId, actor);
      expect(result).toEqual({ deleted: true });
      expect(mockDraft.delete).toHaveBeenCalled();
    });

    it("returns { deleted: false } when no draft found", async () => {
      mockDraft.findUnique.mockResolvedValueOnce(null);
      const result = await service.deleteConversationDraft(conversationId, actor);
      expect(result).toEqual({ deleted: false });
      expect(mockDraft.delete).not.toHaveBeenCalled();
    });
  });
});
