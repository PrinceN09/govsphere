# Prinodia Workspace — System Architecture

**Document Version:** 1.0  
**Status:** Approved  
**Classification:** Internal Engineering  
**Last Updated:** 2026-06-24

---

## 1. Architecture Overview

Prinodia Workspace follows a **layered, service-oriented monorepo architecture** designed for high
availability, horizontal scalability, and security. The system is built as a single Turborepo
monorepo containing multiple apps and shared packages, deployable as independently scalable services
in production via Docker/Kubernetes.

The architecture is designed to be:

- **Deployable today** on a single server with Docker Compose (development and early production)
- **Scalable tomorrow** to a full Kubernetes cluster with microservices (production at scale)
- **Sovereign always** — no external cloud services required; runs entirely on government
  infrastructure

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                        │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Web App    │    │ Desktop App  │    │  Mobile App  │                  │
│  │  (Next.js)   │    │   (Tauri)    │    │(React Native)│                  │
│  │  Port 3000   │    │  Win/macOS   │    │ Android/iOS  │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
└─────────┼────────────────────┼────────────────────┼────────────────────────┘
          │                    │                    │
          │         HTTPS / WSS (TLS 1.3)           │
          │                    │                    │
┌─────────▼────────────────────▼────────────────────▼────────────────────────┐
│                         GATEWAY LAYER                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    NGINX Reverse Proxy                                │  │
│  │   • TLS Termination    • Rate Limiting    • Request Routing           │  │
│  │   • Static Assets      • WebSocket Proxy  • Security Headers         │  │
│  └──────────────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼──────┐    ┌───────────▼────────┐   ┌────────▼──────────┐
│   REST API     │    │  WebSocket Server  │   │   Next.js SSR     │
│  (NestJS)      │    │  (Socket.IO)       │   │   (Next.js)       │
│  Port 4000     │    │  Port 4000         │   │   Port 3000       │
└─────────┬──────┘    └───────────┬────────┘   └───────────────────┘
          │                       │
┌─────────▼───────────────────────▼──────────────────────────────────────────┐
│                       APPLICATION LAYER (NestJS)                             │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │  Users   │  │ Channels │  │Messages  │  │  Files   │   │
│  │ Module   │  │ Module   │  │ Module   │  │ Module   │  │ Module   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Search  │  │ Notific. │  │  Audit   │  │  Admin   │  │   Org    │   │
│  │ Module   │  │ Module   │  │ Module   │  │ Module   │  │ Module   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                       │                       │
┌─────────▼──────┐    ┌───────────▼────────┐   ┌────────▼──────────┐
│  DATA LAYER    │    │   CACHE LAYER      │   │  QUEUE LAYER      │
│                │    │                   │   │                    │
│  PostgreSQL    │    │      Redis         │   │     BullMQ        │
│  (Primary DB)  │    │  • Sessions        │   │  • File scanning  │
│                │    │  • Rate limiting   │   │  • Notifications  │
│  Read Replica  │    │  • Pub/Sub         │   │  • Email sending  │
│  (Scale out)   │    │  • Presence        │   │  • Search index   │
│                │    │  • WS adapter      │   │  • Thumbnails     │
└─────────┬──────┘    └───────────┬────────┘   └────────┬──────────┘
          │                       │                       │
┌─────────▼───────────────────────▼───────────────────────▼──────────────────┐
│                      STORAGE & SEARCH LAYER                                  │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────────────┐  │
│  │     MinIO       │    │   OpenSearch    │    │      MailHog / SMTP    │  │
│  │  Object Storage │    │  Full-text idx  │    │     Email delivery     │  │
│  │  • Files        │    │  • Messages     │    │                        │  │
│  │  • Avatars      │    │  • Files        │    │                        │  │
│  │  • Documents    │    │  • Users        │    │                        │  │
│  └─────────────────┘    └─────────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY LAYER                                     │
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  Prometheus │    │   Grafana    │    │    Loki      │                  │
│  │   Metrics   │    │  Dashboards  │    │   Log Agg.   │                  │
│  └─────────────┘    └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Client Layer

### 3.1 Web Application (Next.js 15)

**Technology:** Next.js 15 with App Router  
**Rendering Strategy:** Hybrid — Server-Side Rendering (SSR) for initial load, Client-Side Rendering
(CSR) for real-time messaging

**Why Next.js:**

- App Router enables server components for fast initial renders without JavaScript
- Built-in image optimization reduces bandwidth for low-connectivity users
- File-based routing simplifies code organization
- API routes enable BFF (Backend for Frontend) pattern for auth flows
- First-class TypeScript and Tailwind support
- Active, enterprise-grade ecosystem

**Key Responsibilities:**

