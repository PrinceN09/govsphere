import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";

import { PresenceService } from "./presence.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type { PresenceStatus } from "./presence.service";
import type { AuthenticatedUser } from "../../common/types/auth.types";

class SetPresenceDto {
  status!: PresenceStatus;
  ministryId?: string;
  officeId?: string;
}

@Controller("v1/presence")
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /** PUT /v1/presence — Set my presence status */
  @Post()
  @HttpCode(HttpStatus.OK)
  setPresence(@Body() dto: SetPresenceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.presence.setPresence(dto.status, actor, {
      ...(dto.ministryId ? { ministryId: dto.ministryId } : {}),
      ...(dto.officeId ? { officeId: dto.officeId } : {}),
    });
  }

  /** POST /v1/presence/heartbeat */
  @Post("heartbeat")
  @HttpCode(HttpStatus.OK)
  heartbeat(@CurrentUser() actor: AuthenticatedUser) {
    return this.presence.heartbeat(actor);
  }

  /** GET /v1/presence/me */
  @Get("me")
  getMyPresence(@CurrentUser() actor: AuthenticatedUser) {
    return this.presence.getPresence(actor.id);
  }

  /** GET /v1/presence/:userId */
  @Get(":userId")
  getPresence(@Param("userId") userId: string) {
    return this.presence.getPresence(userId);
  }

  /** GET /v1/presence?userIds=a,b,c */
  @Get()
  getBulk(@Query("userIds") userIds: string) {
    const ids = userIds ? userIds.split(",").filter(Boolean) : [];
    return this.presence.getBulkPresence(ids);
  }
}
