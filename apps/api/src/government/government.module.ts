import { Module } from "@nestjs/common";

import { AssignmentsModule } from "./assignments/assignments.module";
import { DepartmentsModule } from "./departments/departments.module";
import { DivisionsModule } from "./divisions/divisions.module";
import { MinistriesModule } from "./ministries/ministries.module";
import { PositionsModule } from "./positions/positions.module";
import { ProvincesModule } from "./provinces/provinces.module";

/**
 * GovernmentModule
 *
 * Aggregates all v0.3.0 Government Structure sub-modules:
 *   - Ministries  → /v1/ministries
 *   - Departments → /v1/departments
 *   - Divisions   → /v1/divisions
 *   - Provinces   → /v1/provinces
 *   - Positions   → /v1/positions
 *   - Assignments → /v1/assignments, /v1/users/:userId/assignments
 */
@Module({
  imports: [
    MinistriesModule,
    DepartmentsModule,
    DivisionsModule,
    ProvincesModule,
    PositionsModule,
    AssignmentsModule,
  ],
  exports: [
    MinistriesModule,
    DepartmentsModule,
    DivisionsModule,
    ProvincesModule,
    PositionsModule,
    AssignmentsModule,
  ],
})
export class GovernmentModule {}
