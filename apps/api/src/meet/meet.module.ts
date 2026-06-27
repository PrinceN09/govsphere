/**
 * Prinodia Meet v1.5.0 — MeetModule
 *
 * Live meeting management: sessions, recordings, polls, breakout rooms,
 * invite tokens, post-meeting summaries.
 *
 * Depends on: PrismaModule, IdentityModule (AuditService).
 * Integrated with CalendarModule's Meeting data model.
 */

import { Module } from "@nestjs/common";

import { MeetBreakoutService } from "./meet-breakout.service";
import { MeetInvitesService } from "./meet-invites.service";
import { MeetPollsService } from "./meet-polls.service";
import { MeetRecordingsService } from "./meet-recordings.service";
import { MeetSessionsService } from "./meet-sessions.service";
import { MeetSummariesService } from "./meet-summaries.service";
import { MeetController } from "./meet.controller";
import { MeetService } from "./meet.service";

@Module({
  controllers: [MeetController],
  providers: [
    MeetService,
    MeetSessionsService,
    MeetRecordingsService,
    MeetPollsService,
    MeetBreakoutService,
    MeetInvitesService,
    MeetSummariesService,
  ],
  exports: [
    MeetService,
    MeetSessionsService,
    MeetRecordingsService,
    MeetPollsService,
    MeetBreakoutService,
    MeetInvitesService,
    MeetSummariesService,
  ],
})
export class MeetModule {}
