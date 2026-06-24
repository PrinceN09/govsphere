import { Module } from "@nestjs/common";

import { PositionsController } from "./positions.controller";
import { PositionsService } from "./positions.service";
import { AuditModule } from "../../identity/audit/audit.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
