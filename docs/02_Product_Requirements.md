# Prinodia Workspace — Product Requirements

**Document Version:** 1.0  
**Status:** Approved  
**Classification:** Internal Engineering  
**Last Updated:** 2026-06-24

---

## 1. Functional Requirements

### 1.1 Identity & Authentication

| ID         | Requirement                                                                                    | Priority |
| ---------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-01 | Users must be able to log in with their government matricule number and password               | Critical |
| FR-AUTH-02 | Users must be able to log in with their government email address and password                  | Critical |
| FR-AUTH-03 | The system must support TOTP-based Multi-Factor Authentication (MFA)                           | Critical |
| FR-AUTH-04 | The system must support hardware security key (FIDO2/WebAuthn) as a second factor              | High     |
| FR-AUTH-05 | Administrators must be able to enforce MFA for specific roles or the entire organization       | Critical |
| FR-AUTH-06 | The system must support secure password reset via government email                             | Critical |
| FR-AUTH-07 | Sessions must expire after a configurable idle timeout                                         | Critical |
| FR-AUTH-08 | The system must track all active sessions per user and allow remote session revocation         | High     |
| FR-AUTH-09 | Login attempts must be rate-limited and lockout must trigger after N failed attempts           | Critical |
| FR-AUTH-10 | External partners (Google/Microsoft) may only access the system via admin-approved invitations | Critical |
| FR-AUTH-11 | Biometric authentication must be supported on mobile devices (v2.0)                            | Medium   |

### 1.2 User Management

| ID         | Requirement                                                                          | Priority |
| ---------- | ------------------------------------------------------------------------------------ | -------- |
| FR-USER-01 | Administrators must be able to create, update, suspend, and deactivate user accounts | Critical |
| FR-USER-02 | Each user must have a role from the defined RBAC hierarchy                           | Critical |
| FR-USER-03 | Users must belong to at least one organizational unit (Ministry/Department/Division) | Critical |
| FR-USER-04 | Users must be able to update their display name, avatar, and language preference     | High     |
| FR-USER-05 | Users must be able to set their status (Active, Away, Do Not Disturb, Offline)       | Medium   |
| FR-USER-06 | Administrators must be able to bulk-import users via CSV                             | High     |
| FR-USER-07 | User accounts must support soft delete (data retained for audit, account inactive)   | Critical |
| FR-USER-08 | User profiles must display their organizational position and contact information     | Medium   |

### 1.3 Organizational Structure

| ID        | Requirement                                                                                                              | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-ORG-01 | The system must model the full DRC government hierarchy: Government → Province → Ministry → Department → Division → Team | Critical |
| FR-ORG-02 | Administrators must be able to create and manage organizational units                                                    | Critical |
| FR-ORG-03 | Organizational units must support multilingual names (fr, en, ln, sw, lua)                                               | High     |
| FR-ORG-04 | Each organizational unit must have its own set of channels                                                               | Critical |
| FR-ORG-05 | Users may belong to multiple organizational units (cross-ministry collaboration)                                         | Medium   |

### 1.4 Messaging

| ID        | Requirement                                                                         | Priority |
| --------- | ----------------------------------------------------------------------------------- | -------- |
| FR-MSG-01 | Users must be able to send text messages in channels they are members of            | Critical |
| FR-MSG-02 | Messages must support Markdown formatting                                           | High     |
| FR-MSG-03 | Users must be able to reply to messages in threads                                  | High     |
| FR-MSG-04 | Users must be able to react to messages with emoji                                  | Medium   |
| FR-MSG-05 | Users must be able to edit their own messages (edit history preserved)              | High     |
| FR-MSG-06 | Users must be able to delete their own messages (soft delete, audit trail retained) | High     |
| FR-MSG-07 | Administrators and channel admins must be able to delete any message                | High     |
| FR-MSG-08 | Users must be able to forward messages to other channels                            | Medium   |
| FR-MSG-09 | Users must be able to pin important messages in a channel                           | Medium   |
| FR-MSG-10 | The system must support @mentions of users and @channel notifications               | High     |
| FR-MSG-11 | Messages must be delivered in real-time via WebSocket                               | Critical |
| FR-MSG-12 | Message delivery must be confirmed (sent → delivered → read receipts)               | High     |
| FR-MSG-13 | The system must support direct messages between two users                           | Critical |
| FR-MSG-14 | The system must support group direct messages (up to 8 participants)                | High     |

### 1.5 Channels

