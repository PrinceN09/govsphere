# ADR-003 — Use NestJS 10 for the API Layer

**Status:** Accepted **Date:** 2026-06 **Deciders:** Prinodia Workspace Engineering Team

---

## Context

Prinodia Workspace requires a backend API that:

- Serves a REST API to web, desktop, and mobile clients
- Handles WebSocket connections for real-time messaging and presence
- Enforces RBAC at the framework level (guards, decorators)
- Integrates cleanly with Prisma, Redis, BullMQ, Socket.IO
- Supports a modular, Domain-Driven Design structure
- Is well-documented and has a large community for long-term support

## Decision

We will use **NestJS 10** as the API framework.

The API follows a Domain-Driven Design module structure: each feature domain (identity, channels,
messages, files, etc.) is encapsulated in its own NestJS module.

## Alternatives Considered

**Express.js (raw):**

- Rejected. No structure, no dependency injection, no guard/interceptor pattern. Would require
  building all of these from scratch, creating significant maintenance burden for a rotating
  government engineering team.

**Fastify (with manual structure):**

- Rejected for same reasons as Express. Fastify is fast but unstructured at the application level.

**Hapi.js:**

- Rejected. Smaller community, less ecosystem integration with the TypeScript tooling we require.

**tRPC:**

- Considered for internal client-server calls. Rejected as the primary API because it requires tRPC
  on all clients. Our mobile and desktop clients may interact with the API from different runtimes.
  A standard REST API with OpenAPI (Swagger) is more interoperable.

## Consequences

**Positive:**

- Decorator-based module system maps cleanly to DDD bounded contexts
- Built-in guards (`@UseGuards`), interceptors, filters, and pipes enforce cross-cutting concerns
  consistently
- `@nestjs/passport` and `@nestjs/jwt` provide clean JWT/RS256 integration
- `@nestjs/terminus` provides standard health check endpoints
- `@nestjs/swagger` auto-generates OpenAPI spec from decorators
- `@nestjs/throttler` provides rate limiting with minimal config
- `@nestjs/schedule` for background jobs
- `@nestjs/websockets` and `@nestjs/platform-socket.io` for real-time
- Strong community; long-term support is well-established

**Negative:**

- Higher initial complexity than Express for simple endpoints
- Decorator-heavy code can be verbose
- Circular dependencies require `forwardRef()` in some module configurations (documented where used)

## Module Structure

```
identity/         ← auth, users, roles, permissions, sessions, mfa, audit
channels/         ← Sprint 2
messages/         ← Sprint 2
files/            ← Sprint 3
notifications/    ← Sprint 4
```

Each module exports only what other modules need to import. No direct cross-domain service calls
without an explicit export.
