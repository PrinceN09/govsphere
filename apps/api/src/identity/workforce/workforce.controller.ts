import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";

import { ChangePositionDto } from "./dto/change-position.dto";
import { TransferEmployeeDto } from "./dto/transfer-employee.dto";
import { WorkforceService } from "./workforce.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";

import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  // ── Transfer (org reassignment) ───────────────────────────────────────────

  @Patch(":id/transfer")
  @RequirePermissions("USER:UPDATE")
  transfer(
    @Param("id") id: string,
    @Body() dto: TransferEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.workforceService.transfer(id, dto, user, ip(req));
  }

  // ── Change position ───────────────────────────────────────────────────────

  @Patch(":id/position")
  @RequirePermissions("USER:UPDATE")
  changePosition(
    @Param("id") id: string,
    @Body() dto: ChangePositionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.workforceService.changePosition(id, dto, user, ip(req));
  }

  // ── Transfer history ──────────────────────────────────────────────────────

  @Get(":id/transfers")
  @RequirePermissions("USER:READ_MINISTRY")
  getTransferHistory(@Param("id") id: string): Promise<unknown[]> {
    return this.workforceService.getTransferHistory(id);
  }
}
