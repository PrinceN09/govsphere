# GovSphere — Engineering Task List

## Phase 1 — Foundation (Current)

- [x] Monorepo structure (Turborepo)
- [x] Root configuration (TypeScript, ESLint, Prettier)
- [x] Package scaffolds (ui, types, i18n, database, config, auth, utils)
- [x] Prisma schema (full domain model)
- [x] Docker Compose (local dev services)
- [x] i18n locale files (FR, EN, LN, SW, LUA)
- [x] Environment variable schema and validation

## Phase 2 — Authentication

- [ ] NestJS Auth module (JWT strategy, local strategy)
- [ ] Matricule + Email login endpoints
- [ ] Password hashing (bcrypt)
- [ ] Refresh token rotation
- [ ] Next.js login pages (matricule and email forms)
- [ ] NextAuth.js session wiring
- [ ] MFA scaffolding (TOTP-ready)
- [ ] Audit log: LOGIN, LOGOUT, LOGIN_FAILED

## Phase 2 — Identity Platform (v0.2.0) ✅ COMPLETE

- [x] NestJS Auth module (JWT RS256 strategy, matricule + email login)
- [x] Password hashing (bcrypt cost 12), account lockout (5 soft / 10 hard)
- [x] Refresh token rotation with family-based reuse detection
- [x] RBAC: Role, Permission, RolePermission, UserRoleAssignment (scoped)
- [x] MFA: TOTP setup/verify, FIDO2 architecture, AES-256-GCM secret encryption, 8 backup codes
- [x] Sessions: listing, revocation, idle cleanup
- [x] Audit: fire-and-forget immutable writes, 33 AuditAction values
- [x] 33 unit tests (Auth, Permissions, Roles)

## Phase 3 — Government Structure (v0.3.0) ✅ COMPLETE

- [x] Prisma: Province, Office, Position, EmployeeAssignment models
- [x] Migration: `20260624172831_add_government_structure`
- [x] MinistriesModule: CRUD API at `/v1/ministries`
- [x] DepartmentsModule: CRUD API at `/v1/departments`
- [x] DivisionsModule: CRUD API at `/v1/divisions`
- [x] ProvincesModule: CRUD API at `/v1/provinces`
- [x] PositionsModule: CRUD API at `/v1/positions`
- [x] AssignmentsModule: Employee assignment API at `/v1/assignments`
- [x] GovernmentModule: aggregator wired into AppModule
- [x] 21 new permissions seeded (MINISTRY/DEPARTMENT/DIVISION/PROVINCE/POSITION/ASSIGNMENT)
- [x] Seed data: 26 DRC provinces, 36 DRC ministries
- [ ] Ministry CRUD UI (web)
- [ ] Department CRUD UI (web)
- [ ] Division CRUD UI (web)
- [ ] User management (create, activate, deactivate) UI
- [ ] Role assignment UI
- [ ] User profile page

## Phase 4 — Channels & Messaging

- [ ] Channel creation (public, private, announcement)
- [ ] Channel membership management
- [ ] Message send / receive (REST + Socket.IO)
- [ ] Message reactions
- [ ] Message pin
- [ ] Reply threading
- [ ] Direct messages (1:1)
- [ ] Group messages
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Presence (online/offline)

## Phase 5 — Files

- [ ] File upload endpoint (MinIO integration)
- [ ] File download (signed URL via API)
- [ ] File listing per channel
- [ ] File metadata storage in PostgreSQL
- [ ] File permission checks

## Phase 6 — UI

- [ ] Main layout (3-column: nav + sidebar + content)
- [ ] Left vertical navigation
- [ ] Channel sidebar
- [ ] Message list (virtualized)
- [ ] Message composer
- [ ] File attachments in messages
- [ ] Notification panel
- [ ] User settings
- [ ] Ministry/Department switcher

## Phase 7 — Search & Notifications

- [ ] Full-text message search (PostgreSQL pg_trgm → later OpenSearch)
- [ ] File search
- [ ] People search
- [ ] In-app notifications
- [ ] Email notifications (MailHog → SMTP in prod)

## Phase 8 — Admin

- [ ] Super admin dashboard
- [ ] User activation / deactivation
- [ ] Audit log viewer
- [ ] Ministry management UI
- [ ] System health dashboard
