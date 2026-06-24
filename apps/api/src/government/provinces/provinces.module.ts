import { Module } from "@nestjs/common";

import { ProvincesController } from "./provinces.controller";
import { ProvincesService } from "./provinces.service";
import { AuditModule } from "../../identity/audit/audit.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ProvincesController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
