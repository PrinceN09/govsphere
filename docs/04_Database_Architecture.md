# Prinodia Workspace — Database Architecture

**Document Version:** 1.0  
**Status:** Approved  
**Classification:** Internal Engineering  
**Last Updated:** 2026-06-24

---

## 1. Overview

Prinodia Workspace uses **PostgreSQL 17** as its primary relational database, managed through **Prisma 5** as
the ORM. The database is designed to be the authoritative source of truth for all government
collaboration data.

**Core Principles:**

- Files are NEVER stored in the database — only metadata. Files live in MinIO.
- Soft deletes are mandatory for all user-generated content (audit requirements).
- Every model has `createdAt` and `updatedAt` timestamps.
- CUID2 is used for primary keys (URL-safe, collision-resistant, no information leakage).
- Translations for government entity names are stored as JSONB columns.
- All FK relationships use `onDelete: Cascade` or `onDelete: Restrict` deliberately.

---

## 2. Current Schema Review

The current Prisma schema (migration `20260624013743_init`) contains 13 models and 8 enums.

### 2.1 What Is Correct

**Government hierarchy modelling** — The `Ministry → Department → Division → User` chain correctly
represents the DRC administrative structure with proper FK relations and indexes.

**RBAC enum** — `UserRole` with 8 levels (SUPER_ADMIN → GUEST) correctly represents the permission
hierarchy defined in the product requirements.

**Matricule support** — `User.matriculeNumber` as an optional unique string correctly handles both
government employees (with matricule) and external partners (without matricule).

**Soft deletes** — `User.deletedAt`, `Message.deletedAt`, `File.deletedAt` are present for the three
most critical models.

**Audit logging** — `AuditLog` model with 16 action types, IP address, and user agent captures the
minimum audit surface.

**File metadata design** — `File` model stores `storageKey`, `bucketName`, `mimeType`, `size`,
`checksum` — never binary content. Correct.

**Index coverage** — All FK fields have `@@index` declarations. High-frequency query fields are
indexed.

### 2.2 Issues to Address in Future Migrations

| Issue                                           | Severity | Resolution                                   |
| ----------------------------------------------- | -------- | -------------------------------------------- |
| Missing `Province` model                        | High     | Add Province between Government and Ministry |
| Missing `Team` model                            | High     | Add Team between Division and User           |
| `Reaction.userId` is a bare string              | Medium   | Add User relation for query efficiency       |
| `PinnedMessage.pinnedById` is a bare string     | Medium   | Add User relation                            |
| `Channel.createdById` is a bare string          | Medium   | Add User relation                            |
| No `UserSession` model                          | High     | Add for device/session management            |
| No `UserDevice` model                           | High     | Add for push notification token storage      |
| No `Meeting` model                              | Low      | Add in v1.5                                  |
| No `Task` model                                 | Low      | Add in v1.5                                  |
| Missing `deletedAt` on `Channel`                | Medium   | Add for soft delete                          |
| No `MessageEdit` history table                  | Medium   | Add to track edit history                    |
| No `FileVersion` table                          | Low      | Add for document versioning                  |
| `AuditLog.userId` is nullable                   | Low      | Consider separate AnonymousAuditLog          |
| No composite unique on `User(email, deletedAt)` | Medium   | Required for reuse after soft delete         |

---

## 3. Complete Target Database Design

The following represents the full database design that Prinodia Workspace will grow into across migrations.
**This is a blueprint — not a single migration.**

### 3.1 Entity Relationship Overview

```
Government (platform singleton)
    │
    ├── Province (26 provinces of DRC)
    │       │
    │       └── Ministry (Ministry per province + federal ministries)
    │               │
    │               ├── Department
    │               │       │
    │               │       └── Division
    │               │               │
    │               │               └── Team
    │               │                     │
    │               │                     └── User
    │               │
    │               └── Channel (ministry-wide)
    │
    └── User ──→ UserSession ──→ UserDevice
              └──→ Message ──→ Reaction
              └──→ File
              └──→ Notification
              └──→ AuditLog
              └──→ Task
              └──→ MeetingParticipant
```

---

## 4. Full Schema Blueprint

### 4.1 Identity & Organizational Models

