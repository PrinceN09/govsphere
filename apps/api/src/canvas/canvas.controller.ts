/**
 * Prinodia Canvas v1.6.0 — CanvasController
 *
 * Route layout (all under /v1/canvas):
 *
 *   GET    /v1/canvas                                          list boards
 *   POST   /v1/canvas                                         create board
 *   GET    /v1/canvas/templates                               list templates
 *   POST   /v1/canvas/from-meeting/:meetingId                 create from meeting
 *   POST   /v1/canvas/from-chat/:channelId                    create from channel
 *   GET    /v1/canvas/:id                                     get board
 *   PATCH  /v1/canvas/:id                                     update board
 *   DELETE /v1/canvas/:id                                     delete board
 *
 *   GET    /v1/canvas/:id/elements                            list elements
 *   POST   /v1/canvas/:id/elements                            create element
 *   PATCH  /v1/canvas/:id/elements/:elementId                 update element
 *   DELETE /v1/canvas/:id/elements/:elementId                 delete element
 *   POST   /v1/canvas/:id/elements/:elementId/lock            lock element
 *   POST   /v1/canvas/:id/elements/:elementId/unlock          unlock element
 *   GET    /v1/canvas/:id/elements/:elementId/versions        version history
 *
 *   GET    /v1/canvas/:id/participants                        list participants
 *   POST   /v1/canvas/:id/participants                        add participant
 *   PATCH  /v1/canvas/:id/participants/:participantId         update role
 *   DELETE /v1/canvas/:id/participants/:participantId         remove participant
 *
 *   GET    /v1/canvas/:id/comments                           list comments
 *   POST   /v1/canvas/:id/comments                           add comment
 *   POST   /v1/canvas/:id/comments/:commentId/resolve        resolve comment
 *   DELETE /v1/canvas/:id/comments/:commentId                delete comment
 *
 *   GET    /v1/canvas/:id/exports                            list exports
 *   POST   /v1/canvas/:id/exports                            request export
 *   GET    /v1/canvas/:id/exports/:exportId                  get export status
 *
 *   GET    /v1/canvas/:id/shares                             list shares
 *   POST   /v1/canvas/:id/shares                             create share
 *   DELETE /v1/canvas/:id/shares/:shareId                    revoke share
 *   GET    /v1/canvas/share/:token                           resolve share token
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CanvasCommentsService } from "./canvas-comments.service";
import { CanvasElementsService } from "./canvas-elements.service";
import { CanvasExportsService } from "./canvas-exports.service";
import { CanvasParticipantsService } from "./canvas-participants.service";
import { CanvasSharesService } from "./canvas-shares.service";
import { CanvasService } from "./canvas.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type {
  AddParticipantDto,
  CreateBoardDto,
  CreateCommentDto,
  CreateElementDto,
  CreateExportDto,
  CreateFromChannelDto,
  CreateFromMeetingDto,
  CreateShareDto,
  UpdateBoardDto,
  UpdateElementDto,
  UpdateParticipantRoleDto,
} from "./dto/canvas.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@Controller("v1/canvas")
@UseGuards(JwtAuthGuard)
export class CanvasController {
  constructor(
    private readonly canvas: CanvasService,
    private readonly elements: CanvasElementsService,
    private readonly participants: CanvasParticipantsService,
    private readonly comments: CanvasCommentsService,
    private readonly exports: CanvasExportsService,
    private readonly shares: CanvasSharesService,
  ) {}

  // ── Boards ────────────────────────────────────────────────────────────────

  @Get()
  listBoards(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.canvas.listBoards(actor, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post()
  createBoard(@Body() dto: CreateBoardDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.canvas.createBoard(dto, actor);
  }

  @Get("templates")
  listTemplates(@Query("boardType") boardType?: string) {
    return this.canvas.listTemplates(boardType);
  }

  @Post("from-meeting/:meetingId")
  createFromMeeting(
    @Param("meetingId") meetingId: string,
    @Body() dto: CreateFromMeetingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.canvas.createFromMeeting(meetingId, dto, actor);
  }

  @Post("from-chat/:channelId")
  createFromChannel(
    @Param("channelId") channelId: string,
    @Body() dto: CreateFromChannelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.canvas.createFromChannel(channelId, dto, actor);
  }

  /** Resolve a share token — returns boardId + access level */
  @Get("share/:token")
  resolveShareToken(@Param("token") token: string) {
    return this.shares.resolveShareToken(token);
  }

  /** List all canvas boards linked to a meeting (Phase 5 Meet integration) */
  @Get("meeting/:meetingId")
  listBoardsForMeeting(
    @Param("meetingId") meetingId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.canvas.listBoardsForMeeting(meetingId, actor);
  }

  /** List all canvas boards linked to a channel (Phase 6 Chat integration) */
  @Get("channel/:channelId")
  listBoardsForChannel(
    @Param("channelId") channelId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.canvas.listBoardsForChannel(channelId, actor);
  }

  @Get(":id")
  getBoard(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.canvas.getBoard(id, actor);
  }

  @Patch(":id")
  updateBoard(
    @Param("id") id: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.canvas.updateBoard(id, dto, actor);
  }

  @Delete(":id")
  @HttpCode(200)
  deleteBoard(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.canvas.deleteBoard(id, actor);
  }

  // ── Elements ──────────────────────────────────────────────────────────────

  @Get(":id/elements")
  async listElements(@Param("id") boardId: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.elements.listElements(boardId);
  }

  @Post(":id/elements")
  async createElement(
    @Param("id") boardId: string,
    @Body() dto: CreateElementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.elements.createElement(boardId, dto, actor);
  }

  @Patch(":id/elements/:elementId")
  async updateElement(
    @Param("id") boardId: string,
    @Param("elementId") elementId: string,
    @Body() dto: UpdateElementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.elements.updateElement(boardId, elementId, dto, actor);
  }

  @Delete(":id/elements/:elementId")
  @HttpCode(200)
  async deleteElement(
    @Param("id") boardId: string,
    @Param("elementId") elementId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.elements.deleteElement(boardId, elementId);
  }

  @Post(":id/elements/:elementId/lock")
  @HttpCode(200)
  async lockElement(
    @Param("id") boardId: string,
    @Param("elementId") elementId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.elements.lockElement(boardId, elementId, actor);
  }

  @Post(":id/elements/:elementId/unlock")
  @HttpCode(200)
  async unlockElement(
    @Param("id") boardId: string,
    @Param("elementId") elementId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.elements.unlockElement(boardId, elementId, actor);
  }

  @Get(":id/elements/:elementId/versions")
  async getElementVersions(
    @Param("id") boardId: string,
    @Param("elementId") elementId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.elements.getElementVersions(boardId, elementId);
  }

  // ── Participants ──────────────────────────────────────────────────────────

  @Get(":id/participants")
  async listParticipants(@Param("id") boardId: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.participants.listParticipants(boardId);
  }

  @Post(":id/participants")
  async addParticipant(
    @Param("id") boardId: string,
    @Body() dto: AddParticipantDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.participants.addParticipant(boardId, dto, actor);
  }

  @Patch(":id/participants/:participantId")
  async updateParticipantRole(
    @Param("id") boardId: string,
    @Param("participantId") participantId: string,
    @Body() dto: UpdateParticipantRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertOwner(boardId, actor);
    return this.participants.updateParticipantRole(boardId, participantId, dto);
  }

  @Delete(":id/participants/:participantId")
  @HttpCode(200)
  async removeParticipant(
    @Param("id") boardId: string,
    @Param("participantId") participantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertOwner(boardId, actor);
    return this.participants.removeParticipant(boardId, participantId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Get(":id/comments")
  async listComments(@Param("id") boardId: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.comments.listComments(boardId);
  }

  @Post(":id/comments")
  async createComment(
    @Param("id") boardId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.comments.createComment(boardId, dto, actor);
  }

  @Post(":id/comments/:commentId/resolve")
  @HttpCode(200)
  async resolveComment(
    @Param("id") boardId: string,
    @Param("commentId") commentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertEditorOrOwner(boardId, actor);
    return this.comments.resolveComment(boardId, commentId, actor);
  }

  @Delete(":id/comments/:commentId")
  @HttpCode(200)
  async deleteComment(
    @Param("id") boardId: string,
    @Param("commentId") commentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.comments.deleteComment(boardId, commentId, actor);
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  @Get(":id/exports")
  async listExports(@Param("id") boardId: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.exports.listExports(boardId, actor);
  }

  @Post(":id/exports")
  async createExport(
    @Param("id") boardId: string,
    @Body() dto: CreateExportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.exports.createExport(boardId, dto, actor);
  }

  @Get(":id/exports/:exportId")
  async getExport(
    @Param("id") boardId: string,
    @Param("exportId") exportId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertBoardAccess(boardId, actor);
    return this.exports.getExport(boardId, exportId);
  }

  // ── Shares ────────────────────────────────────────────────────────────────

  @Get(":id/shares")
  async listShares(@Param("id") boardId: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.canvas.assertOwner(boardId, actor);
    return this.shares.listShares(boardId);
  }

  @Post(":id/shares")
  async createShare(
    @Param("id") boardId: string,
    @Body() dto: CreateShareDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertOwner(boardId, actor);
    return this.shares.createShare(boardId, dto, actor);
  }

  @Delete(":id/shares/:shareId")
  @HttpCode(200)
  async revokeShare(
    @Param("id") boardId: string,
    @Param("shareId") shareId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.canvas.assertOwner(boardId, actor);
    return this.shares.revokeShare(boardId, shareId);
  }
}
