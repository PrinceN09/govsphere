# Changelog

All notable changes to Prinodia Workspace are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning follows
[Semantic Versioning](https://semver.org/).

---

## [0.6.3] — 2026-06-24

**Production Hardening.** Redis infrastructure, async job queues, compound performance indexes,
multi-stage Docker builds, and security hardening (JWT blacklist, explicit CSP, HSTS). 80 unit tests
across 7 suites.

### Added

**Redis Infrastructure (`apps/api`)**

- `RedisModule` — `@Global()` ioredis module with configurable host/port/db/password, lazy-connect
  disabled, exponential backoff retry strategy, READONLY + ECONNRESET reconnect-on-error
- `RedisService` — typed wrapper: permission cache (`perm:{userId}`, 60 s TTL), JWT blacklist
  (`bl:{jti}`, token-lifetime TTL), login rate-limit counters (`login:{ip}:{email}`, 30 min TTL),
  generic `get/set/del/exists/ttl`, health `ping()`
- `RedisHealthIndicator` — extends `@nestjs/terminus` `HealthIndicator`; added to
  `GET /health/ready` and exposed at `GET /health/redis`
- Migrated `PermissionsService` from in-process `Map` to Redis with 60 s TTL, graceful fallback to
  DB on Redis error

**Queue System (`apps/api`)**

- `QueueModule` — `@nestjs/bull` wired with BullModule; Redis db 1 for Bull (separate from app cache
  on db 0)
- Four queues: `email`, `invitation`, `notification`, `audit` (constants in `queues.ts`)
- `EmailProcessor` — nodemailer handlers for `password-reset`, `welcome`, `invitation`, `mfa-code`;
  all email templates in French
- `AuditExportProcessor` — `export-csv` (Prisma count + filter), `cleanup-old-logs` (deleteMany with
  configurable retention days)
- `EmailQueueService` — enqueueing service with `attempts: 3`, exponential backoff (5 s),
  `removeOnComplete: true`

**Performance Indexes (`packages/database`)**

- `AuditLog`: compound `@@index([userId, createdAt])` and `@@index([action, createdAt])`
- `UserSession`: compound `@@index([userId, isActive])`
- Migration `20260624230000_v0_6_3_performance_indexes` using
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS` (no table locks)

**Docker & Infrastructure**

- `apps/api/Dockerfile` — 3-stage: `deps` (npm ci) → `builder` (prisma generate + nest build) →
  `runtime` (dumb-init, non-root `govsphere` user)
- `apps/web/Dockerfile` — 3-stage using Next.js `output: "standalone"`
- `docker-compose.prod.yml` — all services: postgres, redis (512 MB maxmemory, allkeys-lru), minio,
  api, web; internal `govsphere_prod_network`; health checks on every service; secrets via
  `${VAR:?VAR required}` syntax

**Testing**

- `redis.service.spec.ts` — 20 tests: generic ops, permission cache (hit/miss/corrupt JSON), JWT
  blacklist, login rate-limit (first-call expire, subsequent no-expire, reset), ping, lifecycle
- `permissions.service.spec.ts` — rewritten: 11 tests covering Redis cache hit, miss, error
  fallback, deduplication, empty set, non-fatal write failure, invalidation
- `security.service.spec.ts` — 7 tests: `revokeSessionById` (success + NotFoundException),
  `revokeAllSessionsForUser` (count 3, count 0), `findAllSessions` (paginated with meta)
- `email.processor.spec.ts` — 9 tests: each email handler verifies recipient + content, lifecycle
  hooks (onActive, onCompleted, onFailed)
- `audit-export.processor.spec.ts` — 5 tests: export with filters, full export, cleanup with config
  retention, cleanup with job retention, onFailed hook

**Total: 80 unit tests across 7 suites, all passing.**

### Changed

**Security Hardening (`apps/api`)**

- `auth.service.ts` — `logout()` blacklists access token JTI in Redis (`bl:{jti}`, 15 min TTL);
  non-fatal on Redis failure
- `jwt.strategy.ts` — `validate()` checks `redis.isTokenBlacklisted(payload.jti)` before DB query;
  throws `TOKEN_REVOKED` `UnauthorizedException` if blacklisted
- `main.ts` — explicit Helmet CSP directives (`defaultSrc: 'none'`, locked `scriptSrc/styleSrc` in
  production), `crossOriginOpenerPolicy: same-origin`, `crossOriginResourcePolicy: same-site`, HSTS
  2-year with `includeSubDomains` + `preload` (production only)

**Next.js (`apps/web`)**

- `next.config.ts` — added `output: "standalone"` (required for multi-stage Docker build)

### Fixed

- `getPermissions` in `RedisService` now catches `JSON.parse` errors for corrupted cache entries and
  returns `null` (cache miss semantics)
- `invalidateCache` in `PermissionsService` is now `async`; all callers in `roles.service.ts` and
  `users.service.ts` use `void` prefix for intentional fire-and-forget

---

## [0.6.2] — 2026-06-24

**Security Operations Center.** Session management, audit center, employee security tab, and
security dashboard with real-time threat indicators.

### Added

- `SecurityModule` — dashboard endpoint, session revocation (single + all), user security profile,
  login history
- `AuditController` — CSV export with `Content-Disposition` header, severity filter query param
- `/admin/security` — Security Dashboard: active sessions count, recent events, threat level
  indicator
- `/admin/security/sessions` — Session Management: list all active sessions, revoke single or all
  for a user
- `/admin/audit` — Audit Center: filterable event log with severity badge, export to CSV
- Employee profile `/admin/employees/[id]` — Security tab: MFA status, active sessions, login
  history, password age

---

## [0.6.1] — 2026-06-24

**Workforce Management.** Transfer tracking, position history, org chart, and workforce dashboard.

### Added

- `WorkforceTransfer` Prisma model + `TRANSFER`, `POSITION_CHANGE` audit actions
- `WorkforceModule` — `POST /v1/workforce/transfer`, `GET /v1/users/:id/transfers`,
  `POST /v1/workforce/position-change`
- `GET /v1/users/:id/role-history` and `GET /v1/users/:id/effective-permissions` on RolesModule
- `GET /v1/users/:id/timeline` — unified timeline merging audit events, transfers, and role changes
- `/admin/employees/[id]/timeline` — chronological event timeline page
- `/admin/org-chart` — interactive organization tree with expand/collapse
- `/admin/workforce` — workforce dashboard: pending transfers, recent moves, headcount by ministry

---

## [0.6.0] — 2026-06-24

**Employee Lifecycle & Identity Platform.** Full employee onboarding/offboarding, invitation flow,
session management, and RBAC expansion.

### Added

- Prisma schema: `Employee` lifecycle fields (`onboardingStatus`, `startDate`, `endDate`),
  `Invitation` model, `UserSession` model
- `EmployeesModule` — onboarding CRUD, invitation send/accept, lifecycle state machine
- Employee profile `GET /v1/employees/:id` with all relations (role history, assignment, ministry,
  department)
- `/admin/employees` — employees list with Create Employee form + Invite flow
- `/admin/employees/[id]` — employee profile: Overview, Roles, Workforce, Security tabs

---

## [0.5.0] — 2026-06-24

**Design System & UI Polish.** Premium Prinodia Workspace design system with DRC national identity, dark navy
sidebar, authority-gold active indicator, sharp corners throughout, and a fully rebuilt component
library.

### Added

**Design Tokens (`apps/web`)**

- `tailwind.config.ts` — Complete token override: `navy-*` scale (sidebar surfaces), `primary-*`
  (government blue #1550C8), `gold-*` (authority accent #D4A012), `danger/success/warning` scales,
  sharp `borderRadius` override (0–4px), `shadow-authority`, `shadow-card`, `shadow-dialog`,
  `tracking-label`, `fontSize-2xs`
- `src/app/globals.css` — CSS custom properties: `--drc-blue/gold/red`, `--authority-gold`,
  `--sidebar-bg`, `--surface-page`, DRC stripe utility classes, `authority-bar` inset shadow
- `src/lib/design-tokens.ts` — TypeScript constants for raw token values (charts, canvas use)

**New UI Components**

- `Card` + `CardHeader` + `CardBody` — sharp-corner card with optional authority left-border variant
- `Alert` — info / success / warning / danger variants with icon, title, dismiss button
- `Tabs` + `TabList` + `Tab` + `TabPanel` — context-based tab system with blue underline indicator

**Rebuilt UI Components** (same API, new visual language)

- `Button` — zero border-radius, tighter tracking, all four variants recalibrated
- `Input` — uppercase tracking-label labels, sharp border, blue focus ring with opacity
- `Select` — matching Input label system, sharp corners
- `Badge` — ring-inset treatment, added `gold` variant, sharper corners
- `Table` / `TableHead` / `TableBody` / `TableRow` / `TableHeaderCell` / `TableCell` / `TableEmpty`
  — slate colour scale, 11px uppercase tracking headers, no rounded corners
- `Dialog` / `ConfirmDialog` — sharp corners, `shadow-dialog`, slide-up animation on open
- `Spinner` / `PageSpinner` — thinner stroke, slate label colour
- `StatCard` — 2px accent bar at top (per-card colour), sharp corners, tight tracking on value
- `EmptyState` — square icon container (border + bg-slate-50), sharper presentation
- `Pagination` — border-t separator, icon chevrons, sharp page buttons
- `SearchInput` — slate border system, matching focus ring

**Layout Components**

- `AdminSidebar` — Dark navy (`#07101D`) background, DRC tri-colour stripe at top, grouped nav
  sections (Main / Structure gouvernementale / Ressources humaines), gold `authority-bar` active
  indicator (3px inset shadow — the signature element), gold icon on active item, mobile overlay
  with backdrop
- `AdminTopBar` — Reads mobile-open trigger from `MobileSidebarContext`, square avatar, role label
  in uppercase, slide-down dropdown animation
- `MobileSidebarContext` — React context so any page's `AdminTopBar` can trigger the sidebar without
  prop threading

**Auth Pages**

- `(auth)/layout.tsx` — Dark navy (`bg-navy-900`) background replaces blue gradient; DRC stripe at
  card top; card is sharp-cornered white panel
- `(auth)/login/page.tsx` — Uses new `Alert` component for errors, sharp typography
- `(auth)/login/mfa/page.tsx` — Alert component for errors
- `(auth)/forgot-password/page.tsx` — Alert + success state restyled
- `(auth)/reset-password/page.tsx` — Alert component for errors

**Admin Pages**

- `(admin)/layout.tsx` — Wraps children in `MobileSidebarContext.Provider`; no longer passes sidebar
  open state as props
- `(admin)/page.tsx` (Dashboard) — Removed gradient welcome banner; replaced with authority-card
  (gold top stripe); stat cards in gap-px grid creating unified bordered panel; removed
  `PageSpinner` import

### Design System Decisions

- **Signature element:** Gold authority bar (`box-shadow: inset 3px 0 0 #D4A012`) on active sidebar
  nav items — the single most characteristic visual element, used nowhere else
- **DRC brand stripe:** 3px horizontal blue/gold/red stripe used only at sidebar top and auth card
  top — identity marker, never button fill
- **Sharp corners:** `borderRadius` Tailwind override caps all radii at 0–4px globally — aesthetic
  risk taken on purpose for government/official feel
- **Page background:** `#E8EDF5` — cool blue-tinted off-white (not pure gray) giving
  documents-on-paper feel
- **Gold usage:** Strictly accent-only — active nav indicator and stat card accent bars; never
  backgrounds, never buttons

### Changed

- `tailwind.config.ts` — Complete rewrite (see above)
- `src/app/globals.css` — Complete rewrite (see above)

---

## [0.4.0] — 2026-06-24

**Administration Portal.** Full-stack administration portal for the DRC Government Structure with
production-ready authentication, bilingual UI, and RBAC-protected admin pages.

### Added

**Authentication Layer (apps/web)**

- NextAuth v4 with two CredentialsProviders: `credentials` (email/matricule login) and `mfa`
  (TOTP/backup-code MFA verification)
- JWT callback for server-side access token refresh using stored refresh token
- Session callback exposing `accessToken`, `permissions[]`, `role`, `ministryId` to all client
  components
- `next-auth.d.ts` type augmentation for Prinodia Workspace-specific session fields
- `middleware.ts` — App Router middleware protecting `/admin/*`, redirecting MFA-pending sessions,
  handling expired sessions
- `lib/auth.ts` — Full NextAuth options with token refresh, MFA sentinel state,
  `exactOptionalPropertyTypes`-compliant types
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
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty` —
  enterprise data table
- `Pagination` — smart page number display with ellipsis
- `SearchInput` — debounce-ready search field with icon
- `Dialog` + `ConfirmDialog` — native `<dialog>` element with backdrop click close
- `StatCard` — stat card with icon, value, label, accent colour
- `EmptyState` — empty state with icon, title, description, CTA

**Layout Components (apps/web/src/components/layout)**

- `AdminSidebar` — collapsible sidebar with DRC-brand accent, permission-gated nav items
- `AdminTopBar` — page title/subtitle, user avatar menu, sign-out
- `PermissionGate` — renders children only when session has required permission(s); supports
  `permission`, `allOf`, `anyOf`
- `Providers` — SessionProvider + QueryClientProvider + TokenSync (keeps axios client in sync with
  NextAuth session)

**Authentication Pages (apps/web/src/app/(auth))**

- `/login` — credential + password form with error handling (locked, inactive, invalid)
- `/login/mfa` — TOTP 6-digit code + backup code toggle
- `/forgot-password` — sends reset link, shows success state
- `/reset-password` — new password with confirm + strength rules

**Administration Portal (apps/web/src/app/(admin))**

- `/admin` — Dashboard with 6 stat cards (provinces, ministries, departments, divisions, positions,
  employees), welcome banner, DRC context
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

- `government/positions/positions.service.ts` — Replaced `PrismaExt` cast with direct
  `this.prisma.position`, `Prisma.QueryMode.insensitive`, `Prisma.PositionWhereInput`, `AuditAction`
  enum members, `Prisma.PositionGetPayload` typed return

---

## [0.1.0-foundation] — 2026-06-23

**Foundation release.** This release establishes the complete engineering foundation for Prinodia Workspace:
monorepo structure, database schema, Identity Platform, CI pipeline, security hardening,
documentation, and architectural decisions. No business features beyond authentication and identity
are included.

### Added

**Repository & Monorepo**

- Turborepo monorepo with `apps/`, `packages/`, `infra/`, `docs/`, `docker/`, `scripts/`, `.github/`
  structure
- Shared TypeScript configuration hierarchy (`tsconfig.json`, `tsconfig.node.json`,
  `tsconfig.react.json`)
- Root ESLint configuration with `@typescript-eslint/recommended-type-checked`, import ordering, and
  Prettier
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

- `User` model with `UserStatus`, `UserType`, `UserRole` (enum), `failedLoginCount`, `lockedUntil`,
  `passwordChangedAt`
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

- `AuthService` — Matricule + email login, bcrypt cost 12, account lockout (5 soft / 10 hard),
  password reset with SHA-256 token hash, token pair issuance
- `JwtStrategy` — RS256 verification with per-request user validation
- `AuthController` — `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`,
  `POST /v1/auth/logout-all`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`,
  `GET /v1/auth/me`
- Refresh token as `HttpOnly SameSite=Strict Secure` cookie at path `/v1/auth/refresh`
- Token family rotation with reuse detection → revoke all family sessions
- `UsersService` — user CRUD, status management, scoped listing (Ministry Admin sees only their
  ministry)
- `RolesService` — weight-based role assignment with organizational scope enforcement
- `PermissionsService` — in-process cache (1-min TTL), falls back to `User.role` enum
- `SessionsService` — session listing, revocation, idle cleanup
- `MfaService` — TOTP setup, confirmation, verification; AES-256-GCM TOTP secret encryption; 8
  backup codes
- `AuditService` — fire-and-forget immutable audit writes
- Global guards: `JwtAuthGuard`, `PermissionsGuard`, `ThrottlerGuard`
- Decorators: `@Public()`, `@CurrentUser()`, `@RequirePermissions()`
- `GlobalExceptionFilter` — structured JSON error response with `requestId`

**Infrastructure (Sprint 1 Foundation Hardening)**

- Zod environment validation (`env.validation.ts`) — app fails to start on missing/invalid vars
- Typed config modules: `application.config.ts`, `database.config.ts`, `jwt.config.ts`,
  `mail.config.ts`, `redis.config.ts`, `storage.config.ts`
- Pino structured logging (`AppLogger`) — JSON output, Loki-compatible, request ID correlation
- `LoggingModule` — global Pino logger
- `RequestIdMiddleware` — UUID per request, forwarded as `X-Request-ID` header
- `HealthModule` with `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /health/db` via
  `@nestjs/terminus`
- `CacheModule` — NestJS cache-manager (in-memory v0.1, Redis-ready)
- `QueueModule` — BullMQ scaffold (activated Sprint 2)
- `StorageModule` — MinIO scaffold (activated Sprint 3)
- `EventsModule` — domain event system scaffold (activated Sprint 2)
- Docker Compose for local dev: PostgreSQL 17, Redis 7, MinIO, MailHog, pgAdmin

**GitHub & DevOps**

- GitHub Actions CI workflow: lint, type-check, unit tests (with PostgreSQL + Redis services),
  build, npm audit
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

- `auth.service.spec.ts` — 18 unit tests (credential detection, login flows, lockout, password
  reset, logout)
- `permissions.service.spec.ts` — 6 unit tests (role resolution, cache, fallback)
- `roles.service.spec.ts` — 9 unit tests (weight checks, scope enforcement, audit logging)
- Jest configuration with ts-jest, coverage thresholds (80% branches, 85% functions/lines)

### Security

- Real password (`Ntunka2@16`) removed from `.env.example` — replaced with `CHANGE_ME_*`
  placeholders
- JWT configuration updated from symmetric (HS256) to asymmetric RS256 in `.env.example` and
  documentation
- `MFA_ENCRYPTION_KEY` validation enforces 64-hex-char format
- `CHANGE_ME_*` placeholder detection in Zod validation prevents production deployment with default
  values
- `X-Request-ID` header exposed for log correlation across client/server

### Changed

- `AppModule` wired with `RequestIdMiddleware`, `LoggingModule`, `HealthModule`, `CacheModule`,
  `QueueModule`, `StorageModule`, `EventsModule`
- `GlobalExceptionFilter` updated to include `requestId` field in all error responses
- `main.ts` updated to use Pino logger as NestJS logger; Swagger enhanced with tag organization and
  cookie auth
- `.env.example` restructured with clearer sections, RS256 key documentation, and generation
  instructions

### Infrastructure

- `docker/` directory created for future per-app Dockerfiles
- `scripts/` directory created for developer automation scripts
- `.github/` directory created with full CI/CD and community files

---

## [0.3.0] — 2026-06-24

**Government Structure release.** Implements the complete DRC government organizational hierarchy as
Prisma models, REST APIs, and seed data.

### Added

**Database Schema (Prisma v3)**

- `Province` model — 26 DRC provinces with multilingual name translations and capital city
- `Office` model — Provincial government offices, linked to both Province and Ministry
- `PositionLevel` enum — `EXECUTIVE`, `DIRECTOR`, `MANAGER`, `SPECIALIST`, `OFFICER`, `SUPPORT`
- `Position` model — Civil service positions scoped to Ministry/Department/Division/Office with
  headcount
- `EmployeeAssignment` model — Employee-to-position assignments with start/end dates, primary flag,
  and audit trail
- Extended `Division` with `nameTranslations` (JSON) and `description` fields
- Extended `Ministry` and `Department` with `positions` and `offices` relations
- Extended `User` with `employeeAssignments` relation
- 19 new `AuditAction` enum values: `MINISTRY_CREATED/UPDATED/DEACTIVATED`, `DEPARTMENT_*`,
  `DIVISION_*`, `PROVINCE_*`, `OFFICE_*`, `POSITION_*`, `EMPLOYEE_ASSIGNED/ASSIGNMENT_ENDED`
- Migration `20260624172831_add_government_structure`

**NestJS Modules (Government Structure)**

- `GovernmentModule` — aggregator module wiring all 6 sub-modules
- `MinistriesModule` — `GET/POST /v1/ministries`, `GET/PATCH/DELETE /v1/ministries/:id`,
  `GET /v1/ministries/code/:code`
- `DepartmentsModule` — `GET/POST /v1/departments`, `GET/PATCH/DELETE /v1/departments/:id`
- `DivisionsModule` — `GET/POST /v1/divisions`, `GET/PATCH/DELETE /v1/divisions/:id`
- `ProvincesModule` — `GET/POST /v1/provinces`, `GET/PATCH /v1/provinces/:id`
- `PositionsModule` — `GET/POST /v1/positions`, `GET/PATCH /v1/positions/:id`
- `AssignmentsModule` — `POST /v1/assignments`, `GET /v1/assignments/:id`,
  `PATCH /v1/assignments/:id/end`, `GET /v1/users/:userId/assignments`
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
- Integrated into all 8 system roles (SUPER_ADMIN gets all; lower roles get appropriate read/write
  subsets)

**Seed Data**

- 26 DRC provinces with ISO-style codes, French names, and capital cities
- 36 DRC ministries with French names, English translations, and descriptions

### Changed

- `AppModule` — imports `GovernmentModule`
- `packages/database/prisma/seed.ts` — extended with provinces and ministries seed (idempotent
  `upsert`)

---

## [0.2.0] — 2026-06-24

**Identity Platform release.** Completes the authentication, RBAC, MFA, audit, and session
management platform.

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

_For the complete roadmap, see [docs/10_Roadmap.md](./docs/10_Roadmap.md)._
