# GovSphere — Architecture Overview

## System Design

```
Browser / Desktop / Mobile
        │
        ▼
   [Nginx / CDN]
        │
   ┌────┴────┐
   │  Next   │  apps/web  (Next.js 15, port 3000)
   │  .js    │
   └────┬────┘
        │ REST + WebSocket
        ▼
   ┌─────────┐
   │ NestJS  │  apps/api  (NestJS, port 4000)
   │   API   │
   └────┬────┘
        │
   ┌────┼────────────────────────────┐
   │    │                            │
   ▼    ▼                            ▼
[PostgreSQL]  [Redis]           [MinIO]
 Relational   Cache + Queues    File Storage
 Database     (BullMQ)         (S3-compatible)
```

## Data Flow

### File Upload

1. User selects file in the web app
2. Web app calls `POST /api/v1/files/upload` (multipart)
3. API validates file type, size, and user permissions
4. API streams file to MinIO bucket (NOT to PostgreSQL)
5. API stores only file metadata (name, size, storageKey, bucketName) in PostgreSQL
6. API returns file metadata to web app
7. Audit log recorded

### Message Send

1. User types message in composer
2. Web app sends via Socket.IO `message:send` event
3. API gateway validates, saves to PostgreSQL
4. API broadcasts via Socket.IO to channel members
5. Offline members receive push notification (BullMQ job)
6. Audit log recorded for sensitive channels

## Security Architecture

### Authentication Flow

1. User submits matricule/email + password
2. API validates credentials against PostgreSQL (bcrypt)
3. API issues short-lived JWT access token (15 min)
4. API issues long-lived refresh token (7 days, stored in DB)
5. All subsequent requests carry Authorization: Bearer <token>
6. Token rotation on refresh

### RBAC

Permission checks happen at three layers:

1. NestJS Guards (role check on controller)
2. Service layer (ministry/department scope check)
3. Database queries (always scoped to user's ministry)

## Key Constraints

- No MongoDB — PostgreSQL only
- No files in PostgreSQL — MinIO only
- All UI text must use i18n keys
- All sensitive actions must be audit-logged
- No public access to internal files
