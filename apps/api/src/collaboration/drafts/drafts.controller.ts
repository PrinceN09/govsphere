/**
 * Prinodia Chat v1.4.0 — DraftsController
 *
 * PUT    /v1/channels/:channelId/draft        — upsert draft
 * GET    /v1/channels/:channelId/draft        — get draft
 * DELETE /v1/channels/:channelId/draft        — delete draft
 *
 * PUT    /v1/conversations/:conversationId/draft
 * GET    /v1/conversations/:conversationId/draft
 * DELETE /v1/conversations/:conversationId/draft
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";

import { DraftsService } from "./drafts.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type { UpsertDraftDto } from "./dto/draft.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1")
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  // ── Channel drafts ────────────────────────────────────────────────────────

  @Get("channels/:channelId/draft")
  getChannelDraft(
    @Param("channelId") channelId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.getChannelDraft(channelId, actor);
  }

  @Put("channels/:channelId/draft")
  @HttpCode(HttpStatus.OK)
  upsertChannelDraft(
    @Param("channelId") channelId: string,
    @Body() dto: UpsertDraftDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.upsertChannelDraft(channelId, dto, actor);
  }

  @Delete("channels/:channelId/draft")
  @HttpCode(HttpStatus.OK)
  deleteChannelDraft(
    @Param("channelId") channelId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.deleteChannelDraft(channelId, actor);
  }

  // ── Conversation drafts ───────────────────────────────────────────────────

  @Get("conversations/:conversationId/draft")
  getConversationDraft(
    @Param("conversationId") conversationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.getConversationDraft(conversationId, actor);
  }

  @Put("conversations/:conversationId/draft")
  @HttpCode(HttpStatus.OK)
  upsertConversationDraft(
    @Param("conversationId") conversationId: string,
    @Body() dto: UpsertDraftDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.upsertConversationDraft(conversationId, dto, actor);
  }

  @Delete("conversations/:conversationId/draft")
  @HttpCode(HttpStatus.OK)
  deleteConversationDraft(
    @Param("conversationId") conversationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drafts.deleteConversationDraft(conversationId, actor);
  }
}
