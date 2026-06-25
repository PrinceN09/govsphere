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
} from "@nestjs/common";

import { ChannelsService } from "./channels.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

import type {
  AddMemberDto,
  ChannelQueryDto,
  CreateChannelDto,
  UpdateChannelDto,
} from "./dto/channel.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1/channels")
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  /** POST /v1/channels — Create a new channel */
  @Post()
  @RequirePermissions("CHANNEL:CREATE")
  create(@Body() dto: CreateChannelDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.create(dto, actor);
  }

  /** GET /v1/channels — Browse all channels */
  @Get()
  findMany(@Query() query: ChannelQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.findMany(query, actor);
  }

  /** GET /v1/channels/mine — Channels the current user belongs to */
  @Get("mine")
  findMine(@CurrentUser() actor: AuthenticatedUser) {
    return this.channels.findMine(actor);
  }

  /** GET /v1/channels/:id */
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.findOne(id, actor);
  }

  /** PATCH /v1/channels/:id */
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateChannelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.channels.update(id, dto, actor);
  }

  /** POST /v1/channels/:id/archive */
  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  archive(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.archive(id, actor);
  }

  /** POST /v1/channels/:id/join */
  @Post(":id/join")
  @HttpCode(HttpStatus.OK)
  join(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.joinChannel(id, actor);
  }

  /** POST /v1/channels/:id/leave */
  @Post(":id/leave")
  @HttpCode(HttpStatus.OK)
  leave(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.leaveChannel(id, actor);
  }

  /** POST /v1/channels/:id/read */
  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.channels.markRead(id, actor);
  }

  /** POST /v1/channels/:id/members */
  @Post(":id/members")
  @RequirePermissions("CHANNEL:MANAGE_MEMBERS")
  addMember(
    @Param("id") id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.channels.addMember(id, dto, actor);
  }

  /** DELETE /v1/channels/:id/members/:userId */
  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("CHANNEL:MANAGE_MEMBERS")
  removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.channels.removeMember(id, userId, actor);
  }
}
