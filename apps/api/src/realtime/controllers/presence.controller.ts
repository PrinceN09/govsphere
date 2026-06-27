/**
 * Prinodia Workspace — PresenceController v1.2.0
 *
 * REST endpoints for presence — for clients that don't have a live WebSocket,
 * or for server-side rendering.
 *
 * GET  /v1/presence          — get own presence status
 * PATCH /v1/presence         — update own presence status
 * GET  /v1/presence/bulk     — get presence for a list of user IDs
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RealtimePresenceService } from "../services/presence.service";

import type { PresenceStatus } from "../services/presence.service";

interface AuthRequest {
  user: { userId: string; orgId: string };
}

class SetPresenceDto {
  status!: PresenceStatus;
  statusMessage?: string;
}

@Controller("v1/presence")
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: RealtimePresenceService) {}

  @Get()
  async getOwnPresence(@Request() req: AuthRequest) {
    return this.presenceService.getStatus(req.user.userId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async setPresence(@Request() req: AuthRequest, @Body() dto: SetPresenceDto) {
    return this.presenceService.setStatus(
      req.user.userId,
      req.user.orgId,
      dto.status,
      dto.statusMessage,
    );
  }

  @Get("bulk")
  async getBulkPresence(@Query("ids") ids: string) {
    const userIds = ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 100); // cap at 100 users
    return this.presenceService.getBulkStatus(userIds);
  }
}
