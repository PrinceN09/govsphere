/**
 * Prinodia People — PeopleModule v1.3.0
 */

import { Module } from "@nestjs/common";

import { OrgNodeController } from "./org-node.controller";
import { OrgNodeService } from "./org-node.service";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [OrgNodeController, PeopleController],
  providers: [OrgNodeService, PeopleService],
  exports: [OrgNodeService, PeopleService],
})
export class PeopleModule {}
