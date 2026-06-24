import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import { CreateProvinceDto } from "./dto/create-province.dto";
import { UpdateProvinceDto } from "./dto/update-province.dto";
import { ProvincesService } from "./provinces.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/provinces")
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @RequirePermissions("PROVINCE:READ")
  findAll(): Promise<unknown[]> {
    return this.provincesService.findAll();
  }

  @Get(":id")
  @RequirePermissions("PROVINCE:READ")
  findOne(@Param("id") id: string): Promise<unknown> {
    return this.provincesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("PROVINCE:CREATE")
  create(
    @Body() dto: CreateProvinceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.provincesService.create(dto, user, ip(req));
  }

  @Patch(":id")
  @RequirePermissions("PROVINCE:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProvinceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.provincesService.update(id, dto, user, ip(req));
  }
}
