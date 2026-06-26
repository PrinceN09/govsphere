/**
 * Prinodia Workspace — ExecutiveController (v1.0.0)
 *
 * REST API for Executive Office & Cabinet Management.
 *
 * Base paths:
 *   GET    /v1/executive/dashboard
 *   GET    /v1/executive/offices
 *   POST   /v1/executive/offices
 *   GET    /v1/executive/offices/:id
 *   PATCH  /v1/executive/offices/:id
 *
 *   GET    /v1/executive/cabinet/sessions
 *   POST   /v1/executive/cabinet/sessions
 *   GET    /v1/executive/cabinet/sessions/:id
 *   PATCH  /v1/executive/cabinet/sessions/:id
 *   POST   /v1/executive/cabinet/sessions/:id/start
 *   POST   /v1/executive/cabinet/sessions/:id/complete
 *   POST   /v1/executive/cabinet/sessions/:id/cancel
 *   POST   /v1/executive/cabinet/sessions/:id/agenda
 *   PATCH  /v1/executive/cabinet/sessions/:id/agenda/:itemId
 *   DELETE /v1/executive/cabinet/sessions/:id/agenda/:itemId
 *   GET    /v1/executive/cabinet/sessions/:id/decisions
 *   POST   /v1/executive/cabinet/sessions/:id/decisions
 *
 *   GET    /v1/executive/cabinet/decisions
 *   GET    /v1/executive/cabinet/decisions/:id
 *   PATCH  /v1/executive/cabinet/decisions/:id
 *   POST   /v1/executive/cabinet/decisions/:id/adopt
 *   POST   /v1/executive/cabinet/decisions/:id/reject
 *   POST   /v1/executive/cabinet/decisions/:id/defer
 *   POST   /v1/executive/cabinet/decisions/:id/implementations
 *   PATCH  /v1/executive/cabinet/decisions/:id/implementations/:implId
 *
 *   GET    /v1/executive/briefings
 *   POST   /v1/executive/briefings
 *   GET    /v1/executive/briefings/:id
 *   PATCH  /v1/executive/briefings/:id
 *   POST   /v1/executive/briefings/:id/submit
 *   POST   /v1/executive/briefings/:id/approve
 *   POST   /v1/executive/briefings/:id/publish
 *
 *   GET    /v1/executive/correspondence
 *   POST   /v1/executive/correspondence
 *   GET    /v1/executive/correspondence/:id
 *   PATCH  /v1/executive/correspondence/:id
 *   POST   /v1/executive/correspondence/:id/send
 *   POST   /v1/executive/correspondence/:id/acknowledge
 *
 *   GET    /v1/executive/announcements
 *   POST   /v1/executive/announcements
 *   GET    /v1/executive/announcements/:id
 *   PATCH  /v1/executive/announcements/:id
 *   POST   /v1/executive/announcements/:id/publish
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { BriefingsService } from "./briefings.service";
import { CabinetService } from "./cabinet.service";
import { CorrespondenceService } from "./correspondence.service";
import { ExecutiveService } from "./executive.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";

import type {
  AnnouncementQueryDto,
  BriefingQueryDto,
  CabinetSessionQueryDto,
  CorrespondenceQueryDto,
  CreateAgendaItemDto,
  CreateAnnouncementDto,
  CreateBriefingDto,
  CreateCabinetSessionDto,
  CreateCorrespondenceDto,
  CreateDecisionDto,
  CreateExecutiveOfficeDto,
  CreateImplementationDto,
  DecisionQueryDto,
  ExecutiveOfficeQueryDto,
  UpdateAgendaItemDto,
  UpdateAnnouncementDto,
  UpdateBriefingDto,
  UpdateCabinetSessionDto,
  UpdateCorrespondenceDto,
  UpdateDecisionDto,
  UpdateExecutiveOfficeDto,
  UpdateImplementationDto,
  VoteDecisionDto,
} from "./dto/executive.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/executive")
export class ExecutiveController {
  constructor(
    private readonly executiveService: ExecutiveService,
    private readonly cabinetService: CabinetService,
    private readonly briefingsService: BriefingsService,
    private readonly correspondenceService: CorrespondenceService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────────

  @Get("dashboard")
  @RequirePermissions("EXECUTIVE:READ")
  getDashboard(@CurrentUser() actor: AuthenticatedUser) {
    return this.executiveService.getDashboard(actor);
  }

  // ── Executive Offices ─────────────────────────────────────────────────────────

  @Get("offices")
  @RequirePermissions("EXECUTIVE_OFFICE:READ")
  listOffices(@CurrentUser() actor: AuthenticatedUser, @Query() query: ExecutiveOfficeQueryDto) {
    return this.executiveService.listOffices(actor, query);
  }

  @Get("offices/:id")
  @RequirePermissions("EXECUTIVE_OFFICE:READ")
  getOffice(@Param("id") id: string) {
    return this.executiveService.getOffice(id);
  }

  @Post("offices")
  @RequirePermissions("EXECUTIVE_OFFICE:CREATE")
  createOffice(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateExecutiveOfficeDto) {
    return this.executiveService.createOffice(actor, dto);
  }

  @Patch("offices/:id")
  @RequirePermissions("EXECUTIVE_OFFICE:UPDATE")
  updateOffice(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateExecutiveOfficeDto,
  ) {
    return this.executiveService.updateOffice(id, actor, dto);
  }

  // ── Cabinet Sessions ──────────────────────────────────────────────────────────

  @Get("cabinet/sessions")
  @RequirePermissions("CABINET:READ")
  listSessions(@CurrentUser() actor: AuthenticatedUser, @Query() query: CabinetSessionQueryDto) {
    return this.cabinetService.listSessions(actor, query);
  }

  @Post("cabinet/sessions")
  @RequirePermissions("CABINET:CREATE")
  createSession(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCabinetSessionDto) {
    return this.cabinetService.createSession(actor, dto);
  }

  @Get("cabinet/sessions/:id")
  @RequirePermissions("CABINET:READ")
  getSession(@Param("id") id: string) {
    return this.cabinetService.getSession(id);
  }

  @Patch("cabinet/sessions/:id")
  @RequirePermissions("CABINET:UPDATE")
  updateSession(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateCabinetSessionDto,
  ) {
    return this.cabinetService.updateSession(id, actor, dto);
  }

  @Post("cabinet/sessions/:id/start")
  @RequirePermissions("CABINET:MANAGE")
  startSession(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.cabinetService.startSession(id, actor);
  }

  @Post("cabinet/sessions/:id/complete")
  @RequirePermissions("CABINET:MANAGE")
  completeSession(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.cabinetService.completeSession(id, actor);
  }

  @Post("cabinet/sessions/:id/cancel")
  @RequirePermissions("CABINET:MANAGE")
  cancelSession(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { reason?: string },
  ) {
    return this.cabinetService.cancelSession(id, actor, body.reason);
  }

  // ── Cabinet Agenda ────────────────────────────────────────────────────────────

  @Post("cabinet/sessions/:id/agenda")
  @RequirePermissions("CABINET:UPDATE")
  addAgendaItem(
    @Param("id") sessionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAgendaItemDto,
  ) {
    return this.cabinetService.addAgendaItem(sessionId, actor, dto);
  }

  @Patch("cabinet/sessions/:id/agenda/:itemId")
  @RequirePermissions("CABINET:UPDATE")
  updateAgendaItem(
    @Param("id") sessionId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateAgendaItemDto,
  ) {
    return this.cabinetService.updateAgendaItem(sessionId, itemId, actor, dto);
  }

  @Delete("cabinet/sessions/:id/agenda/:itemId")
  @RequirePermissions("CABINET:UPDATE")
  deleteAgendaItem(
    @Param("id") sessionId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cabinetService.deleteAgendaItem(sessionId, itemId, actor);
  }

  // ── Cabinet Decisions — from session ─────────────────────────────────────────

  @Post("cabinet/sessions/:id/decisions")
  @RequirePermissions("CABINET_DECISION:CREATE")
  createDecision(
    @Param("id") sessionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateDecisionDto,
  ) {
    return this.cabinetService.createDecision(sessionId, actor, dto);
  }

  // ── Cabinet Decisions — global ────────────────────────────────────────────────

  @Get("cabinet/decisions")
  @RequirePermissions("CABINET_DECISION:READ")
  listDecisions(@CurrentUser() actor: AuthenticatedUser, @Query() query: DecisionQueryDto) {
    return this.cabinetService.listDecisions(actor, query);
  }

  @Get("cabinet/decisions/:id")
  @RequirePermissions("CABINET_DECISION:READ")
  getDecision(@Param("id") id: string) {
    return this.cabinetService.getDecision(id);
  }

  @Patch("cabinet/decisions/:id")
  @RequirePermissions("CABINET_DECISION:CREATE")
  updateDecision(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateDecisionDto,
  ) {
    return this.cabinetService.updateDecision(id, actor, dto);
  }

  @Post("cabinet/decisions/:id/adopt")
  @RequirePermissions("CABINET_DECISION:ADOPT")
  adoptDecision(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: VoteDecisionDto,
  ) {
    return this.cabinetService.adoptDecision(id, actor, dto);
  }

  @Post("cabinet/decisions/:id/reject")
  @RequirePermissions("CABINET_DECISION:ADOPT")
  rejectDecision(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.cabinetService.rejectDecision(id, actor);
  }

  @Post("cabinet/decisions/:id/defer")
  @RequirePermissions("CABINET_DECISION:ADOPT")
  deferDecision(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.cabinetService.deferDecision(id, actor);
  }

  // ── Decision Implementation ───────────────────────────────────────────────────

  @Post("cabinet/decisions/:id/implementations")
  @RequirePermissions("CABINET_DECISION:CREATE")
  addImplementation(
    @Param("id") decisionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateImplementationDto,
  ) {
    return this.cabinetService.addImplementation(decisionId, actor, dto);
  }

  @Patch("cabinet/decisions/:id/implementations/:implId")
  @RequirePermissions("CABINET_DECISION:CREATE")
  updateImplementation(
    @Param("id") decisionId: string,
    @Param("implId") implId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateImplementationDto,
  ) {
    return this.cabinetService.updateImplementation(decisionId, implId, actor, dto);
  }

  // ── Briefings ─────────────────────────────────────────────────────────────────

  @Get("briefings")
  @RequirePermissions("BRIEFING:READ")
  listBriefings(@CurrentUser() actor: AuthenticatedUser, @Query() query: BriefingQueryDto) {
    return this.briefingsService.listBriefings(actor, query);
  }

  @Post("briefings")
  @RequirePermissions("BRIEFING:CREATE")
  createBriefing(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateBriefingDto) {
    return this.briefingsService.createBriefing(actor, dto);
  }

  @Get("briefings/:id")
  @RequirePermissions("BRIEFING:READ")
  getBriefing(@Param("id") id: string) {
    return this.briefingsService.getBriefing(id);
  }

  @Patch("briefings/:id")
  @RequirePermissions("BRIEFING:UPDATE")
  updateBriefing(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateBriefingDto,
  ) {
    return this.briefingsService.updateBriefing(id, actor, dto);
  }

  @Post("briefings/:id/submit")
  @RequirePermissions("BRIEFING:UPDATE")
  submitBriefing(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.briefingsService.submitForReview(id, actor);
  }

  @Post("briefings/:id/approve")
  @RequirePermissions("BRIEFING:APPROVE")
  approveBriefing(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.briefingsService.approveBriefing(id, actor);
  }

  @Post("briefings/:id/publish")
  @RequirePermissions("BRIEFING:APPROVE")
  publishBriefing(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.briefingsService.publishBriefing(id, actor);
  }

  // ── Correspondence ────────────────────────────────────────────────────────────

  @Get("correspondence")
  @RequirePermissions("CORRESPONDENCE:READ")
  listCorrespondence(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: CorrespondenceQueryDto,
  ) {
    return this.correspondenceService.listCorrespondence(actor, query);
  }

  @Post("correspondence")
  @RequirePermissions("CORRESPONDENCE:CREATE")
  createCorrespondence(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCorrespondenceDto,
  ) {
    return this.correspondenceService.createCorrespondence(actor, dto);
  }

  @Get("correspondence/:id")
  @RequirePermissions("CORRESPONDENCE:READ")
  getCorrespondence(@Param("id") id: string) {
    return this.correspondenceService.getCorrespondence(id);
  }

  @Patch("correspondence/:id")
  @RequirePermissions("CORRESPONDENCE:UPDATE")
  updateCorrespondence(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateCorrespondenceDto,
  ) {
    return this.correspondenceService.updateCorrespondence(id, actor, dto);
  }

  @Post("correspondence/:id/send")
  @RequirePermissions("CORRESPONDENCE:CREATE")
  sendCorrespondence(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.correspondenceService.sendCorrespondence(id, actor);
  }

  @Post("correspondence/:id/acknowledge")
  @RequirePermissions("CORRESPONDENCE:READ")
  acknowledgeCorrespondence(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.correspondenceService.acknowledgeCorrespondence(id, actor);
  }

  // ── Announcements ─────────────────────────────────────────────────────────────

  @Get("announcements")
  @RequirePermissions("EXECUTIVE:READ")
  listAnnouncements(@CurrentUser() actor: AuthenticatedUser, @Query() query: AnnouncementQueryDto) {
    return this.executiveService.listAnnouncements(actor, query);
  }

  @Post("announcements")
  @RequirePermissions("EXECUTIVE_ANNOUNCEMENT:CREATE")
  createAnnouncement(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateAnnouncementDto) {
    return this.executiveService.createAnnouncement(actor, dto);
  }

  @Get("announcements/:id")
  @RequirePermissions("EXECUTIVE:READ")
  getAnnouncement(@Param("id") id: string) {
    return this.executiveService.getAnnouncement(id);
  }

  @Patch("announcements/:id")
  @RequirePermissions("EXECUTIVE_ANNOUNCEMENT:CREATE")
  updateAnnouncement(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.executiveService.updateAnnouncement(id, actor, dto);
  }

  @Post("announcements/:id/publish")
  @RequirePermissions("EXECUTIVE_ANNOUNCEMENT:PUBLISH")
  publishAnnouncement(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.executiveService.publishAnnouncement(id, actor);
  }
}
