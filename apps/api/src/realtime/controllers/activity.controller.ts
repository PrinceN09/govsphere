/**
 * Prinodia Workspace — ActivityController v1.2.0
 *
 * REST endpoints for the organization activity feed.
 *
 * GET /v1/activity           — list activity events for own org
 * GET /v1/activity/me        — list own activity events
 */

import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ActivityService } from "../services/activity.service";

interface AuthRequest {
  user: { userId: string; orgId: string };
}

@Controller("v1/activity")
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async listOrgActivity(
    @Request() req: AuthRequest,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    return this.activityService.listForOrg(req.user.orgId, {
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 50,
      ...(before !== undefined ? { before } : {}),
    });
  }

  @Get("me")
  async listMyActivity(@Request() req: AuthRequest, @Query("limit") limit?: string) {
    return this.activityService.listForActor(req.user.userId, {
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 50,
    });
  }
}
