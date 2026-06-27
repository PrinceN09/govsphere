/**
 * Prinodia Chat v1.4.0 — BookmarksController
 *
 * GET    /v1/bookmarks          — list my bookmarks
 * POST   /v1/bookmarks          — save a message/dm
 * DELETE /v1/bookmarks/:id      — remove bookmark
 */

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";

import { BookmarksService } from "./bookmarks.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

import type { CreateBookmarkDto } from "./dto/bookmark.dto";
import type { AuthenticatedUser } from "../../common/types/auth.types";

@Controller("v1/bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.bookmarks.list(actor);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  create(@Body() dto: CreateBookmarkDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookmarks.create(dto, actor);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookmarks.remove(id, actor);
  }
}
