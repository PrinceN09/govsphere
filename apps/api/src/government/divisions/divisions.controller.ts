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

import { DivisionsService } from "./divisions.service";
import { CreateDivisionDto } from "./dto/create-division.dto";
import { QueryDivisionsDto } from "./dto/query-division.dto";
import { UpdateDivisionDto } from "./dto/update-division.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type { DivisionsPage } from "./divisions.service";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/divisions")
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  @Get()
  @RequirePermissions("DIVISION:READ")
  findAll(@Query() query: QueryDivisionsDto): Promise<DivisionsPage> {
    return this.divisionsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("DIVISION:READ")
  findOne(@Param("id") id: string): Promise<unknown> {
    return this.divisionsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("DIVISION:CREATE")
  create(
    @Body() dto: CreateDivisionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.divisionsService.create(dto, user, ip(req));
  }

  @Patch(":id")
  @RequirePermissions("DIVISION:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDivisionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.divisionsService.update(id, dto, user, ip(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("DIVISION:DEACTIVATE")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    return this.divisionsService.deactivate(id, user, ip(req));
  }
}