- Authentication flows (login, MFA, password reset)
- Channel and message rendering
- File upload and preview
- Real-time updates via Socket.IO client
- Progressive Web App capabilities (offline caching via Service Worker)
- Internationalization via `next-intl`

### 3.2 Desktop Application (Tauri)

**Technology:** Tauri 2.x (Rust backend + Next.js/React frontend)  
**Platforms:** Windows 10/11, macOS 12+

**Why Tauri over Electron:**

- Binary size: ~5MB vs 150MB for Electron — critical for government machines with limited disk space
- Memory usage: ~30MB vs 150MB+ for Electron — more efficient on older government hardware
- Security: Rust backend is memory-safe; no Node.js process exposed to the web layer
- Uses the OS native WebView (WebView2 on Windows, WKWebView on macOS) — always up-to-date
- Built-in updater for silent background updates

**Key Responsibilities:**

- All web app features, embedded in native shell
- Native push notifications (OS notification system)
- System tray presence indicator
- Background sync when minimized
- File system access for drag-and-drop uploads
- Biometric authentication integration (Windows Hello, macOS Touch ID) — future

### 3.3 Mobile Application (React Native)

**Technology:** React Native 0.73+ with Expo  
**Platforms:** Android 9+, iOS 15+

**Why React Native:**

- Maximum code sharing with the web codebase (shared types, API client, business logic)
- Strong Android support — critical for the DRC where Android dominates
- Expo simplifies build pipeline and OTA updates
- Mature ecosystem for government-grade apps (Intune integration, MDM support)
- React Native New Architecture (Fabric + JSI) provides near-native performance

**Key Responsibilities:**

- All core messaging features
- Offline message queue with SQLite local storage
- Push notifications (FCM for Android, APNs for iOS)
- Biometric authentication (fingerprint, face ID)
- Camera integration for document scanning and profile photos
- Background sync

---

## 4. Gateway Layer

### 4.1 NGINX Reverse Proxy

**Role:** Single entry point for all traffic

```
Client → NGINX → Next.js (port 3000)
              → NestJS API (port 4000)
              → WebSocket (port 4000/ws)
              → MinIO Console (port 9001) [internal only]
```

**Configuration:**

- TLS 1.3 termination with HSTS
- HTTP/2 for multiplexed connections
- WebSocket upgrade proxying
- Gzip/Brotli compression
- Static asset caching headers
- Rate limiting by IP and by user token
- Security headers (CSP, X-Frame-Options, etc.)
- Request size limits for file uploads

---

## 5. Application Layer (NestJS)

### 5.1 Module Structure

```
apps/api/src/
├── app.module.ts               ← Root module
├── modules/
│   ├── auth/                   ← Authentication, JWT, sessions
│   ├── users/                  ← User CRUD, profile, presence
│   ├── organizations/          ← Ministry/Department/Division management
│   ├── channels/               ← Channel CRUD and membership
│   ├── messages/               ← Message CRUD, reactions, threads
│   ├── files/                  ← Upload, download, virus scan
│   ├── search/                 ← OpenSearch integration
│   ├── notifications/          ← Push, in-app, email notifications
│   ├── audit/                  ← Audit log writes and queries
│   └── admin/                  ← System administration
├── common/
│   ├── guards/                 ← Auth guards, role guards
│   ├── decorators/             ← @CurrentUser, @Roles
│   ├── interceptors/           ← Logging, transform, timeout
│   ├── filters/                ← Global exception filter
│   └── pipes/                  ← Validation pipe
├── config/                     ← ConfigModule setup
├── database/                   ← Prisma service
├── redis/                      ← Redis service
└── websocket/                  ← Socket.IO gateway
```

### 5.2 NestJS Technology Choices

- **Dependency Injection** — NestJS's DI container enables clean, testable modules
- **Guards** — `JwtAuthGuard` and `RolesGuard` are applied at controller level
- **Interceptors** — Request logging, response transformation, timeout enforcement
- **Pipes** — `ValidationPipe` with `class-validator` for all incoming DTOs
- **Exception Filters** — Standardized error responses across all endpoints
- **ConfigModule** — Zod-validated environment variables via `@prinodia/config`

---

## 6. Real-Time Layer (Socket.IO)

### 6.1 Architecture

```
Client ─── WebSocket ──→ Socket.IO Gateway (NestJS)
                              │
                        Redis Adapter
                    (pub/sub across instances)
                              │
                    ┌─────────┴──────────┐
                    │                    │
               Instance 1          Instance 2
               (Room management)   (Room management)
```

### 6.2 Room Strategy

