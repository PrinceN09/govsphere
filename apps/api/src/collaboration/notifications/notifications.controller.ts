import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";

import { NotificationFilter } from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** GET /v1/notifications */
  @Get()
  findMine(
    @Query("filter") filter: NotificationFilter,
    @Query("cursor") cursor: string,
    @Query("limit") limit: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.notifications.findMine(actor, filter, cursor, Number(limit) || 25);
  }

  /** GET /v1/notifications/unread-counts */
  @Get("unread-counts")
  getUnreadCounts(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.getUnreadCounts(actor);
  }

  /** GET /v1/notifications/mentions */
  @Get("mentions")
  getUnreadMentions(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.getUnreadMentions(actor);
  }

  /** POST /v1/notifications/:id/read */
  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markRead(id, actor);
  }

  /** POST /v1/notifications/read-all */
  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markAllRead(actor);
  }

  /** POST /v1/notifications/mentions/:id/read */
  @Post("mentions/:id/read")
  @HttpCode(HttpStatus.OK)
  markMentionRead(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markMentionRead(id, actor);
  }
}
