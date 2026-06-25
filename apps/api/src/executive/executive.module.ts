/**
 * GovSphere — ExecutiveModule (v1.0.0)
 *
 * Executive Office & Cabinet Management Platform.
 * Reuses: AuditModule, PrismaModule, CalendarModule (via exports).
 */

import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { BriefingsService } from "./briefings.service";
import { CabinetService } from "./cabinet.service";
import { CorrespondenceService } from "./correspondence.service";
import { ExecutiveController } from "./executive.controller";
import { ExecutiveService } from "./executive.service";
import { AuditModule } from "../identity/audit/audit.module";
import { QUEUES } from "../infrastructure/queue/queues";

@Module({
  imports: [AuditModule, BullModule.registerQueue({ name: QUEUES.NOTIFICATION })],
  controllers: [ExecutiveController],
  providers: [ExecutiveService, CabinetService, BriefingsService, CorrespondenceService],
  exports: [ExecutiveService, CabinetService, BriefingsService, CorrespondenceService],
})
export class ExecutiveModule {}
