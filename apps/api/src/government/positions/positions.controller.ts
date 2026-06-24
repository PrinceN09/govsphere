import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import { CreatePositionDto } from "./dto/create-position.dto";
import { QueryPositionsDto } from "./dto/query-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";
import { PositionsService } from "./positions.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type { PositionsPage } from "./positions.service";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/positions")
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @RequirePermissions("POSITION:READ")
  findAll(@Query() query: QueryPositionsDto): Promise<PositionsPage> {
    return this.positionsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("POSITION:READ")
  findOne(@Param("id") id: string): Promise<unknown> {
    return this.positionsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("POSITION:CREATE")
  create(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.positionsService.create(dto, user, ip(req));
  }

  @Patch(":id")
  @RequirePermissions("POSITION:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.positionsService.update(id, dto, user, ip(req));
  }
}
