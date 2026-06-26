<div align="center">

<img src="apps/web/public/brand/logo.svg" alt="Prinodia Workspace" width="180" />

# Prinodia Workspace

**One Workspace. Every Organization.**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)

[Documentation](./docs/) · [Architecture](./docs/03_System_Architecture.md) ·
[Security](./docs/07_Security_Architecture.md) · [Roadmap](./docs/10_Roadmap.md)

</div>

---

Prinodia Workspace is a modern, multilingual digital workspace developed by Prinodia that enables governments, enterprises, educational institutions, healthcare organizations, NGOs, churches, and other organizations to collaborate, manage operations, and work securely from anywhere.

It unifies communication, document management, workforce management, digital approvals, executive management, meetings, scheduling, and security into a single integrated platform available across Web, Desktop, and Mobile.

## Core Modules

- Dashboard & Analytics
- Workforce & Human Resources
- Organization Management
- Documents & Knowledge Management
- Collaboration & Messaging
- Calendar & Scheduling
- Meetings & Events
- Tasks & Projects
- Digital Workflows & Approvals
- Executive Office & Cabinet Management
- Security Center & Audit
- Notifications
- AI Assistant _(Coming Soon)_

## Supported Platforms

- Web
- Windows
- macOS
- Android
- iOS

## Supported Organizations

- Government Ministries
- Public Institutions
- Private Companies
- Small & Medium Businesses
- Universities & Schools
- Healthcare Organizations
- NGOs & Non-Profit Organizations
- Churches & Faith-Based Organizations

## Languages

**Currently Supported**

- English
- Français

**Planned**

- Español
- Português
- Lingala
- Swahili
- Kikongo
- Tshiluba

## About Prinodia

Prinodia is a technology company focused on building secure, scalable, multilingual software that empowers organizations through digital transformation.

Our mission is to simplify collaboration, improve operational efficiency, and provide modern digital tools that help organizations work better together.

## Vision

To become the leading multilingual digital workspace platform for governments, enterprises, and organizations across Africa and around the world.

## Core Features

**Identity & Security**

- Matricule number authentication (format: `1.641.558`) alongside email login
- Multi-factor authentication (TOTP) — mandatory for senior roles
- RS256 JWT with 15-minute access tokens and rotating refresh tokens
- Organizational RBAC: 8 role levels from `SUPER_ADMIN` (100) to `GUEST` (0)
- Account lockout, password history enforcement, and immutable audit logs

**Collaboration** _(Sprint 2+)_

- Structured channels scoped to ministry, department, or division
- Real-time messaging via Socket.IO with Redis pub/sub
- Threaded discussions, reactions, message pinning
- Direct messages and presence indicators

**Document Management** _(Sprint 3+)_

- Files stored in MinIO (S3-compatible) — never in PostgreSQL
- Versioning, permissions, and audit trail per file
- Virus scanning pipeline before storage

**Administration**

- Cross-ministry user management with delegation controls
- Organizational hierarchy editor
- Session management and device tracking
- Automated audit log retention and export

## Tech Stack

