import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { MessagesService } from "./messages.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type {
  AddReactionDto,
  EditMessageDto,
  MessageCursorQueryDto,
  MessageSearchDto,
  SendMessageDto,
} from "./dto/message.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1")
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // ── Channel messages ──────────────────────────────────────────────────────

  /** POST /v1/channels/:channelId/messages */
  @Post("channels/:channelId/messages")
  send(
    @Param("channelId") channelId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messages.send(channelId, dto, actor);
  }

  /** GET /v1/channels/:channelId/messages */
  @Get("channels/:channelId/messages")
  list(
    @Param("channelId") channelId: string,
    @Query() query: MessageCursorQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messages.list(channelId, query, actor);
  }

  /** GET /v1/channels/:channelId/pins */
  @Get("channels/:channelId/pins")
  getPinned(@Param("channelId") channelId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.getPinned(channelId, actor);
  }

  // ── Individual message operations ─────────────────────────────────────────

  /** PATCH /v1/messages/:id */
  @Patch("messages/:id")
  edit(
    @Param("id") id: string,
    @Body() dto: EditMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messages.edit(id, dto, actor);
  }

  /** DELETE /v1/messages/:id */
  @Delete("messages/:id")
  @HttpCode(HttpStatus.OK)
  delete(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.delete(id, actor);
  }

  /** POST /v1/messages/:id/reactions */
  @Post("messages/:id/reactions")
  @HttpCode(HttpStatus.OK)
  addReaction(
    @Param("id") id: string,
    @Body() dto: AddReactionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messages.addReaction(id, dto, actor);
  }

  /** DELETE /v1/messages/:id/reactions/:emoji */
  @Delete("messages/:id/reactions/:emoji")
  @HttpCode(HttpStatus.OK)
  removeReaction(
    @Param("id") id: string,
    @Param("emoji") emoji: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messages.removeReaction(id, emoji, actor);
  }

  /** POST /v1/messages/:id/pin */
  @Post("messages/:id/pin")
  @HttpCode(HttpStatus.OK)
  pin(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.pin(id, actor);
  }

  /** DELETE /v1/messages/:id/pin */
  @Delete("messages/:id/pin")
  @HttpCode(HttpStatus.OK)
  unpin(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.unpin(id, actor);
  }

  /** GET /v1/messages/:id/thread */
  @Get("messages/:id/thread")
  getThread(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.getThread(id, actor);
  }

  /** GET /v1/messages/:id/history */
  @Get("messages/:id/history")
  getHistory(@Param("id") id: string) {
    return this.messages.getHistory(id);
  }

  /** GET /v1/messages/search */
  @Get("messages/search")
  search(@Query() query: MessageSearchDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.messages.search(query, actor);
  }
}
