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
  Req,
} from "@nestjs/common";

import { CreateMinistryDto } from "./dto/create-ministry.dto";
import { QueryMinistriesDto } from "./dto/query-ministry.dto";
import { UpdateMinistryDto } from "./dto/update-ministry.dto";
import { MinistriesService } from "./ministries.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type { MinistriesPage } from "./ministries.service";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/ministries")
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  // ── Read ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions("MINISTRY:READ")
  findAll(@Query() query: QueryMinistriesDto): Promise<MinistriesPage> {
    return this.ministriesService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("MINISTRY:READ")
  findOne(@Param("id") id: string): Promise<unknown> {
    return this.ministriesService.findById(id);
  }

  @Get("code/:code")
  @RequirePermissions("MINISTRY:READ")
  findByCode(@Param("code") code: string): Promise<unknown> {
    return this.ministriesService.findByCode(code);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("MINISTRY:CREATE")
  create(
    @Body() dto: CreateMinistryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.ministriesService.create(dto, user, ip(req));
  }

  @Patch(":id")
  @RequirePermissions("MINISTRY:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMinistryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.ministriesService.update(id, dto, user, ip(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("MINISTRY:DEACTIVATE")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    return this.ministriesService.deactivate(id, user, ip(req));
  }
}