| Layer         | Technology     | Version | Rationale                                              |
| ------------- | -------------- | ------- | ------------------------------------------------------ |
| API           | NestJS         | 10      | Structured, decorator-based, enterprise DDD            |
| Web App       | Next.js        | 15      | App Router, SSR, i18n, React Server Components         |
| Desktop       | Tauri          | 2       | Lightweight native shell around web app                |
| Mobile        | React Native   | 0.74    | Shared business logic with web                         |
| Database      | PostgreSQL     | 17      | ACID, relational, full-text search, sovereignty        |
| ORM           | Prisma         | 5       | Type-safe queries, schema-first migrations             |
| Cache / Queue | Redis + BullMQ | 7 / 5   | Session store, job queues, Socket.IO adapter           |
| File Storage  | MinIO (S3)     | AGPL    | On-premise S3-compatible object storage                |
| Real-time     | Socket.IO      | 4       | WebSocket messaging, presence, typing events           |
| Auth          | JWT RS256      | —       | Asymmetric signing; private key signs, public verifies |
| Logging       | Pino           | 9       | Structured JSON, Loki-compatible, low overhead         |
| Monorepo      | Turborepo      | 2       | Incremental builds, shared config, task graph          |
| Language      | TypeScript     | 5.5     | Strict mode, full type-safety across the stack         |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Prinodia Workspace Platform                       │
│                                                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│   │  Web App │   │ Desktop  │   │  Mobile  │   │ External │  │
│   │ Next.js  │   │  Tauri   │   │React Nat.│   │ Partners │  │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘  │
│        └──────────────┴──────────────┴──────────────┘         │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │    NestJS API       │                       │
│                    │  REST + Socket.IO   │                       │
│                    │  /v1/*   ws://      │                       │
│                    └──┬──────┬──────┬───┘                       │
│                       │      │      │                           │
│              ┌────────┘  ┌───┘  ┌───┘                          │
│              │           │      │                              │
│   ┌──────────▼─┐ ┌───────▼──┐ ┌─▼────────┐                   │
│   │ PostgreSQL │ │  Redis   │ │  MinIO   │                   │
│   │ (Primary   │ │ (Cache + │ │ (Files + │                   │
│   │  Database) │ │  Queues) │ │  Media)  │                   │
│   └────────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Government Hierarchy

```
Government of the DRC (Central)
  └── Ministry  (e.g., Ministère des Finances)
        └── Department  (e.g., Direction Générale des Impôts)
              └── Division  (e.g., Division des Ressources)
                    └── Team
                          └── Channel
                                └── Users
```

Access to resources is always scoped to organizational level. A Ministry Admin can only see their
ministry. A Department Admin only sees their department. No horizontal access across sibling
organizations.

## Folder Structure

```
govsphere/
├── apps/
│   ├── api/              NestJS — REST API + WebSocket gateway
│   ├── web/              Next.js 15 — primary web application
│   ├── desktop/          Tauri — native desktop app (Phase 10)
│   └── mobile/           React Native — mobile app (Phase 10)
│
├── packages/
│   ├── database/         Prisma schema, migrations, seed
│   ├── ui/               Shared components (Radix UI + Tailwind)
│   ├── types/            Shared TypeScript types and interfaces
│   ├── config/           Environment schemas and shared constants
│   ├── auth/             Authentication helpers and RBAC utilities
│   ├── i18n/             Translations: fr, en, ln, sw, lua
│   └── utils/            Shared utility functions
│
├── infra/
│   ├── docker/           Docker Compose support files (pgAdmin, init SQL)
│   ├── kubernetes/       Kubernetes manifests (Phase 9)
│   └── terraform/        AWS ECS + RDS infrastructure as code (Phase 9)
│
├── docker/               Dockerfiles for each app
├── scripts/              Developer automation scripts
├── docs/                 Architecture and engineering documentation
│   └── adr/              Architecture Decision Records
│
└── .github/
    ├── workflows/        CI/CD GitHub Actions
    └── ISSUE_TEMPLATE/   Bug reports and feature requests
```

## Local Development

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- Docker Desktop (for PostgreSQL, Redis, MinIO, MailHog)
- An existing local PostgreSQL database (or use Docker)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/govsphere-drc/govsphere.git
cd govsphere

# 2. Copy environment variables and fill in values
cp .env.example .env
# Edit .env with your local settings

# 3. Install all dependencies (Turborepo monorepo)
npm install

# 4. Start local services (PostgreSQL, Redis, MinIO, MailHog, pgAdmin)
npm run docker:up

# 5. Generate Prisma client
npm run db:generate

# 6. Run database migrations
npm run db:migrate

# 7. Seed the database (roles, permissions)
npm run db:seed

# 8. Start all apps in development mode
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure the following required variables:

| Variable             | Required | Description                                     |
| -------------------- | -------- | ----------------------------------------------- |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                    |
| `REDIS_HOST`         | ✅       | Redis host (default: `127.0.0.1`)               |
| `REDIS_PORT`         | ✅       | Redis port (default: `6379`)                    |
| `REDIS_PASSWORD`     | —        | Redis password (required in production)         |
| `REDIS_DB`           | —        | Redis DB index for app cache (default: `0`)     |
| `BULLMQ_REDIS_DB`    | —        | Redis DB index for Bull queues (default: `1`)   |
| `JWT_PRIVATE_KEY`    | ✅       | RS256 private key (PEM, base64-encoded)         |
| `JWT_PUBLIC_KEY`     | ✅       | RS256 public key (PEM, base64-encoded)          |
| `MFA_ENCRYPTION_KEY` | ✅       | 32-byte hex key for AES-256-GCM TOTP encryption |
| `MINIO_ENDPOINT`     | ✅       | MinIO server host                               |
| `MINIO_ACCESS_KEY`   | ✅       | MinIO access key                                |
| `MINIO_SECRET_KEY`   | ✅       | MinIO secret key                                |
| `SMTP_HOST`          | ✅       | SMTP server host                                |

See [`.env.example`](./.env.example) for the full variable reference with descriptions.

**Generating RS256 keys:**

```bash
# Generate private key
openssl genrsa -out jwt-private.pem 4096

# Extract public key
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Base64-encode for .env
base64 -i jwt-private.pem | tr -d '\n'   # → JWT_PRIVATE_KEY
base64 -i jwt-public.pem  | tr -d '\n'   # → JWT_PUBLIC_KEY
```

### Local Service URLs

| Service       | URL                          | Default Credentials                          |
| ------------- | ---------------------------- | -------------------------------------------- |
| Web App       | http://localhost:3000        | —                                            |
| API           | http://localhost:4000        | —                                            |
| Swagger Docs  | http://localhost:4000/docs   | —                                            |
| Health Check  | http://localhost:4000/health | —                                            |
| pgAdmin       | http://localhost:5050        | admin@govsphere.local / admin                |
| MinIO Console | http://localhost:9001        | govsphere_minio_key / govsphere_minio_secret |
| MailHog       | http://localhost:8025        | —                                            |
| Redis         | localhost:6379               | —                                            |

### Database Setup

Prinodia Workspace uses PostgreSQL 17 as the primary database. The schema is managed by Prisma.

```bash
# Generate Prisma client (run after any schema change)
npm run db:generate

# Create and apply a new migration
npm run db:migrate

# Seed roles and permissions
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset the database (⚠️ destroys all data)
npm run db:reset
```

## Production Deployment (Docker)

v0.6.3 ships multi-stage Dockerfiles for both `apps/api` and `apps/web`, plus a production-grade
`docker-compose.prod.yml`.

```bash
# Copy and fill in production secrets
cp .env.example .env.prod
# Edit .env.prod — all ${VAR:?VAR required} vars must be set

# Build and start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Run migrations against the production DB
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

Services started by `docker-compose.prod.yml`:

| Service    | Port            | Notes                                               |
| ---------- | --------------- | --------------------------------------------------- |
| `api`      | 4000            | NestJS — non-root `govsphere` user, dumb-init PID 1 |
| `web`      | 3000            | Next.js standalone output                           |
| `postgres` | 5432 (internal) | Named volume, healthcheck                           |
| `redis`    | 6379 (internal) | 512 MB maxmemory, allkeys-lru eviction              |
| `minio`    | 9000 (internal) | S3-compatible object storage                        |

All services run on the internal `govsphere_prod_network`; only `api` and `web` should be exposed
via a reverse proxy (nginx/Caddy).

## Running the Project

```bash
# Development (all apps hot-reload)
npm run dev

# Build all apps
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Type-check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

## Available Scripts

```bash
npm run dev           # Start all apps in development mode
npm run build         # Build all apps for production
npm run start         # Start all apps in production mode
npm run test          # Run all test suites
npm run test:cov      # Run tests with coverage report
npm run lint          # Lint all packages
npm run lint:fix      # Lint and auto-fix
npm run type-check    # TypeScript type checking (no emit)
npm run format        # Format with Prettier
npm run format:check  # Check formatting without writing
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run pending migrations
npm run db:seed       # Seed database with initial data
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database (destroys all data)
npm run docker:up     # Start local infrastructure services
npm run docker:down   # Stop infrastructure services
npm run docker:logs   # Follow service logs
npm run docker:reset  # Destroy volumes and restart services
```

## Testing

Prinodia Workspace targets the following coverage thresholds:

| Metric     | Target |
| ---------- | ------ |
| Branches   | 80%    |
| Functions  | 85%    |
| Lines      | 85%    |
| Statements | 85%    |

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

Test files are co-located with their source files (`*.spec.ts`).

## Authentication

Prinodia Workspace uses two authentication methods:

**Government employees** log in with:

- Matricule number (format: `1.641.558` — the DRC's government employee identifier)
- Government email address + password

**External partners** (future):

- Google or Microsoft OAuth — invitation-only, `GUEST` role only, cannot escalate

**Token architecture:**

- Access token: RS256 JWT, 15-minute TTL, stored in memory (never `localStorage`)
- Refresh token: RS256 JWT, 7-day TTL, `HttpOnly SameSite=Strict Secure` cookie

## User Roles

| Role               | Weight | Description                           |
| ------------------ | ------ | ------------------------------------- |
| `SUPER_ADMIN`      | 100    | Full system access — DRC IT authority |
| `GOVERNMENT_ADMIN` | 90     | Cross-ministry administration         |
| `MINISTRY_ADMIN`   | 70     | Manages one ministry                  |
| `DEPARTMENT_ADMIN` | 50     | Manages one department                |
| `DIVISION_ADMIN`   | 40     | Manages one division                  |
| `TEAM_MANAGER`     | 30     | Manages a team                        |
| `EMPLOYEE`         | 10     | Standard government worker            |
| `GUEST`            | 0      | External partner (invitation-only)    |

Roles are weight-based. You can only assign roles with a weight strictly lower than your own.

## Supported Languages

| Code  | Language  | Region                                     |
| ----- | --------- | ------------------------------------------ |
| `fr`  | Français  | Default — official administrative language |
| `en`  | English   | International communications               |
| `ln`  | Lingala   | Kinshasa and western DRC                   |
| `sw`  | Kiswahili | Eastern DRC                                |
| `lua` | Tshiluba  | Kasai region                               |

## Documentation

Full engineering documentation is in [`docs/`](./docs/):

| Document                                                              | Description                                |
| --------------------------------------------------------------------- | ------------------------------------------ |
| [01 — Product Vision](./docs/01_Product_Vision.md)                    | Mission, goals, stakeholders               |
| [02 — Product Requirements](./docs/02_Product_Requirements.md)        | Functional and non-functional requirements |
| [03 — System Architecture](./docs/03_System_Architecture.md)          | High-level system design                   |
| [04 — Database Architecture](./docs/04_Database_Architecture.md)      | Schema design, entity relationships        |
| [05 — API Architecture](./docs/05_API_Architecture.md)                | REST API design, versioning, conventions   |
| [06 — UI Design System](./docs/06_UI_Design_System.md)                | Component library, design tokens           |
| [07 — Security Architecture](./docs/07_Security_Architecture.md)      | Auth, RBAC, encryption, audit              |
| [08 — Engineering Standards](./docs/08_Engineering_Standards.md)      | Code conventions, PR process, DoD          |
| [09 — DevOps Architecture](./docs/09_DevOps_Architecture.md)          | CI/CD, Docker, Terraform, observability    |
| [10 — Roadmap](./docs/10_Roadmap.md)                                  | Sprint plan, milestones, version targets   |
| [11 — Identity Platform](./docs/11_Identity_Platform_Architecture.md) | Identity service deep-dive                 |
| [ADRs](./docs/adr/)                                                   | Architecture Decision Records              |

## Roadmap

| Version | Focus                                             | Status      |
| ------- | ------------------------------------------------- | ----------- |
| v0.1.0  | Foundation — monorepo, tooling, Identity Platform | ✅ Complete |
| v0.5.0  | Design System & UI Polish                         | ✅ Complete |
| v0.6.0  | Employee Lifecycle & Invitation Flow              | ✅ Complete |
| v0.6.1  | Workforce Management & Org Chart                  | ✅ Complete |
| v0.6.2  | Security Operations Center                        | ✅ Complete |
| v0.6.3  | Production Hardening (Redis, Queues, Docker, CSP) | ✅ Complete |
| v0.7.0  | Channels & Messaging (Socket.IO)                  | 🔜 Next     |
| v0.8.0  | File Management (MinIO)                           | Planned     |
| v1.0.0  | Production Release                                | Planned     |

See [10_Roadmap.md](./docs/10_Roadmap.md) for the complete roadmap.

## Contributing

Prinodia Workspace is an internal government platform. All contributors must:

1. Be a verified government employee or authorized partner
2. Follow the [Engineering Standards](./docs/08_Engineering_Standards.md)
3. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before your first PR
4. Pass all CI checks before requesting review

**Core rules:**

- Never store files in PostgreSQL — always use MinIO
- Never commit secrets or credentials
- Write audit logs for all sensitive operations
- All UI strings must use i18n keys (no hardcoded text)
- Every PR must include tests for new behavior

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution guide.

## Security

Security vulnerabilities must be reported privately. See [SECURITY.md](./SECURITY.md) for the
responsible disclosure policy.

**Security highlights:**

- Zero Trust architecture — every request is authenticated and authorized
- RS256 asymmetric JWT — private key never leaves the API server
- AES-256-GCM encryption for all TOTP secrets at rest
- Immutable audit logs — DB user has `INSERT + SELECT` only (no `UPDATE`/`DELETE`)
- bcrypt cost 12 for passwords
- Account lockout at 5 failed attempts (soft) and 10 (hard lock, admin unlock required)

## License

Proprietary — Government of the Democratic Republic of Congo.

All rights reserved. Unauthorized use, reproduction, or distribution is prohibited.

---

<div align="center">
Built for the DRC government by the Prinodia Workspace Engineering Team
</div>
