import { Module } from "@nestjs/common";

import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { AuditModule } from "../../identity/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
