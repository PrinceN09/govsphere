/**
 * Prinodia Workspace — ConnectionsController v1.2.0
 *
 * REST endpoints for connection management.
 *
 * GET /v1/connections        — own active connections (multi-device view)
 * GET /v1/connections/org    — all org connections (admin)
 */

import { Controller, Get, Request, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ConnectionManagerService } from "../services/connection-manager.service";

interface AuthRequest {
  user: { userId: string; orgId: string; role: string };
}

@Controller("v1/connections")
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionManager: ConnectionManagerService) {}

  @Get()
  async getMyConnections(@Request() req: AuthRequest) {
    return this.connectionManager.getConnections(req.user.userId);
  }

  @Get("org")
  async getOrgConnections(@Request() req: AuthRequest) {
    // TODO: restrict to ADMIN / SUPER_ADMIN once RolesGuard is applied here
    return this.connectionManager.listOrgConnections(req.user.orgId);
  }
}
