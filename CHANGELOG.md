# Changelog

All notable changes to GovSphere are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.4.0] — 2026-06-24

**Administration Portal.** Full-stack administration portal for the DRC Government Structure with production-ready authentication, bilingual UI, and RBAC-protected admin pages.

### Added

**Authentication Layer (apps/web)**
- NextAuth v4 with two CredentialsProviders: `credentials` (email/matricule login) and `mfa` (TOTP/backup-code MFA verification)
- JWT callback for server-side access token refresh using stored refresh token
- Session callback exposing `accessToken`, `permissions[]`, `role`, `ministryId` to all client components
- `next-auth.d.ts` type augmentation for GovSphere-specific session fields
- `middleware.ts` — App Router middleware protecting `/admin/*`, redirecting MFA-pending sessions, handling expired sessions
- `lib/auth.ts` — Full NextAuth options with token refresh, MFA sentinel state, `exactOptionalPropertyTypes`-compliant types
- `lib/api.ts` — Axios client with Authorization header injection and 401 handler

**i18n (next-intl)**
- `messages/fr.json` — Full French translation for all app sections
- `messages/en.json` — Full English translation for all app sections
- `src/i18n.ts` — next-intl configuration with fr/en locale support (French default)

**UI Component Library (apps/web/src/components/ui)**
- `Button` — primary / secondary / ghost / danger variants, sizes sm/md/lg, loading spinner
- `Input` — label, error, hint, left/right addons, `exactOptionalPropertyTypes`-compliant
- `Select` — dropdown with options array, placeholder, error display
- `Badge` + `StatusBadge` — green/red/blue/yellow/gray/purple variants
- `Spinner` + `PageSpinner` — accessible loading indicators
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty` — enterprise data table
- `Pagination` — smart page number display with ellipsis
- `SearchInput` — debounce-ready search field with icon
- `Dialog` + `ConfirmDialog` — native `<dialog>` element with backdrop click close
- `StatCard` — stat card with icon, value, label, accent colour
- `EmptyState` — empty state with icon, title, description, CTA

**Layout Components (apps/web/src/components/layout)**
- `AdminSidebar` — collapsible sidebar with DRC-brand accent, permission-gated nav items
- `AdminTopBar` — page title/subtitle, user avatar menu, sign-out
- `PermissionGate` — renders children only when session has required permission(s); supports `permission`, `allOf`, `anyOf`
- `Providers` — SessionProvider + QueryClientProvider + TokenSync (keeps axios client in sync with NextAuth session)

**Authentication Pages (apps/web/src/app/(auth))**
- `/login` — credential + password form with error handling (locked, inactive, invalid)
- `/login/mfa` — TOTP 6-digit code + backup code toggle
- `/forgot-password` — sends reset link, shows success state
- `/reset-password` — new password with confirm + strength rules

**Administration Portal (apps/web/src/app/(admin))**
- `/admin` — Dashboard with 6 stat cards (provinces, ministries, departments, divisions, positions, employees), welcome banner, DRC context
- `/admin/provinces` — Data table, search, create/edit dialogs, status badge
- `/admin/ministries` — Data table, search, create/edit/deactivate with RBAC gates
- `/admin/departments` — Ministry-scoped data table, ministry selector, CRUD dialogs
- `/admin/divisions` — Department-scoped data table, department selector, CRUD dialogs
- `/admin/positions` — Level badges (Executive → Support), headcount, ministry selector, CRUD
- `/admin/employees` — Read-only staff table with role/status badges

**Shared lib utilities**
- `lib/permissions.ts` — `hasPermission`, `hasAllPermissions`, `hasAnyPermission`, `PERMS` constants
- `lib/use-list-query.ts` — Generic TanStack Query hook for paginated CRUD list pages

### Changed
- `apps/web/src/app/layout.tsx` — Added Providers wrapper, getServerSession, antialiased body
- `apps/web/src/app/page.tsx` — Root `/` now redirects to `/admin`

---

## [0.3.1] — 2026-06-24

**Type-check fixes.** Post-migration cleanup of Prisma stale-client workarounds.

### Changed
- `government/positions/positions.service.ts` — Replaced `PrismaExt` cast with direct `this.prisma.position`, `Prisma.QueryMode.insensitive`, `Prisma.PositionWhereInput`, `AuditAction` enum members, `Prisma.PositionGetPayload` typed return

---

## [0.1.0-foundation] — 2026-06-23

**Foundation release.** This release establishes the complete engineering foundation for GovSphere: monorepo structure, database schema, Identity Platform, CI pipeline, security hardening, documentation, and architectural decisions. No business features beyond authentication and identity are included.

### Added

**Repository & Monorepo**
- Turborepo monorepo with `apps/`, `packages/`, `infra/`, `docs/`, `docker/`, `scripts/`, `.github/` structure
- Shared TypeScript configuration hierarchy (`tsconfig.json`, `tsconfig.node.json`, `tsconfig.react.json`)
- Root ESLint configuration with `@typescript-eslint/recommended-type-checked`, import ordering, and Prettier
- Root Prettier configuration
- `.gitignore` covering Node, Turborepo, Next.js, Prisma, and OS artifacts
- `.npmrc` for workspace-aware npm behavior
- Husky + lint-staged for pre-commit hooks
- `package.json` scripts: `dev`, `build`, `test`, `lint`, `type-check`, `format`, `db:*`, `docker:*`

**Applications**
- `apps/api/` — NestJS 10 API scaffold with full TypeScript strict mode
- `apps/web/` — Next.js 15 App Router scaffold with Tailwind CSS
- `apps/desktop/` — Tauri 2 desktop app scaffold (Phase 10 implementation)
- `apps/mobile/` — React Native 0.74 mobile app scaffold (Phase 10 implementation)

**Packages**
- `packages/database/` — Prisma 5 schema, migrations, seed script
- `packages/ui/` — Shared Radix UI + Tailwind component library scaffold
- `packages/types/` — Shared TypeScript type definitions
- `packages/config/` — Environment schemas and shared constants
- `packages/auth/` — Authentication helpers and RBAC utilities
- `packages/i18n/` — Translation files for fr, en, ln, sw, lua
- `packages/utils/` — Shared utility functions

**Database Schema (Prisma)**
- `User` model with `UserStatus`, `UserType`, `UserRole` (enum), `failedLoginCount`, `lockedUntil`, `passwordChangedAt`
- `Ministry`, `Department`, `Division`, `Team` organizational hierarchy models
- `Role`, `Permission`, `RolePermission` — RBAC entity models
- `UserRoleAssignment` — scoped join table (supports ministry/department/division scope and expiry)
- `UserSession` — JWT session tracking with token family rotation
- `UserDevice` — device fingerprinting and trusted device registry
- `LoginHistory` — per-login audit trail
- `PasswordResetToken` — secure password reset flow
- `PasswordHistory` — last 10 hashes enforced
- `MfaDevice` — FIDO2/TOTP device registration
- `MfaBackupCode` — bcrypt-hashed backup codes
- `AuditLog` — immutable audit log with 30+ `AuditAction` enum values
- `File` model with `FileStatus` enum (metadata only — no binary content)
- `Channel`, `Message`, `Reaction`, `MessageRead` — placeholder models for Sprint 2
- Seed script: 30 permissions across AUTH/USER/CHANNEL/FILE/ADMIN resources; 8 system roles

**Identity Platform (Sprint 1)**
- `AuthService` — Matricule + email login, bcrypt cost 12, account lockout (5 soft / 10 hard), password reset with SHA-256 token hash, token pair issuance
- `JwtStrategy` — RS256 verification with per-request user validation
- `AuthController` — `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `POST /v1/auth/logout-all`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`, `GET /v1/auth/me`
- Refresh token as `HttpOnly SameSite=Strict Secure` cookie at path `/v1/auth/refresh`
- Token family rotation with reuse detection → revoke all family sessions
- `UsersService` — user CRUD, status management, scoped listing (Ministry Admin sees only their ministry)
- `RolesService` — weight-based role assignment with organizational scope enforcement
- `PermissionsService` — in-process cache (1-min TTL), falls back to `User.role` enum
- `SessionsService` — session listing, revocation, idle cleanup
- `MfaService` — TOTP setup, confirmation, verification; AES-256-GCM TOTP secret encryption; 8 backup codes
- `AuditService` — fire-and-forget immutable audit writes
- Global guards: `JwtAuthGuard`, `PermissionsGuard`, `ThrottlerGuard`
- Decorators: `@Public()`, `@CurrentUser()`, `@RequirePermissions()`
- `GlobalExceptionFilter` — structured JSON error response with `requestId`

**Infrastructure (Sprint 1 Foundation Hardening)**
- Zod environment validation (`env.validation.ts`) — app fails to start on missing/invalid vars
- Typed config modules: `application.config.ts`, `database.config.ts`, `jwt.config.ts`, `mail.config.ts`, `redis.config.ts`, `storage.config.ts`
- Pino structured logging (`AppLogger`) — JSON output, Loki-compatible, request ID correlation
- `LoggingModule` — global Pino logger
- `RequestIdMiddleware` — UUID per request, forwarded as `X-Request-ID` header
- `HealthModule` with `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /health/db` via `@nestjs/terminus`
- `CacheModule` — NestJS cache-manager (in-memory v0.1, Redis-ready)
- `QueueModule` — BullMQ scaffold (activated Sprint 2)
- `StorageModule` — MinIO scaffold (activated Sprint 3)
- `EventsModule` — domain event system scaffold (activated Sprint 2)
- Docker Compose for local dev: PostgreSQL 17, Redis 7, MinIO, MailHog, pgAdmin

**GitHub & DevOps**
- GitHub Actions CI workflow: lint, type-check, unit tests (with PostgreSQL + Redis services), build, npm audit
- Dependabot configuration (weekly npm + GitHub Actions updates)
- Issue templates: bug report, feature request
- PR template with security checklist, database change checklist, i18n checklist
- `CODEOWNERS` — security team required for auth/RBAC/MFA changes
- `SECURITY.md` — responsible disclosure policy
- `CONTRIBUTING.md` — branching strategy, Conventional Commits, testing requirements
- `CODE_OF_CONDUCT.md`

**Documentation**
- `docs/01_Product_Vision.md` — Mission, goals, stakeholders
- `docs/02_Product_Requirements.md` — Functional and non-functional requirements
- `docs/03_System_Architecture.md` — High-level system design
- `docs/04_Database_Architecture.md` — Schema design, entity relationships
- `docs/05_API_Architecture.md` — REST API design, versioning, conventions
- `docs/06_UI_Design_System.md` — Component library, design tokens
- `docs/07_Security_Architecture.md` — Auth, RBAC, encryption, audit, threat model
- `docs/08_Engineering_Standards.md` — Code conventions, PR process, DoD
- `docs/09_DevOps_Architecture.md` — CI/CD, Docker, Terraform, observability
- `docs/10_Roadmap.md` — Sprint plan, milestones, version targets
- `docs/11_Identity_Platform_Architecture.md` — Identity service design document
- `docs/INDEX.md` — Documentation index
- `docs/adr/ADR-001` through `docs/adr/ADR-010` — Architecture Decision Records
- `README.md` — Enterprise-grade project README
- `CHANGELOG.md` (this file)

**Tests**
- `auth.service.spec.ts` — 18 unit tests (credential detection, login flows, lockout, password reset, logout)
- `permissions.service.spec.ts` — 6 unit tests (role resolution, cache, fallback)
- `roles.service.spec.ts` — 9 unit tests (weight checks, scope enforcement, audit logging)
- Jest configuration with ts-jest, coverage thresholds (80% branches, 85% functions/lines)

### Security

- Real password (`Ntunka2@16`) removed from `.env.example` — replaced with `CHANGE_ME_*` placeholders
- JWT configuration updated from symmetric (HS256) to asymmetric RS256 in `.env.example` and documentation
- `MFA_ENCRYPTION_KEY` validation enforces 64-hex-char format
- `CHANGE_ME_*` placeholder detection in Zod validation prevents production deployment with default values
- `X-Request-ID` header exposed for log correlation across client/server

### Changed

- `AppModule` wired with `RequestIdMiddleware`, `LoggingModule`, `HealthModule`, `CacheModule`, `QueueModule`, `StorageModule`, `EventsModule`
- `GlobalExceptionFilter` updated to include `requestId` field in all error responses
- `main.ts` updated to use Pino logger as NestJS logger; Swagger enhanced with tag organization and cookie auth
- `.env.example` restructured with clearer sections, RS256 key documentation, and generation instructions

### Infrastructure

- `docker/` directory created for future per-app Dockerfiles
- `scripts/` directory created for developer automation scripts
- `.github/` directory created with full CI/CD and community files

---

## [0.3.0] — 2026-06-24

**Government Structure release.** Implements the complete DRC government organizational hierarchy as Prisma models, REST APIs, and seed data.

### Added

**Database Schema (Prisma v3)**
- `Province` model — 26 DRC provinces with multilingual name translations and capital city
- `Office` model — Provincial government offices, linked to both Province and Ministry
- `PositionLevel` enum — `EXECUTIVE`, `DIRECTOR`, `MANAGER`, `SPECIALIST`, `OFFICER`, `SUPPORT`
- `Position` model — Civil service positions scoped to Ministry/Department/Division/Office with headcount
- `EmployeeAssignment` model — Employee-to-position assignments with start/end dates, primary flag, and audit trail
- Extended `Division` with `nameTranslations` (JSON) and `description` fields
- Extended `Ministry` and `Department` with `positions` and `offices` relations
- Extended `User` with `employeeAssignments` relation
- 19 new `AuditAction` enum values: `MINISTRY_CREATED/UPDATED/DEACTIVATED`, `DEPARTMENT_*`, `DIVISION_*`, `PROVINCE_*`, `OFFICE_*`, `POSITION_*`, `EMPLOYEE_ASSIGNED/ASSIGNMENT_ENDED`
- Migration `20260624172831_add_government_structure`

**NestJS Modules (Government Structure)**
- `GovernmentModule` — aggregator module wiring all 6 sub-modules
- `MinistriesModule` — `GET/POST /v1/ministries`, `GET/PATCH/DELETE /v1/ministries/:id`, `GET /v1/ministries/code/:code`
- `DepartmentsModule` — `GET/POST /v1/departments`, `GET/PATCH/DELETE /v1/departments/:id`
- `DivisionsModule` — `GET/POST /v1/divisions`, `GET/PATCH/DELETE /v1/divisions/:id`
- `ProvincesModule` — `GET/POST /v1/provinces`, `GET/PATCH /v1/provinces/:id`
- `PositionsModule` — `GET/POST /v1/positions`, `GET/PATCH /v1/positions/:id`
- `AssignmentsModule` — `POST /v1/assignments`, `GET /v1/assignments/:id`, `PATCH /v1/assignments/:id/end`, `GET /v1/users/:userId/assignments`
- All DTOs with `class-validator` decorators, pagination, and filtered list queries
- Full audit logging on all write operations (create/update/deactivate/assign/end)
- Parent-existence validation (ministry before department, department before division)
- Unique code constraint enforcement with descriptive `ConflictException`

**Permissions (21 new)**
- `MINISTRY:READ/CREATE/UPDATE/DEACTIVATE`
- `DEPARTMENT:READ/CREATE/UPDATE/DEACTIVATE`
- `DIVISION:READ/CREATE/UPDATE/DEACTIVATE`
- `PROVINCE:READ/CREATE/UPDATE`
- `POSITION:READ/CREATE/UPDATE`
- `EMPLOYEE_ASSIGNMENT:READ/CREATE/UPDATE`
- Integrated into all 8 system roles (SUPER_ADMIN gets all; lower roles get appropriate read/write subsets)

**Seed Data**
- 26 DRC provinces with ISO-style codes, French names, and capital cities
- 36 DRC ministries with French names, English translations, and descriptions

### Changed

- `AppModule` — imports `GovernmentModule`
- `packages/database/prisma/seed.ts` — extended with provinces and ministries seed (idempotent `upsert`)

---

## [0.2.0] — 2026-06-24

**Identity Platform release.** Completes the authentication, RBAC, MFA, audit, and session management platform.

### Added

- Identity Platform: Auth, Users, Roles, Permissions, MFA, Sessions, Audit modules
- RBAC: weight-based role assignment, scoped role assignments (ministry/department/division)
- MFA: TOTP + FIDO2 architecture, AES-256-GCM TOTP secret encryption, 8 backup codes
- Audit: immutable audit log, 33 `AuditAction` enum values
- Sessions: JWT session tracking, token family rotation, reuse detection
- Tests: 33 unit tests across Auth, Permissions, Roles services

---

## Unreleased

### Planned for v0.4.0 (Channels & Messaging)

- Channel create, list, join, archive, member management
- Message send, edit, delete (soft), paginate (cursor-based), reactions, threads, pin/unpin
- Socket.IO gateway with Redis adapter
- Rooms: `channel:{id}`, `dm:{userId1}:{userId2}`, `presence:{userId}`
- Unit tests for ChannelsService and MessagesService

---

*For the complete roadmap, see [docs/10_Roadmap.md](./docs/10_Roadmap.md).*