```prisma
// ─── GOVERNMENT ──────────────────────────────────────────────────────────────
// Singleton — one per deployment. Represents the DRC government.
model Government {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(255)
  countryCode String   @db.VarChar(10)  // "CD"
  logoUrl     String?  @db.VarChar(500)
  isActive    Boolean  @default(true)
  provinces   Province[]
  ministries  Ministry[]  // Federal-level ministries
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("governments")
}

// ─── PROVINCE ────────────────────────────────────────────────────────────────
// 26 provinces of the DRC (Kinshasa, Katanga, Kasaï, Maniema, etc.)
model Province {
  id               String     @id @default(cuid())
  governmentId     String
  government       Government @relation(fields: [governmentId], references: [id])
  name             String     @db.VarChar(255)
  nameTranslations Json       @default("{}")
  code             String     @unique @db.VarChar(20)  // "KIN", "KAT", etc.
  capital          String?    @db.VarChar(100)
  isActive         Boolean    @default(true)
  ministries       Ministry[]
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  @@index([code])
  @@map("provinces")
}

// ─── TEAM ────────────────────────────────────────────────────────────────────
// Granular unit within a Division — the actual working team
model Team {
  id               String   @id @default(cuid())
  divisionId       String
  division         Division @relation(fields: [divisionId], references: [id])
  name             String   @db.VarChar(255)
  code             String   @db.VarChar(50)
  description      String?  @db.Text
  isActive         Boolean  @default(true)
  users            User[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([divisionId, code])
  @@index([divisionId])
  @@map("teams")
}
```

### 4.2 Enhanced User Models

```prisma
// ─── USER (Enhanced) ─────────────────────────────────────────────────────────
model User {
  id                String             @id @default(cuid())
  matriculeNumber   String?            @unique @db.VarChar(50)
  email             String             @db.VarChar(255)
  passwordHash      String             @db.VarChar(255)
  firstName         String             @db.VarChar(100)
  lastName          String             @db.VarChar(100)
  displayName       String             @db.VarChar(200)
  jobTitle          String?            @db.VarChar(200)    // NEW
  avatarUrl         String?            @db.VarChar(500)
  avatarKey         String?            @db.VarChar(500)    // NEW — MinIO key
  role              UserRole           @default(EMPLOYEE)
  status            UserStatus         @default(PENDING_ACTIVATION)
  preferredLanguage SupportedLanguage  @default(fr)
  timezone          String             @default("Africa/Kinshasa") @db.VarChar(50) // NEW
  // MFA
  mfaEnabled        Boolean            @default(false)
  mfaSecret         String?            @db.VarChar(100)
  mfaBackupCodes    String[]           @default([])         // NEW — encrypted backup codes
  // Government structure
  ministryId        String?
  ministry          Ministry?          @relation(fields: [ministryId], references: [id])
  departmentId      String?
  department        Department?        @relation(fields: [departmentId], references: [id])
  divisionId        String?
  division          Division?          @relation(fields: [divisionId], references: [id])
  teamId            String?                                  // NEW
  team              Team?              @relation(fields: [teamId], references: [id])
  // Security
  passwordChangedAt DateTime?                               // NEW
  failedLoginCount  Int                @default(0)          // NEW
  lockedUntil       DateTime?                               // NEW
  // Relations
  sessions          UserSession[]                           // NEW
  devices           UserDevice[]                            // NEW
  sentMessages      Message[]          @relation("SentMessages")
  channelMemberships ChannelMember[]
  notifications     Notification[]
  auditLogs         AuditLog[]
  uploadedFiles     File[]
  assignedTasks     Task[]             @relation("AssignedTasks") // NEW
  createdTasks      Task[]             @relation("CreatedTasks")  // NEW
  reactions         Reaction[]                              // NEW — proper relation
  pinnedMessages    PinnedMessage[]    @relation("PinnedBy") // NEW
  lastLoginAt       DateTime?
  lastLoginIp       String?            @db.VarChar(50)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  deletedAt         DateTime?

  @@unique([email, deletedAt])  // Allows reuse of email after soft-delete
  @@index([email])
  @@index([matriculeNumber])
  @@index([ministryId])
  @@index([departmentId])
  @@index([teamId])
  @@index([role])
  @@index([status])
  @@index([deletedAt])
  @@map("users")
}

// ─── USER SESSION ─────────────────────────────────────────────────────────────
// Tracks every active login session — supports remote logout
model UserSession {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId     String?
  device       UserDevice? @relation(fields: [deviceId], references: [id])
  refreshToken String    @unique @db.VarChar(500)
  userAgent    String?   @db.Text
  ipAddress    String?   @db.VarChar(50)
  platform     Platform  @default(WEB)  // WEB, DESKTOP, MOBILE
  isActive     Boolean   @default(true)
  expiresAt    DateTime
  lastUsedAt   DateTime  @default(now())
  createdAt    DateTime  @default(now())
  revokedAt    DateTime?

  @@index([userId])
  @@index([refreshToken])
  @@index([isActive])
  @@map("user_sessions")
}

// ─── USER DEVICE ──────────────────────────────────────────────────────────────
// Stores device information for push notifications
model UserDevice {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions        UserSession[]
  name            String?       @db.VarChar(200)  // "Prince's iPhone"
  platform        Platform
  pushToken       String?       @db.VarChar(500)  // FCM or APNs token
  pushProvider    PushProvider? // FCM, APNS
  appVersion      String?       @db.VarChar(50)
  osVersion       String?       @db.VarChar(50)
  isActive        Boolean       @default(true)
  lastSeenAt      DateTime      @default(now())
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
  @@index([pushToken])
  @@map("user_devices")
}

enum Platform {
  WEB
  DESKTOP
  MOBILE
}

enum PushProvider {
  FCM   // Firebase Cloud Messaging (Android)
  APNS  // Apple Push Notification Service (iOS)
  WEB   // Web Push API
}
```

