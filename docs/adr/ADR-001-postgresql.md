# ADR-001 — Use PostgreSQL 17 as the Primary Database

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team

---

## Context

GovSphere requires a primary database to store structured government data: users, organizational
hierarchy (ministries, departments, divisions), messages, channels, files metadata, audit logs, and
RBAC role assignments.

The database must support:

- ACID transactions (critical for financial and administrative data)
- Strong relational integrity (foreign keys enforced at DB level)
- Complex queries across the organizational hierarchy
- Full-text search for message and document search
- Row-level security for potential future multi-tenancy
- Long-term data retention with point-in-time recovery
- JSON columns for flexible metadata storage
- Deployment within DRC sovereign infrastructure (on-premise or regional cloud)

## Decision

We will use **PostgreSQL 17** as the single primary relational database.

All structured application data is stored in PostgreSQL. File content (binary data) is never stored
in PostgreSQL — it goes to MinIO (see ADR-007).

## Alternatives Considered

**MySQL 8:**

- Rejected. Weaker support for advanced SQL features (window functions, CTEs, full-text search).
  Less capable JSON support. No row-level security. The DRC government IT standard references
  PostgreSQL as the preferred RDBMS.

**MongoDB:**

- Rejected. No relational integrity. No foreign keys. ACID at the document level only (not
  multi-document). Schema-less design conflicts with the strict, auditable data model required for
  government use. Cannot enforce referential integrity between organizational units and user
  assignments.

**SQLite:**

- Rejected. Not suitable for multi-process, multi-instance production deployments.

**AWS Aurora PostgreSQL:**

- Considered for production. Aurora PostgreSQL is wire-compatible with PostgreSQL. We develop on
  vanilla PostgreSQL 17 and may migrate to Aurora in the cloud deployment phase (Phase 9). This
  decision does not preclude that migration.

## Consequences

**Positive:**

- Full ACID compliance with multi-row, multi-table transactions
- Native support for `UUID`, `JSONB`, `ENUM`, `CHECK` constraints, and `GENERATED` columns
- Row-level security available if multi-tenant isolation tightens
- pg_audit extension for database-level audit logging
- Point-in-time recovery and WAL streaming for DR
- Mature ecosystem: excellent Prisma support, pgAdmin, pg_dump, Prometheus exporter
- Open source; no licensing cost; meets DRC data sovereignty requirements

**Negative:**

- Requires PostgreSQL administration expertise for production operations
- Schema changes require careful migration management (Prisma handles this)
- Vertical scaling limit — horizontal sharding would require significant rearchitecting (not needed
  at projected government scale)

## Enforcement

- Prisma schema `datasource` must specify `provider = "postgresql"`
- No MongoDB driver or `mongoose` may be added to any package
- File content (binary blobs) must never be stored in any PostgreSQL table
- This rule is documented in all onboarding materials and the PR checklist
