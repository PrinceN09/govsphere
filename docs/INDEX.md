# GovSphere — Documentation Index

This directory contains all engineering, architecture, and operational documentation for the
GovSphere platform.

## Core Engineering Documents

| #   | Document                                                                 | Description                                            | Audience              |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------- |
| 01  | [Product Vision](./01_Product_Vision.md)                                 | Mission, goals, target users, success criteria         | All                   |
| 02  | [Product Requirements](./02_Product_Requirements.md)                     | Functional and non-functional requirements             | Engineering, Product  |
| 03  | [System Architecture](./03_System_Architecture.md)                       | High-level system design, component diagram, data flow | Engineering           |
| 04  | [Database Architecture](./04_Database_Architecture.md)                   | Schema design, entity relationships, indexing strategy | Engineering, DBA      |
| 05  | [API Architecture](./05_API_Architecture.md)                             | REST API design, versioning, pagination, error format  | Engineering           |
| 06  | [UI Design System](./06_UI_Design_System.md)                             | Component library, design tokens, accessibility        | Frontend              |
| 07  | [Security Architecture](./07_Security_Architecture.md)                   | Auth, RBAC, encryption, audit, threat model            | Engineering, Security |
| 08  | [Engineering Standards](./08_Engineering_Standards.md)                   | Code conventions, PR process, Definition of Done       | Engineering           |
| 09  | [DevOps Architecture](./09_DevOps_Architecture.md)                       | CI/CD, Docker, Terraform, observability                | DevOps, Engineering   |
| 10  | [Roadmap](./10_Roadmap.md)                                               | Sprint plan, milestones, version targets               | All                   |
| 11  | [Identity Platform Architecture](./11_Identity_Platform_Architecture.md) | Identity service deep-dive design document             | Engineering, Security |

## Architecture Decision Records

ADRs document significant technology choices. Each record explains the context, the decision made,
alternatives considered, and consequences.

| ADR                                        | Title                                       | Status   | Date    |
| ------------------------------------------ | ------------------------------------------- | -------- | ------- |
| [ADR-001](./adr/ADR-001-postgresql.md)     | Use PostgreSQL 17 as the primary database   | Accepted | 2026-06 |
| [ADR-002](./adr/ADR-002-prisma.md)         | Use Prisma 5 as the ORM                     | Accepted | 2026-06 |
| [ADR-003](./adr/ADR-003-nestjs.md)         | Use NestJS 10 for the API layer             | Accepted | 2026-06 |
| [ADR-004](./adr/ADR-004-nextjs.md)         | Use Next.js 15 for the web application      | Accepted | 2026-06 |
| [ADR-005](./adr/ADR-005-tauri.md)          | Use Tauri 2 for the desktop application     | Accepted | 2026-06 |
| [ADR-006](./adr/ADR-006-react-native.md)   | Use React Native for the mobile application | Accepted | 2026-06 |
| [ADR-007](./adr/ADR-007-minio.md)          | Use MinIO for file storage                  | Accepted | 2026-06 |
| [ADR-008](./adr/ADR-008-socketio.md)       | Use Socket.IO for real-time communication   | Accepted | 2026-06 |
| [ADR-009](./adr/ADR-009-matricule-auth.md) | Authenticate with Matricule Number          | Accepted | 2026-06 |
| [ADR-010](./adr/ADR-010-multilanguage.md)  | Support 5 national languages                | Accepted | 2026-06 |

## Supplementary Documents

| Document                                       | Description                  |
| ---------------------------------------------- | ---------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)           | Quick architecture reference |
| [ENGINEERING_TASKS.md](./ENGINEERING_TASKS.md) | Backlog and task tracking    |

## How to Use This Documentation

**New to GovSphere?** Start with [01 — Product Vision](./01_Product_Vision.md) and
[03 — System Architecture](./03_System_Architecture.md).

**Setting up locally?** See the [README](../README.md#local-development) at the repository root.

**Working on auth or security?** Read [07 — Security Architecture](./07_Security_Architecture.md)
and [11 — Identity Platform](./11_Identity_Platform_Architecture.md) first.

**Adding a new feature?** Check [08 — Engineering Standards](./08_Engineering_Standards.md) for code
conventions and [05 — API Architecture](./05_API_Architecture.md) for endpoint design patterns.

**Making a major technology decision?** Create an ADR in `docs/adr/`. Use the
[ADR-001 template](./adr/ADR-001-postgresql.md) as a reference.

## Document Conventions

- All headings use sentence case (not Title Case for body headings)
- Code samples use fenced code blocks with language identifiers
- Tables are used for structured comparisons and reference data
- Status badges: ✅ Complete, 🔜 In Progress, 📋 Planned, ❌ Deprecated

## Keeping Documentation Current

Documentation is updated alongside code. If a PR changes behavior described in a document, the
document must be updated in the same PR. Stale documentation is treated as a bug.