### 4.3 Messaging Models (Enhanced)

```prisma
// ─── MESSAGE (Enhanced) ───────────────────────────────────────────────────────
model Message {
  id            String        @id @default(cuid())
  channelId     String
  channel       Channel       @relation(fields: [channelId], references: [id], onDelete: Cascade)
  senderId      String
  sender        User          @relation("SentMessages", fields: [senderId], references: [id])
  type          MessageType   @default(TEXT)
  content       String        @db.Text
  contentRaw    String?       @db.Text  // NEW — original Markdown before rendering
  replyToId     String?
  replyTo       Message?      @relation("Replies", fields: [replyToId], references: [id])
  replies       Message[]     @relation("Replies")
  forwardedFromId String?     // NEW — original message ID if forwarded
  isPinned      Boolean       @default(false)
  pinnedMessage PinnedMessage?
  reactions     Reaction[]
  attachments   File[]        @relation("MessageFiles")
  editHistory   MessageEdit[] // NEW — full edit history
  mentions      MessageMention[] // NEW — structured mention tracking
  isSystemMessage Boolean     @default(false) // NEW — for system events
  editedAt      DateTime?
  deletedAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([channelId, createdAt])
  @@index([senderId])
  @@index([createdAt])
  @@index([deletedAt])
  @@map("messages")
}

// ─── MESSAGE EDIT HISTORY ─────────────────────────────────────────────────────
model MessageEdit {
  id         String   @id @default(cuid())
  messageId  String
  message    Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  content    String   @db.Text
  editedById String
  createdAt  DateTime @default(now())

  @@index([messageId])
  @@map("message_edits")
}

// ─── MESSAGE MENTION ──────────────────────────────────────────────────────────
model MessageMention {
  id          String      @id @default(cuid())
  messageId   String
  message     Message     @relation(fields: [messageId], references: [id], onDelete: Cascade)
  mentionedId String
  type        MentionType // USER, CHANNEL, EVERYONE

  @@unique([messageId, mentionedId])
  @@index([mentionedId])
  @@map("message_mentions")
}

enum MentionType {
  USER
  CHANNEL
  EVERYONE
}

// ─── REACTION (Enhanced) ──────────────────────────────────────────────────────
model Reaction {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  emoji     String   @db.VarChar(20)
  createdAt DateTime @default(now())

  @@unique([messageId, userId, emoji])
  @@index([messageId])
  @@map("reactions")
}
```

### 4.4 Task Management Models (v1.5)

```prisma
// ─── TASK ─────────────────────────────────────────────────────────────────────
model Task {
  id          String       @id @default(cuid())
  channelId   String?
  channel     Channel?     @relation(fields: [channelId], references: [id])
  createdById String
  createdBy   User         @relation("CreatedTasks", fields: [createdById], references: [id])
  assignedToId String?
  assignedTo  User?        @relation("AssignedTasks", fields: [assignedToId], references: [id])
  title       String       @db.VarChar(500)
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueAt       DateTime?
  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?

  @@index([channelId])
  @@index([assignedToId])
  @@index([status])
  @@index([dueAt])
  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### 4.5 Meeting Models (v3.0)

```prisma
// ─── MEETING ──────────────────────────────────────────────────────────────────
model Meeting {
  id           String               @id @default(cuid())
  channelId    String?
  channel      Channel?             @relation(fields: [channelId], references: [id])
  organizerId  String
  title        String               @db.VarChar(255)
  description  String?              @db.Text
  status       MeetingStatus        @default(SCHEDULED)
  scheduledAt  DateTime
  startedAt    DateTime?
  endedAt      DateTime?
  recordingKey String?              @db.VarChar(500)  // MinIO key for recording
  participants MeetingParticipant[]
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  @@index([channelId])
  @@index([scheduledAt])
  @@map("meetings")
}

model MeetingParticipant {
  id          String              @id @default(cuid())
  meetingId   String
  meeting     Meeting             @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  userId      String
  role        MeetingRole         @default(ATTENDEE)
  joinedAt    DateTime?
  leftAt      DateTime?

  @@unique([meetingId, userId])
  @@index([meetingId])
  @@map("meeting_participants")
}

