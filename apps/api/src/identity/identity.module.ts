import { Module } from "@nestjs/common";

import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { MfaModule } from "./mfa/mfa.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { RolesModule } from "./roles/roles.module";
import { SessionsModule } from "./sessions/sessions.module";
import { UsersModule } from "./users/users.module";
import { WorkforceModule } from "./workforce/workforce.module";

/**
 * Identity Platform — the security foundation of GovSphere.
 *
 * Encapsulates all authentication, authorization, session management,
 * MFA, audit logging, and user lifecycle management.
 *
 * Import this single module into AppModule — it wires all sub-modules.
 */
@Module({
  imports: [
    AuditModule,
    PermissionsModule,
    SessionsModule,
    UsersModule,
    RolesModule,
    AuthModule,
    MfaModule,
    WorkforceModule,
  ],
  exports: [
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SessionsModule,
    MfaModule,
    AuditModule,
    WorkforceModule,
  ],
})
export class IdentityModule {}
