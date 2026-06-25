import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";

import { ConversationsService } from "./conversations.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type {
  CreateConversationDto,
  DirectMessageCursorDto,
  SendDirectMessageDto,
} from "./dto/conversation.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1/conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  /** GET /v1/conversations — My conversations (DMs + groups) */
  @Get()
  findMine(@CurrentUser() actor: AuthenticatedUser) {
    return this.conversations.findMine(actor);
  }

  /** POST /v1/conversations/direct/:userId — Get or create DM */
  @Post("direct/:userId")
  @HttpCode(HttpStatus.OK)
  createOrGetDirect(@Param("userId") userId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.conversations.createOrGetDirect(userId, actor);
  }

  /** POST /v1/conversations/group */
  @Post("group")
  createGroup(@Body() dto: CreateConversationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.conversations.createGroup(dto, actor);
  }

  /** POST /v1/conversations/:id/messages */
  @Post(":id/messages")
  sendMessage(
    @Param("id") id: string,
    @Body() dto: SendDirectMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.conversations.sendMessage(id, dto, actor);
  }

  /** GET /v1/conversations/:id/messages */
  @Get(":id/messages")
  getMessages(
    @Param("id") id: string,
    @Query() query: DirectMessageCursorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.conversations.getMessages(id, query, actor);
  }

  /** POST /v1/conversations/:id/read */
  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.conversations.markRead(id, actor);
  }
}