| ID       | Requirement                                                                      | Priority |
| -------- | -------------------------------------------------------------------------------- | -------- |
| FR-CH-01 | Channels may be Public, Private, Announcement, Direct, or Group                  | Critical |
| FR-CH-02 | Public channels within a ministry are visible to all ministry members            | Critical |
| FR-CH-03 | Private channels require explicit invitation to join                             | Critical |
| FR-CH-04 | Announcement channels allow only admins to post; members can only read and react | High     |
| FR-CH-05 | Channel admins must be able to manage channel members and settings               | Critical |
| FR-CH-06 | Channels must be archivable (read-only, not deletable)                           | High     |
| FR-CH-07 | Users must receive unread message counts per channel                             | Critical |
| FR-CH-08 | Users must be able to mute channels for a configurable period                    | Medium   |
| FR-CH-09 | Channels must support a searchable message history                               | Critical |

### 1.6 File Management

| ID         | Requirement                                                                                | Priority |
| ---------- | ------------------------------------------------------------------------------------------ | -------- |
| FR-FILE-01 | Users must be able to upload files to channels (documents, images, video, audio, archives) | Critical |
| FR-FILE-02 | Files must be stored in MinIO/S3-compatible object storage, never in the database          | Critical |
| FR-FILE-03 | File uploads must be virus-scanned before becoming accessible                              | Critical |
| FR-FILE-04 | Images must generate thumbnails automatically                                              | High     |
| FR-FILE-05 | File downloads must use time-limited pre-signed URLs                                       | Critical |
| FR-FILE-06 | File access must be logged in the audit trail                                              | Critical |
| FR-FILE-07 | Administrators must be able to set file size and type restrictions per role                | High     |
| FR-FILE-08 | Files must be searchable by name, type, uploader, and date                                 | High     |
| FR-FILE-09 | Files must support soft delete with configurable retention periods                         | High     |

### 1.7 Search

| ID           | Requirement                                                              | Priority |
| ------------ | ------------------------------------------------------------------------ | -------- |
| FR-SEARCH-01 | Users must be able to search messages across all accessible channels     | Critical |
| FR-SEARCH-02 | Users must be able to search files by name, type, and content (PDF/DOCX) | High     |
| FR-SEARCH-03 | Search must support filtering by date range, channel, and author         | High     |
| FR-SEARCH-04 | Search results must be ranked by relevance                               | High     |
| FR-SEARCH-05 | Search must support French accented characters and diacritics            | Critical |

### 1.8 Notifications

| ID          | Requirement                                                                          | Priority |
| ----------- | ------------------------------------------------------------------------------------ | -------- |
| FR-NOTIF-01 | Users must receive in-app notifications for mentions, direct messages, and reactions | Critical |
| FR-NOTIF-02 | Users must receive push notifications on mobile and desktop apps                     | High     |
| FR-NOTIF-03 | Users must be able to configure notification preferences per channel                 | High     |
| FR-NOTIF-04 | Do Not Disturb mode must suppress all notifications for a configurable period        | Medium   |
| FR-NOTIF-05 | Email digests must be configurable for offline users                                 | Low      |

### 1.9 Administration

| ID          | Requirement                                                                                 | Priority |
| ----------- | ------------------------------------------------------------------------------------------- | -------- |
| FR-ADMIN-01 | Super Admins must have a system-wide administration panel                                   | Critical |
| FR-ADMIN-02 | Ministry Admins must be able to manage all users within their ministry                      | Critical |
| FR-ADMIN-03 | Administrators must be able to view and export audit logs                                   | Critical |
| FR-ADMIN-04 | Administrators must be able to configure system-wide settings                               | High     |
| FR-ADMIN-05 | Administrators must receive alerts for security events (failed logins, suspicious activity) | High     |
| FR-ADMIN-06 | The system must provide a health dashboard for IT administrators                            | High     |

---

## 2. Non-Functional Requirements

### 2.1 Availability

| ID           | Requirement                 | Target                                                             |
| ------------ | --------------------------- | ------------------------------------------------------------------ |
| NFR-AVAIL-01 | System availability         | 99.9% uptime (≤8.7 hours downtime/year)                            |
| NFR-AVAIL-02 | Planned maintenance windows | Off-peak hours only, announced 48h in advance                      |
| NFR-AVAIL-03 | Zero-downtime deployments   | Required for all production releases                               |
| NFR-AVAIL-04 | Graceful degradation        | Core messaging must work even if search/notifications are degraded |

