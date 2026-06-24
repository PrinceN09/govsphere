import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";

import { CreateUserDto } from "./dto/create-user.dto";
import { InviteEmployeeDto } from "./dto/invite-employee.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UsersService } from "./users.service";
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
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── List ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions("USER:READ_MINISTRY")
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("ministryId") ministryId?: string,
    @Query("search") search?: string,
  ): Promise<unknown> {
    const filters: {
      page?: number;
      limit?: number;
      status?: string;
      role?: string;
      ministryId?: string;
      search?: string;
    } = {};
    if (page !== undefined) filters.page = parseInt(page, 10);
    if (limit !== undefined) filters.limit = parseInt(limit, 10);
    if (status !== undefined) filters.status = status;
    if (role !== undefined) filters.role = role;
    if (ministryId !== undefined) filters.ministryId = ministryId;
    if (search !== undefined) filters.search = search;
    return this.usersService.findMany(user, filters);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get(":id")
  @RequirePermissions("USER:READ_MINISTRY")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.usersService.getFullProfile(id, user);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions("USER:CREATE")
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.create(dto, user, ip(req));
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  @Post("invite")
  @RequirePermissions("USER:CREATE")
  invite(
    @Body() dto: InviteEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.invite(dto, user, ip(req));
  }

  @Post(":id/resend-invitation")
  @RequirePermissions("USER:CREATE")
  resendInvitation(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.resendInvitation(id, user, ip(req));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @Patch(":id/activate")
  @RequirePermissions("USER:CREATE")
  activate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.activate(id, user, ip(req));
  }

  @Patch(":id/status")
  @RequirePermissions("USER:DEACTIVATE")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.updateStatus(id, dto, user, ip(req));
  }

  @Patch(":id/archive")
  @RequirePermissions("USER:DEACTIVATE")
  archive(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.archive(id, user, ip(req));
  }

  @Patch(":id/unlock")
  @RequirePermissions("USER:UNLOCK")
  unlockAccount(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.usersService.unlockAccount(id, user, ip(req));
  }
}
