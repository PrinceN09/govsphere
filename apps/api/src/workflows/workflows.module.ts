/**
 * Prinodia Workspace — WorkflowsModule (v0.8.1)
 */

import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { TasksService } from "./tasks.service";
import {
  SignatureVerifyController,
  TasksController,
  WorkflowsController,
} from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { AuditModule } from "../identity/audit/audit.module";
import { QUEUES } from "../infrastructure/queue/queues";

@Module({
  imports: [AuditModule, BullModule.registerQueue({ name: QUEUES.NOTIFICATION })],
  controllers: [WorkflowsController, TasksController, SignatureVerifyController],
  providers: [WorkflowsService, TasksService],
  exports: [WorkflowsService, TasksService],
})
export class WorkflowsModule {}
