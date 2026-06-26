/**
 * Prinodia Workspace — CalendarModule (v0.9.0)
 */

import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { CalendarController, MeetingsController, RoomsController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { MeetingsService } from "./meetings.service";
import { RoomsService } from "./rooms.service";
import { AuditModule } from "../identity/audit/audit.module";
import { QUEUES } from "../infrastructure/queue/queues";

@Module({
  imports: [AuditModule, BullModule.registerQueue({ name: QUEUES.NOTIFICATION })],
  controllers: [CalendarController, MeetingsController, RoomsController],
  providers: [CalendarService, MeetingsService, RoomsService],
  exports: [CalendarService, MeetingsService, RoomsService],
})
export class CalendarModule {}