### 2.2 Scalability

| ID           | Requirement             | Target                                                      |
| ------------ | ----------------------- | ----------------------------------------------------------- |
| NFR-SCALE-01 | Concurrent active users | Support 50,000 concurrent users at launch; 500,000 at scale |
| NFR-SCALE-02 | Messages per second     | Handle 10,000 messages/second peak throughput               |
| NFR-SCALE-03 | File storage            | Petabyte-scale object storage with horizontal scaling       |
| NFR-SCALE-04 | Database                | PostgreSQL with read replicas; horizontal sharding roadmap  |
| NFR-SCALE-05 | WebSocket connections   | 100,000 simultaneous WebSocket connections                  |

### 2.3 Reliability

| ID         | Requirement                    | Target                                                     |
| ---------- | ------------------------------ | ---------------------------------------------------------- |
| NFR-REL-01 | Message delivery guarantee     | At-least-once delivery with deduplication                  |
| NFR-REL-02 | Data durability                | 99.999999999% (11 nines) for stored files                  |
| NFR-REL-03 | Recovery Point Objective (RPO) | Maximum 1 hour of data loss in disaster                    |
| NFR-REL-04 | Recovery Time Objective (RTO)  | System restored within 4 hours of disaster                 |
| NFR-REL-05 | Message ordering               | Messages in a channel are delivered in chronological order |

### 2.4 Maintainability

| ID           | Requirement                                                 | Target                 |
| ------------ | ----------------------------------------------------------- | ---------------------- |
| NFR-MAINT-01 | All code must have comprehensive unit and integration tests | ≥80% code coverage     |
| NFR-MAINT-02 | All APIs must be documented with OpenAPI/Swagger            | 100% endpoint coverage |
| NFR-MAINT-03 | All public interfaces must have TypeScript type definitions | 100% typed             |
| NFR-MAINT-04 | Dependency updates must be reviewed and applied monthly     | Monthly cycle          |

---

## 3. Performance Requirements

| ID      | Requirement                   | Target      | Measurement                     |
| ------- | ----------------------------- | ----------- | ------------------------------- |
| PERF-01 | Initial page load (web, cold) | < 3 seconds | LCP on 4G                       |
| PERF-02 | Initial page load (web, warm) | < 1 second  | LCP cached                      |
| PERF-03 | Message send to delivery      | < 200ms     | P99 latency                     |
| PERF-04 | Message list load             | < 500ms     | P95 for 500 messages            |
| PERF-05 | File upload (10MB)            | < 5 seconds | On 10Mbps connection            |
| PERF-06 | Search results                | < 1 second  | P95 full-text search            |
| PERF-07 | API response time             | < 200ms     | P95 for all endpoints           |
| PERF-08 | WebSocket reconnection        | < 2 seconds | After connection drop           |
| PERF-09 | Mobile app launch             | < 2 seconds | Cold start on mid-range Android |
| PERF-10 | Desktop app launch            | < 3 seconds | Cold start                      |

---

## 4. Security Requirements

| ID     | Requirement                                      | Standard                                  |
| ------ | ------------------------------------------------ | ----------------------------------------- |
| SEC-01 | All data in transit must be encrypted            | TLS 1.3 minimum                           |
| SEC-02 | All data at rest must be encrypted               | AES-256                                   |
| SEC-03 | Passwords must be hashed with bcrypt             | Cost factor ≥ 12                          |
| SEC-04 | JWT tokens must use RS256 asymmetric signing     | RSA-2048 minimum                          |
| SEC-05 | Access tokens must expire after 15 minutes       | Configurable                              |
| SEC-06 | Refresh tokens must be rotated on every use      | Rotation-based                            |
| SEC-07 | All API endpoints must be authenticated          | No anonymous access to data               |
| SEC-08 | SQL injection prevention                         | Parameterized queries only (Prisma)       |
| SEC-09 | XSS prevention                                   | Content Security Policy + output encoding |
| SEC-10 | CSRF prevention                                  | SameSite cookies + CSRF tokens            |
| SEC-11 | Rate limiting on all auth endpoints              | 5 attempts per 15 minutes                 |
| SEC-12 | Account lockout after failed login attempts      | 5 failures → 30 minute lockout            |
| SEC-13 | All file uploads must be virus-scanned           | ClamAV integration                        |
| SEC-14 | Security headers on all HTTP responses           | OWASP recommended set                     |
| SEC-15 | Dependency vulnerability scanning                | Weekly automated scan                     |
| SEC-16 | Penetration testing                              | Annually before major releases            |
| SEC-17 | All admin actions must require re-authentication | Password confirmation                     |
| SEC-18 | Audit logs must be immutable                     | Write-once, append-only                   |

