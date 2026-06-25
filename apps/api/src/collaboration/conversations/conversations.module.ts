import { Module } from "@nestjs/common";

import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { AuditModule } from "../../identity/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
