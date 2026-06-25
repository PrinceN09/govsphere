/**
 * GovSphere — CalendarController + MeetingsController + RoomsController (v0.9.0)
 *
 * Base paths:
 *   GET/POST /v1/calendar/events
 *   GET/PATCH/DELETE /v1/calendar/events/:id
 *   POST /v1/calendar/events/:id/reminders
 *   GET /v1/calendar/my
 *
 *   GET/POST /v1/meetings
 *   GET/PATCH/DELETE /v1/meetings/:id
 *   POST /v1/meetings/:id/cancel
 *   POST /v1/meetings/:id/complete
 *   GET /v1/meetings/my
 *   POST /v1/meetings/:id/participants
 *   DELETE /v1/meetings/:id/participants/:pid
 *   PATCH /v1/meetings/:id/rsvp
 *   POST /v1/meetings/:id/attendance
 *   GET/POST /v1/meetings/:id/agenda
 *   PATCH/DELETE /v1/meetings/:id/agenda/:itemId
 *   GET/POST /v1/meetings/:id/minutes
 *   PATCH /v1/meetings/:id/minutes
 *   POST /v1/meetings/:id/minutes/publish
 *   GET/POST /v1/meetings/:id/action-items
 *
 *   GET/POST /v1/rooms
 *   GET /v1/rooms/:id
 *   PATCH /v1/rooms/:id
 *   POST /v1/rooms/book
 *   DELETE /v1/rooms/bookings/:id
 *   GET /v1/rooms/:id/availability
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

import { CalendarService } from "./calendar.service";
import { MeetingsService } from "./meetings.service";
import { RoomsService } from "./rooms.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";

import type {
  AddParticipantDto,
  AddReminderDto,
  BookRoomDto,
  CancelMeetingDto,
  CreateActionItemDto,
  CreateAgendaItemDto,
  CreateEventDto,
  CreateMeetingDto,
  CreateMinutesDto,
  CreateRoomDto,
  EventQueryDto,
  MeetingQueryDto,
  RecordAttendanceDto,
  RoomQueryDto,
  UpdateAgendaItemDto,
  UpdateEventDto,
  UpdateMeetingDto,
  UpdateMinutesDto,
  UpdateRoomDto,
  UpdateRsvpDto,
} from "./dto/calendar.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

// ─── Calendar Events ──────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/calendar")
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get("my")
  @RequirePermissions("CALENDAR:READ")
  myCalendar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.calendar.myCalendar(actor, from, to);
  }

  @Get("events")
  @RequirePermissions("CALENDAR:READ")
  listEvents(@CurrentUser() actor: AuthenticatedUser, @Query() query: EventQueryDto) {
    return this.calendar.listEvents(actor, query);
  }

  @Get("events/:id")
  @RequirePermissions("CALENDAR:READ")
  getEvent(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendar.getEvent(id, actor);
  }

  @Post("events")
  @RequirePermissions("CALENDAR:CREATE")
  createEvent(@Body() dto: CreateEventDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendar.createEvent(dto, actor);
  }

  @Patch("events/:id")
  @RequirePermissions("CALENDAR:UPDATE")
  updateEvent(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.calendar.updateEvent(id, dto, actor);
  }

  @Delete("events/:id")
  @RequirePermissions("CALENDAR:UPDATE")
  deleteEvent(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendar.deleteEvent(id, actor);
  }

  @Post("events/:id/reminders")
  @RequirePermissions("CALENDAR:READ")
  addReminder(
    @Param("id") eventId: string,
    @Body() dto: AddReminderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.calendar.addReminder(eventId, dto, actor);
  }

  @Delete("events/:id/reminders/:reminderId")
  @RequirePermissions("CALENDAR:READ")
  deleteReminder(@Param("reminderId") reminderId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendar.deleteReminder(reminderId, actor);
  }
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get("my")
  @RequirePermissions("CALENDAR:READ")
  myMeetings(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.meetings.myMeetings(actor, from, to);
  }

  @Get()
  @RequirePermissions("CALENDAR:READ")
  listMeetings(@CurrentUser() actor: AuthenticatedUser, @Query() query: MeetingQueryDto) {
    return this.meetings.listMeetings(actor, query);
  }

  @Get(":id")
  @RequirePermissions("CALENDAR:READ")
  getMeeting(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetings.getMeeting(id, actor);
  }

  @Post()
  @RequirePermissions("CALENDAR:CREATE")
  createMeeting(@Body() dto: CreateMeetingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetings.createMeeting(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("CALENDAR:UPDATE")
  updateMeeting(
    @Param("id") id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.updateMeeting(id, dto, actor);
  }

  @Post(":id/cancel")
  @RequirePermissions("CALENDAR:UPDATE")
  cancelMeeting(
    @Param("id") id: string,
    @Body() dto: CancelMeetingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.cancelMeeting(id, dto, actor);
  }

  @Post(":id/complete")
  @RequirePermissions("CALENDAR:UPDATE")
  completeMeeting(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetings.completeMeeting(id, actor);
  }

  // ── Participants ─────────────────────────────────────────────────────────────

  @Post(":id/participants")
  @RequirePermissions("CALENDAR:UPDATE")
  addParticipant(
    @Param("id") meetingId: string,
    @Body() dto: AddParticipantDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.addParticipant(meetingId, dto, actor);
  }

  @Delete(":id/participants/:pid")
  @RequirePermissions("CALENDAR:UPDATE")
  removeParticipant(
    @Param("id") meetingId: string,
    @Param("pid") participantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.removeParticipant(meetingId, participantId, actor);
  }

  @Patch(":id/rsvp")
  @RequirePermissions("CALENDAR:READ")
  updateRsvp(
    @Param("id") meetingId: string,
    @Body() dto: UpdateRsvpDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.updateRsvp(meetingId, dto, actor);
  }

  @Post(":id/attendance")
  @RequirePermissions("CALENDAR:UPDATE")
  recordAttendance(
    @Param("id") meetingId: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.recordAttendance(meetingId, dto, actor);
  }

  // ── Agenda ──────────────────────────────────────────────────────────────────

  @Get(":id/agenda")
  @RequirePermissions("CALENDAR:READ")
  listAgendaItems(@Param("id") meetingId: string) {
    return this.meetings.listAgendaItems(meetingId);
  }

  @Post(":id/agenda")
  @RequirePermissions("CALENDAR:UPDATE")
  addAgendaItem(
    @Param("id") meetingId: string,
    @Body() dto: CreateAgendaItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.addAgendaItem(meetingId, dto, actor);
  }

  @Patch(":id/agenda/:itemId")
  @RequirePermissions("CALENDAR:UPDATE")
  updateAgendaItem(
    @Param("id") meetingId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateAgendaItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.updateAgendaItem(meetingId, itemId, dto, actor);
  }

  @Delete(":id/agenda/:itemId")
  @RequirePermissions("CALENDAR:UPDATE")
  deleteAgendaItem(
    @Param("id") meetingId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.deleteAgendaItem(meetingId, itemId, actor);
  }

  // ── Minutes ──────────────────────────────────────────────────────────────────

  @Post(":id/minutes")
  @RequirePermissions("CALENDAR:UPDATE")
  createMinutes(
    @Param("id") meetingId: string,
    @Body() dto: CreateMinutesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.createMinutes(meetingId, dto, actor);
  }

  @Patch(":id/minutes")
  @RequirePermissions("CALENDAR:UPDATE")
  updateMinutes(
    @Param("id") meetingId: string,
    @Body() dto: UpdateMinutesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.updateMinutes(meetingId, dto, actor);
  }

  @Post(":id/minutes/publish")
  @RequirePermissions("CALENDAR:UPDATE")
  publishMinutes(@Param("id") meetingId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetings.publishMinutes(meetingId, actor);
  }

  // ── Action Items ──────────────────────────────────────────────────────────────

  @Post(":id/action-items")
  @RequirePermissions("CALENDAR:UPDATE")
  createActionItem(
    @Param("id") meetingId: string,
    @Body() dto: CreateActionItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetings.createActionItem(meetingId, dto, actor);
  }
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/rooms")
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  @RequirePermissions("CALENDAR:READ")
  listRooms(@Query() query: RoomQueryDto) {
    return this.rooms.listRooms(query);
  }

  @Post()
  @RequirePermissions("CALENDAR:MANAGE")
  createRoom(@Body() dto: CreateRoomDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.rooms.createRoom(dto, actor);
  }

  @Get(":id")
  @RequirePermissions("CALENDAR:READ")
  getRoom(@Param("id") id: string) {
    return this.rooms.getRoom(id);
  }

  @Patch(":id")
  @RequirePermissions("CALENDAR:MANAGE")
  updateRoom(
    @Param("id") id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rooms.updateRoom(id, dto, actor);
  }

  @Get(":id/availability")
  @RequirePermissions("CALENDAR:READ")
  getRoomAvailability(
    @Param("id") roomId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.rooms.getRoomAvailability(roomId, from, to);
  }

  @Post("book")
  @RequirePermissions("CALENDAR:CREATE")
  bookRoom(@Body() dto: BookRoomDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.rooms.bookRoom(dto, actor);
  }

  @Delete("bookings/:id")
  @RequirePermissions("CALENDAR:CREATE")
  cancelBooking(@Param("id") bookingId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.rooms.cancelBooking(bookingId, actor);
  }
}
