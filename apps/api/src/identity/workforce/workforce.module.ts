import { Module } from "@nestjs/common";

import { WorkforceController } from "./workforce.controller";
import { WorkforceService } from "./workforce.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [PrismaModule, AuditModule, PermissionsModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