---

## 5. Accessibility Requirements

| ID     | Requirement                                          | Standard                  |
| ------ | ---------------------------------------------------- | ------------------------- |
| ACC-01 | Web application must meet WCAG 2.1 Level AA          | WCAG 2.1 AA               |
| ACC-02 | All interactive elements must be keyboard navigable  | WCAG 2.1 AA               |
| ACC-03 | All images must have descriptive alt text            | WCAG 2.1 AA               |
| ACC-04 | Color contrast ratios must meet minimum requirements | 4.5:1 for normal text     |
| ACC-05 | Screen reader compatibility                          | NVDA, VoiceOver, TalkBack |
| ACC-06 | Focus indicators must be clearly visible             | WCAG 2.1 AA               |
| ACC-07 | Error messages must be descriptive and actionable    | WCAG 2.1 AA               |
| ACC-08 | The application must support text scaling up to 200% | WCAG 2.1 AA               |
| ACC-09 | All form inputs must have associated labels          | WCAG 2.1 AA               |
| ACC-10 | Animations must respect `prefers-reduced-motion`     | WCAG 2.1 AA               |

---

## 6. Offline Requirements

| ID         | Requirement                                                                         | Platform |
| ---------- | ----------------------------------------------------------------------------------- | -------- |
| OFFLINE-01 | Mobile app must cache the last 500 messages per channel                             | Mobile   |
| OFFLINE-02 | Mobile app must allow composing messages while offline (queued for send)            | Mobile   |
| OFFLINE-03 | Mobile app must display cached files when offline                                   | Mobile   |
| OFFLINE-04 | Desktop app must cache the last 1000 messages per channel                           | Desktop  |
| OFFLINE-05 | Desktop app must queue messages composed while offline                              | Desktop  |
| OFFLINE-06 | Web app must display a clear offline indicator                                      | Web      |
| OFFLINE-07 | Web app must serve cached content via Service Worker                                | Web      |
| OFFLINE-08 | Sync must complete automatically when connectivity is restored                      | All      |
| OFFLINE-09 | Conflict resolution for messages sent simultaneously must be deterministic          | All      |
| OFFLINE-10 | Offline mode must not allow sending to channels the user is not already a member of | All      |

---

## 7. Cross-Platform Requirements

| ID       | Requirement                                                                      | Target  |
| -------- | -------------------------------------------------------------------------------- | ------- |
| CROSS-01 | Web application must work on Chrome, Firefox, Safari, and Edge (last 2 versions) | Web     |
| CROSS-02 | Desktop application must support Windows 10/11 and macOS 12+                     | Desktop |
| CROSS-03 | Mobile application must support Android 9+ and iOS 15+                           | Mobile  |
| CROSS-04 | All platforms must have feature parity for core messaging functions              | All     |
| CROSS-05 | User preferences and settings must sync across all platforms                     | All     |
| CROSS-06 | Notifications must be unified across all platforms (no duplicate alerts)         | All     |
| CROSS-07 | The web application must be responsive on screens from 320px to 4K               | Web     |
| CROSS-08 | The desktop application must adapt to window resizing without layout breaks      | Desktop |
| CROSS-09 | The mobile application must support both portrait and landscape orientations     | Mobile  |
| CROSS-10 | The application must function at minimum on a 1Mbps connection                   | All     |

---

## 8. Localization Requirements

| ID      | Requirement                                                                  | Languages           |
| ------- | ---------------------------------------------------------------------------- | ------------------- |
| L10N-01 | All UI text must be externalized and translatable                            | All                 |
| L10N-02 | The application must ship with 5 languages from launch                       | fr, en, ln, sw, lua |
| L10N-03 | French must be the default language                                          | fr                  |
| L10N-04 | Users must be able to change their language preference at any time           | All                 |
| L10N-05 | Date and time must be formatted according to the user's locale               | All                 |
| L10N-06 | Numbers and currency must be formatted according to the user's locale        | All                 |
| L10N-07 | Text search must handle French accented characters and diacritics correctly  | fr                  |
| L10N-08 | Right-to-left (RTL) layout must be supported in future (Arabic for partners) | Future              |

---

_Requirements are versioned. Changes to this document must be reviewed by the Lead Architect and
approved by the Product Owner._
