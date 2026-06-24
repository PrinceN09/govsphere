import { Module } from "@nestjs/common";

import { DivisionsController } from "./divisions.controller";
import { DivisionsService } from "./divisions.service";
import { AuditModule } from "../../identity/audit/audit.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DivisionsController],
  providers: [DivisionsService],
  exports: [DivisionsService],
})
export class DivisionsModule {}