| Room Type      | Room Name Pattern        | Members                      |
| -------------- | ------------------------ | ---------------------------- |
| Channel        | `channel:{channelId}`    | Channel members              |
| Direct Message | `dm:{userId1}:{userId2}` | Two users (sorted IDs)       |
| Group DM       | `gdm:{groupId}`          | Group members                |
| User Presence  | `presence:{userId}`      | All users tracking this user |
| Ministry       | `ministry:{ministryId}`  | Ministry admins only         |

### 6.3 Events

**Server → Client:**

- `message:new` — new message received
- `message:updated` — message edited
- `message:deleted` — message deleted
- `channel:member_joined` — user joined channel
- `channel:member_left` — user left channel
- `user:presence_changed` — user status changed
- `notification:new` — new notification
- `typing:start` / `typing:stop` — typing indicators

**Client → Server:**

- `message:send` — send a message
- `typing:start` / `typing:stop` — typing status
- `channel:join` — join a channel room
- `channel:leave` — leave a channel room
- `presence:update` — update user presence

---

## 7. Data Layer

### 7.1 PostgreSQL (Primary Database)

**Version:** PostgreSQL 17  
**ORM:** Prisma 5

**Why PostgreSQL:**

- ACID compliance for financial-grade data integrity
- Row-level security for future multi-tenant isolation
- Native full-text search with `tsvector` (pre-OpenSearch)
- JSONB for flexible metadata without schema migrations
- Excellent Prisma support with type-safe queries
- UUID support natively
- Extensions: `uuid-ossp`, `pg_trgm` (fuzzy search), `unaccent` (accent-insensitive search)

**Scaling Strategy:**

- Phase 1: Single primary with nightly backups
- Phase 2: Primary + read replica (reporting and search)
- Phase 3: PgBouncer connection pooling
- Phase 4: Citus extension for horizontal sharding (if needed at scale)

### 7.2 Redis

**Version:** Redis 7+  
**Client:** `ioredis`

**Use Cases:**

| Use Case               | Key Pattern                           | TTL                   |
| ---------------------- | ------------------------------------- | --------------------- |
| Access token blacklist | `blacklist:{jti}`                     | Token expiry          |
| Refresh token store    | `refresh:{userId}:{tokenId}`          | 7 days                |
| Rate limiting          | `ratelimit:{ip}:{endpoint}`           | 15 minutes            |
| Session data           | `session:{sessionId}`                 | 30 days               |
| User presence          | `presence:{userId}`                   | 5 minutes (heartbeat) |
| Typing indicators      | `typing:{channelId}:{userId}`         | 5 seconds             |
| Socket.IO adapter      | Internal — managed by socket.io-redis | N/A                   |
| BullMQ job queues      | Managed by BullMQ                     | N/A                   |

---

## 8. Storage Layer

### 8.1 MinIO (Object Storage)

**Buckets:**

| Bucket                | Purpose                     | Access                   |
| --------------------- | --------------------------- | ------------------------ |
| `govsphere-files`     | Channel file attachments    | Private, pre-signed URLs |
| `govsphere-avatars`   | User profile photos         | Private, pre-signed URLs |
| `govsphere-documents` | Ministry official documents | Private, pre-signed URLs |

**Upload Flow:**

```
Client ──→ API: Request pre-signed upload URL
API    ──→ MinIO: Generate pre-signed PUT URL (15-minute expiry)
API    ──→ Client: Return pre-signed URL + fileId
Client ──→ MinIO: PUT file directly (bypasses API)
Client ──→ API: Confirm upload complete (with fileId)
API    ──→ Queue: Trigger virus scan job
API    ──→ DB: Save file metadata (marked as PENDING)
Queue  ──→ ClamAV: Scan file
Queue  ──→ DB: Update file status (READY or REJECTED)
```

**Why pre-signed URLs:** Large file uploads bypass the API server entirely, eliminating API as a
bottleneck and reducing server load.

### 8.2 OpenSearch (Full-Text Search)

**Indexes:**

| Index                | Documents                      | Updated              |
| -------------------- | ------------------------------ | -------------------- |
| `govsphere_messages` | All messages                   | Real-time via BullMQ |
| `govsphere_files`    | File metadata + extracted text | On upload confirmed  |
| `govsphere_users`    | User profiles                  | On profile update    |
| `govsphere_channels` | Channel names/descriptions     | On channel update    |

**Search Pipeline:**

```
User types query
      │
Next.js → POST /api/v1/search?q=...
      │
NestJS SearchModule
      │
OpenSearch query (with access control filter)
      │
Return ranked results
```

---

## 9. Background Jobs (BullMQ)

**Queues:**

