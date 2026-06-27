/**
 * Prinodia Meet v1.5.0 — MeetController
 *
 * REST surface for live meeting management. All routes are under /v1/meet.
 * Authentication is required for all routes via JwtAuthGuard.
 *
 * Route layout:
 *   GET    /v1/meet                               — upcoming + active
 *   GET    /v1/meet/active                        — active meetings
 *   GET    /v1/meet/join/:token                   — join by invite token
 *   GET    /v1/meet/:id                           — meeting detail
 *   POST   /v1/meet/:id/start                     — start meeting
 *   POST   /v1/meet/:id/end                       — end meeting
 *   PATCH  /v1/meet/:id/settings                  — update settings
 *   POST   /v1/meet/:id/join                      — join meeting
 *   POST   /v1/meet/:id/leave                     — leave meeting
 *   POST   /v1/meet/:id/admit/:userId             — admit from waiting room
 *   POST   /v1/meet/:id/mute/:userId              — mute participant
 *   POST   /v1/meet/:id/mute-all                  — mute all
 *   POST   /v1/meet/:id/transfer-host             — transfer host
 *   POST   /v1/meet/:id/raise-hand                — raise hand
 *   POST   /v1/meet/:id/lower-hand                — lower hand
 *   POST   /v1/meet/:id/react                     — emoji reaction
 *   GET    /v1/meet/:id/sessions                  — session history
 *   GET    /v1/meet/:id/recordings                — recordings list
 *   POST   /v1/meet/:id/recordings/start          — start recording
 *   POST   /v1/meet/:id/recordings/:recId/stop    — stop recording
 *   GET    /v1/meet/:id/polls                     — polls list
 *   POST   /v1/meet/:id/polls                     — create poll
 *   POST   /v1/meet/:id/polls/:pollId/start       — start poll
 *   POST   /v1/meet/:id/polls/:pollId/close       — close poll
 *   POST   /v1/meet/:id/polls/:pollId/vote        — vote on poll
 *   GET    /v1/meet/:id/polls/:pollId/results     — poll results
 *   GET    /v1/meet/:id/breakout-rooms            — breakout rooms list
 *   POST   /v1/meet/:id/breakout-rooms            — create breakout room
 *   POST   /v1/meet/:id/breakout-rooms/:roomId/join  — join breakout room
 *   POST   /v1/meet/:id/breakout-rooms/:roomId/leave — leave breakout room
 *   POST   /v1/meet/:id/breakout-rooms/:roomId/close — close breakout room
 *   GET    /v1/meet/:id/invites                   — invites list
 *   POST   /v1/meet/:id/invites                   — create invite
 *   DELETE /v1/meet/:id/invites/:inviteId         — revoke invite
 *   GET    /v1/meet/:id/summaries                 — summaries list
 *   POST   /v1/meet/:id/summaries                 — create summary
 *   POST   /v1/meet/:id/summaries/:summaryId/publish — publish summary
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
  UseGuards,
} from "@nestjs/common";

import { MeetBreakoutService } from "./meet-breakout.service";
import { MeetInvitesService } from "./meet-invites.service";
import { MeetPollsService } from "./meet-polls.service";
import { MeetRecordingsService } from "./meet-recordings.service";
import { MeetSessionsService } from "./meet-sessions.service";
import { MeetSummariesService } from "./meet-summaries.service";
import { MeetService } from "./meet.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

import type {
  CreateBreakoutRoomDto,
  CreateInviteDto,
  CreatePollDto,
  CreateSummaryDto,
  MeetReactionDto,
  TransferHostDto,
  UpdateMeetSettingsDto,
  UpdateRecordingDto,
  VotePollDto,
} from "./dto/meet.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("v1/meet")
export class MeetController {
  constructor(
    private readonly meet: MeetService,
    private readonly sessions: MeetSessionsService,
    private readonly recordings: MeetRecordingsService,
    private readonly polls: MeetPollsService,
    private readonly breakout: MeetBreakoutService,
    private readonly invites: MeetInvitesService,
    private readonly summaries: MeetSummariesService,
  ) {}

  // ── Discovery ─────────────────────────────────────────────────────────────

  /** GET /v1/meet — upcoming meetings for current user (next 7 days) */
  @Get()
  findUpcoming(@CurrentUser() actor: AuthenticatedUser) {
    return this.meet.findUpcoming(actor);
  }

  /** GET /v1/meet/active — meetings currently in progress */
  @Get("active")
  findActive(@CurrentUser() actor: AuthenticatedUser) {
    return this.meet.findActive(actor);
  }

  /** GET /v1/meet/join/:token — resolve an invite token to a meeting */
  @Get("join/:token")
  findByToken(@Param("token") token: string) {
    return this.meet.findByToken(token);
  }

  /** GET /v1/meet/:id — meeting detail with participants */
  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.findById(id, actor);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** POST /v1/meet/:id/start */
  @Post(":id/start")
  @HttpCode(200)
  start(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.start(id, actor);
  }

  /** POST /v1/meet/:id/end */
  @Post(":id/end")
  @HttpCode(200)
  end(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.end(id, actor);
  }

  /** PATCH /v1/meet/:id/settings */
  @Patch(":id/settings")
  updateSettings(
    @Param("id") id: string,
    @Body() dto: UpdateMeetSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meet.updateSettings(id, dto, actor);
  }

  // ── Participant Controls ──────────────────────────────────────────────────

  /** POST /v1/meet/:id/join */
  @Post(":id/join")
  @HttpCode(200)
  join(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.joinMeeting(id, actor);
  }

  /** POST /v1/meet/:id/leave */
  @Post(":id/leave")
  @HttpCode(200)
  leave(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.leaveMeeting(id, actor);
  }

  /** POST /v1/meet/:id/admit/:userId */
  @Post(":id/admit/:userId")
  @HttpCode(200)
  admit(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meet.admitFromWaiting(id, userId, actor);
  }

  /** POST /v1/meet/:id/mute/:userId */
  @Post(":id/mute/:userId")
  @HttpCode(200)
  muteParticipant(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meet.muteParticipant(id, userId, actor);
  }

  /** POST /v1/meet/:id/mute-all */
  @Post(":id/mute-all")
  @HttpCode(200)
  muteAll(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.muteAll(id, actor);
  }

  /** POST /v1/meet/:id/transfer-host */
  @Post(":id/transfer-host")
  @HttpCode(200)
  transferHost(
    @Param("id") id: string,
    @Body() dto: TransferHostDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meet.transferHost(id, dto, actor);
  }

  /** POST /v1/meet/:id/raise-hand */
  @Post(":id/raise-hand")
  @HttpCode(200)
  raiseHand(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.raiseHand(id, actor);
  }

  /** POST /v1/meet/:id/lower-hand */
  @Post(":id/lower-hand")
  @HttpCode(200)
  lowerHand(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meet.lowerHand(id, actor);
  }

  /** POST /v1/meet/:id/react */
  @Post(":id/react")
  @HttpCode(200)
  react(
    @Param("id") id: string,
    @Body() dto: MeetReactionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meet.addReaction(id, dto, actor);
  }

  // ── Sessions ─────────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/sessions */
  @Get(":id/sessions")
  listSessions(@Param("id") id: string) {
    return this.sessions.list(id);
  }

  /** GET /v1/meet/:id/sessions/current */
  @Get(":id/sessions/current")
  currentSession(@Param("id") id: string) {
    return this.sessions.getCurrent(id);
  }

  // ── Recordings ────────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/recordings */
  @Get(":id/recordings")
  listRecordings(@Param("id") id: string) {
    return this.recordings.list(id);
  }

  /** POST /v1/meet/:id/recordings/start */
  @Post(":id/recordings/start")
  @HttpCode(200)
  startRecording(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.recordings.start(id, actor);
  }

  /** POST /v1/meet/:id/recordings/:recId/stop */
  @Post(":id/recordings/:recId/stop")
  @HttpCode(200)
  stopRecording(@Param("recId") recId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.recordings.stop(recId, actor);
  }

  /** PATCH /v1/meet/:id/recordings/:recId */
  @Patch(":id/recordings/:recId")
  updateRecording(
    @Param("recId") recId: string,
    @Body() dto: UpdateRecordingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recordings.update(recId, dto, actor);
  }

  // ── Polls ─────────────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/polls */
  @Get(":id/polls")
  listPolls(@Param("id") id: string) {
    return this.polls.list(id);
  }

  /** POST /v1/meet/:id/polls */
  @Post(":id/polls")
  createPoll(
    @Param("id") id: string,
    @Body() dto: CreatePollDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.polls.create(id, dto, actor);
  }

  /** POST /v1/meet/:id/polls/:pollId/start */
  @Post(":id/polls/:pollId/start")
  @HttpCode(200)
  startPoll(@Param("pollId") pollId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.polls.start(pollId, actor);
  }

  /** POST /v1/meet/:id/polls/:pollId/close */
  @Post(":id/polls/:pollId/close")
  @HttpCode(200)
  closePoll(@Param("pollId") pollId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.polls.close(pollId, actor);
  }

  /** POST /v1/meet/:id/polls/:pollId/vote */
  @Post(":id/polls/:pollId/vote")
  @HttpCode(200)
  votePoll(
    @Param("pollId") pollId: string,
    @Body() dto: VotePollDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.polls.vote(pollId, dto, actor);
  }

  /** GET /v1/meet/:id/polls/:pollId/results */
  @Get(":id/polls/:pollId/results")
  pollResults(@Param("pollId") pollId: string) {
    return this.polls.results(pollId);
  }

  // ── Breakout Rooms ────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/breakout-rooms */
  @Get(":id/breakout-rooms")
  listBreakoutRooms(@Param("id") id: string) {
    return this.breakout.list(id);
  }

  /** POST /v1/meet/:id/breakout-rooms */
  @Post(":id/breakout-rooms")
  createBreakoutRoom(
    @Param("id") id: string,
    @Body() dto: CreateBreakoutRoomDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.breakout.create(id, dto, actor);
  }

  /** POST /v1/meet/:id/breakout-rooms/:roomId/join */
  @Post(":id/breakout-rooms/:roomId/join")
  @HttpCode(200)
  joinBreakout(@Param("roomId") roomId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.breakout.join(roomId, actor);
  }

  /** POST /v1/meet/:id/breakout-rooms/:roomId/leave */
  @Post(":id/breakout-rooms/:roomId/leave")
  @HttpCode(200)
  leaveBreakout(@Param("roomId") roomId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.breakout.leave(roomId, actor);
  }

  /** POST /v1/meet/:id/breakout-rooms/:roomId/close */
  @Post(":id/breakout-rooms/:roomId/close")
  @HttpCode(200)
  closeBreakout(@Param("roomId") roomId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.breakout.close(roomId, actor);
  }

  // ── Invites ───────────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/invites */
  @Get(":id/invites")
  listInvites(@Param("id") id: string) {
    return this.invites.list(id);
  }

  /** POST /v1/meet/:id/invites */
  @Post(":id/invites")
  createInvite(
    @Param("id") id: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.invites.create(id, dto, actor);
  }

  /** DELETE /v1/meet/:id/invites/:inviteId */
  @Delete(":id/invites/:inviteId")
  @HttpCode(200)
  revokeInvite(@Param("inviteId") inviteId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.invites.revoke(inviteId, actor);
  }

  // ── Summaries ─────────────────────────────────────────────────────────────

  /** GET /v1/meet/:id/summaries */
  @Get(":id/summaries")
  listSummaries(@Param("id") id: string) {
    return this.summaries.list(id);
  }

  /** POST /v1/meet/:id/summaries */
  @Post(":id/summaries")
  createSummary(
    @Param("id") id: string,
    @Body() dto: CreateSummaryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.summaries.create(id, dto, actor);
  }

  /** POST /v1/meet/:id/summaries/:summaryId/publish */
  @Post(":id/summaries/:summaryId/publish")
  @HttpCode(200)
  publishSummary(@Param("summaryId") summaryId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.summaries.publish(summaryId, actor);
  }
}
