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

import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { QueryDepartmentsDto } from "./dto/query-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type { DepartmentsPage } from "./departments.service";
import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request } from "express";

const ip = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "";

@Controller("v1/departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions("DEPARTMENT:READ")
  findAll(@Query() query: QueryDepartmentsDto): Promise<DepartmentsPage> {
    return this.departmentsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("DEPARTMENT:READ")
  findOne(@Param("id") id: string): Promise<unknown> {
    return this.departmentsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("DEPARTMENT:CREATE")
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.departmentsService.create(dto, user, ip(req));
  }

  @Patch(":id")
  @RequirePermissions("DEPARTMENT:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.departmentsService.update(id, dto, user, ip(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("DEPARTMENT:DEACTIVATE")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    return this.departmentsService.deactivate(id, user, ip(req));
  }
}