| Queue             | Jobs                                              | Workers       |
| ----------------- | ------------------------------------------------- | ------------- |
| `file-processing` | Virus scan, thumbnail generation, text extraction | 2-4           |
| `notifications`   | Push notifications, email digests                 | 2-4           |
| `search-indexing` | Index messages, files, users to OpenSearch        | 2-4           |
| `audit`           | Async audit log writes                            | 1-2           |
| `cleanup`         | Expired sessions, soft-deleted file purge         | 1 (scheduled) |

**Why BullMQ:**

- Redis-backed, works with existing Redis infrastructure
- Built-in retry logic, backoff, and dead-letter queues
- Dashboard via Bull Board for monitoring
- TypeScript-first API
- Rate limiting per queue

---

## 10. Observability Layer

### 10.1 Logging

- **Structured logging:** `pino` (NestJS) — JSON output for machine parsing
- **Log aggregation:** Loki (Grafana stack)
- **Log levels:** error, warn, info, debug (configurable per environment)
- **Sensitive data:** Passwords, tokens, and PII are never logged

### 10.2 Metrics

- **Collection:** Prometheus via `@willsoto/nestjs-prometheus`
- **Visualization:** Grafana dashboards
- **Key metrics:**
  - HTTP request rate and latency (p50, p95, p99)
  - WebSocket connection count
  - Active user count
  - Queue depth and processing rate
  - Database query latency
  - File upload success/failure rate
  - Error rate by endpoint

### 10.3 Tracing

- **Future:** OpenTelemetry for distributed tracing across API and background jobs

### 10.4 Alerting

- **Grafana Alerting** for threshold-based alerts:
  - Error rate > 1% for 5 minutes
  - P99 latency > 2 seconds
  - Queue depth > 1000 for 10 minutes
  - Database connection pool exhaustion
  - Disk usage > 80%

---

## 11. Future Kubernetes Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                             │
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────────────────────┐   │
│  │   Ingress (NGINX)│   │      Cert-Manager (TLS)          │   │
│  └────────┬─────────┘   └──────────────────────────────────┘   │
│           │                                                      │
│  ┌────────▼───────────────────────────────────────────────────┐ │
│  │                    Services                                 │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │ │
│  │  │  web (x3)   │  │  api (x5)   │  │  workers (x4)   │   │ │
│  │  │  Next.js    │  │  NestJS     │  │  BullMQ         │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                StatefulSets / Managed Services              │ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │PostgreSQL│  │  Redis   │  │  MinIO   │  │OpenSearch│ │ │
│  │  │ Primary  │  │ Cluster  │  │ Cluster  │  │ Cluster  │ │ │
│  │  │+ Replica │  │          │  │          │  │          │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Horizontal Pod Autoscaler (HPA)                │ │
│  │  Scale web pods: CPU > 70% → add pods                     │ │
│  │  Scale api pods: CPU > 70% OR RPS > 1000 → add pods       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Technology Selection Summary

| Component      | Technology           | Alternatives Considered | Decision Rationale                                          |
| -------------- | -------------------- | ----------------------- | ----------------------------------------------------------- |
| Web framework  | Next.js 15           | Nuxt, SvelteKit, Remix  | Best SSR + React ecosystem, government-grade maturity       |
| API framework  | NestJS 10            | Express, Fastify, Hono  | DI container, decorators, modular structure for large teams |
| Desktop        | Tauri 2              | Electron                | 30x smaller binary, Rust security model, lower memory       |
| Mobile         | React Native + Expo  | Flutter, Ionic          | Max code reuse with web, Android-first strength             |
| Database       | PostgreSQL 17        | MySQL, MongoDB          | ACID, JSONB, full-text search, row-level security           |
| ORM            | Prisma 5             | TypeORM, Drizzle        | Type safety, migrations, schema-first design                |
| Cache          | Redis 7              | Memcached, Dragonfly    | Pub/Sub for WebSockets, BullMQ compatibility                |
| Object Storage | MinIO                | AWS S3, Azure Blob      | On-premise sovereign, S3-compatible API                     |
| Search         | OpenSearch           | Elasticsearch, pg_trgm  | Open source, powerful for documents, no license cost        |
| Queue          | BullMQ               | Bull, RabbitMQ, Kafka   | Redis-backed, TypeScript-first, proven at scale             |
| WebSockets     | Socket.IO            | WS, Ably                | Redis adapter for horizontal scaling, mobile support        |
| Container      | Docker + Compose     | Podman                  | Industry standard, team familiarity                         |
| Orchestration  | Kubernetes           | Docker Swarm            | Industry standard for production at scale                   |
| Reverse Proxy  | NGINX                | Traefik, Caddy          | Performance, stability, government-grade deployments        |
| Monitoring     | Prometheus + Grafana | Datadog, New Relic      | Self-hosted, sovereign, no external data transmission       |
| Language       | TypeScript 5         | JavaScript, Go          | Type safety across full stack, single language team         |