enum MeetingStatus {
  SCHEDULED
  LIVE
  ENDED
  CANCELLED
}

enum MeetingRole {
  ORGANIZER
  PRESENTER
  ATTENDEE
}
```

### 4.6 AI & Analytics Models (v4.0)

```prisma
// ─── AI SUMMARY ───────────────────────────────────────────────────────────────
// Stores AI-generated summaries of channels, meetings, documents
model AiSummary {
  id          String         @id @default(cuid())
  entityType  AiEntityType   // CHANNEL, MEETING, FILE
  entityId    String
  content     String         @db.Text
  language    SupportedLanguage @default(fr)
  model       String         @db.VarChar(100)  // model used
  tokenCount  Int
  createdAt   DateTime       @default(now())

  @@index([entityType, entityId])
  @@map("ai_summaries")
}

enum AiEntityType {
  CHANNEL
  MEETING
  FILE
  THREAD
}
```

---

## 5. Database Indexes Strategy

### 5.1 High-Frequency Query Patterns

| Query                         | Table         | Index                                               |
| ----------------------------- | ------------- | --------------------------------------------------- |
| Load channel messages         | messages      | `(channelId, createdAt DESC)`                       |
| Unread count per user/channel | messages      | `(channelId, createdAt)` + ChannelMember.lastReadAt |
| User lookup by email          | users         | `(email)`                                           |
| User lookup by matricule      | users         | `(matriculeNumber)`                                 |
| Active sessions for user      | user_sessions | `(userId, isActive)`                                |
| Notifications for user        | notifications | `(userId, isRead, createdAt)`                       |
| Audit log by user             | audit_logs    | `(userId, createdAt)`                               |
| Audit log by entity           | audit_logs    | `(entityType, entityId)`                            |
| Files in channel              | files         | `(channelId, createdAt)`                            |
| Tasks assigned to user        | tasks         | `(assignedToId, status)`                            |

### 5.2 Full-Text Search (PostgreSQL Native — pre-OpenSearch)

Add `tsvector` columns to messages and files for full-text search before OpenSearch is deployed:

```sql
-- Add tsvector column to messages
ALTER TABLE messages ADD COLUMN search_vector tsvector;
CREATE INDEX messages_search_idx ON messages USING GIN(search_vector);

-- Auto-update tsvector on insert/update via trigger
CREATE TRIGGER messages_search_update
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.french', content);
```

### 5.3 Composite Indexes for Common Joins

```sql
-- Channel member lookup (most frequent query)
CREATE INDEX idx_channel_members_lookup ON channel_members(channel_id, user_id);

-- Active users in ministry
CREATE INDEX idx_users_ministry_active ON users(ministry_id, status, deleted_at)
WHERE deleted_at IS NULL;
```

---

## 6. Data Retention Policy

| Data Type                 | Retention | Action at Expiry                |
| ------------------------- | --------- | ------------------------------- |
| Messages (non-deleted)    | Permanent | Never purged                    |
| Soft-deleted messages     | 7 years   | Hard delete (audit requirement) |
| Files (non-deleted)       | Permanent | Never purged                    |
| Soft-deleted files        | 90 days   | Hard delete + MinIO purge       |
| Audit logs                | 10 years  | Archive to cold storage         |
| Sessions (expired)        | 30 days   | Hard delete                     |
| User data (deleted users) | 7 years   | Anonymize PII, retain structure |
| Notifications (read)      | 90 days   | Hard delete                     |

---

## 7. Migration Strategy

| Migration               | Contents                                               | When        |
| ----------------------- | ------------------------------------------------------ | ----------- |
| `init` ✅               | Base 13 models, 8 enums                                | v0.1 — Done |
| `add_province_team`     | Province, Team models; User.teamId                     | v0.5        |
| `add_sessions_devices`  | UserSession, UserDevice models                         | v0.5        |
| `enhance_messages`      | MessageEdit, MessageMention; Channel.deletedAt         | v0.5        |
| `enhance_user_security` | failedLoginCount, lockedUntil, passwordChangedAt       | v0.5        |
| `fix_relations`         | Add User relations to Reaction, PinnedMessage, Channel | v0.5        |
| `add_tasks`             | Task model and enums                                   | v1.5        |
| `add_meetings`          | Meeting, MeetingParticipant models                     | v3.0        |
| `add_ai`                | AiSummary model                                        | v4.0        |

All migrations are additive only. No columns are dropped in production migrations — only new tables
and columns are added. Column removal is done via soft deprecation (rename + null + eventual cleanup
migration).
