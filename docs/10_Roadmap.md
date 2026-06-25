# GovSphere — Product Roadmap

**Document Version:** 1.0  
**Status:** Approved  
**Last Updated:** 2026-06-24

---

## Overview

GovSphere is built in four major phases across seven version milestones. Each milestone has a clear
objective and gates the start of the next. No milestone begins until the prior milestone is stable,
tested, and reviewed.

```
Phase 1 — Foundation       v0.1  Infrastructure, Auth, Database
Phase 2 — Core Platform    v0.5  Messaging, Files, Real-Time
                           v1.0  MVP — Production-Ready Platform
Phase 3 — Desktop & Mobile v1.5  Tauri Desktop
                           v2.0  React Native iOS & Android
Phase 4 — Intelligence     v3.0  Video, Voice, Calendar
                           v4.0  AI, Digital Signatures, Analytics
```

---

## v0.1 — Foundation

**Objective:** A running, tested, deployable skeleton. No features yet — only the engineering
backbone.

**Milestone Gate:** All quality gates pass. Team can deploy to staging with one command.

### Infrastructure

- [ ] Turborepo monorepo fully operational (lint, type-check, build, test all green)
- [ ] Docker Compose local development environment (PostgreSQL, Redis, MinIO)
- [ ] GitHub Actions CI pipeline (lint → type-check → test → build on every push)
- [ ] Staging environment provisioned with Terraform on AWS (ECS Fargate)
- [ ] Automated deployment pipeline: `push to main` → staging deploy
- [ ] NGINX configured with TLS, security headers, WebSocket proxy
- [ ] Health check endpoints: `GET /health` on API, `GET /` on Web

### Database

- [ ] Prisma schema v1 applied to staging PostgreSQL
- [ ] Database migration workflow documented and tested
- [ ] Shadow database configured for safe migration development
- [ ] Prisma Client generated and imported in API

### Observability

- [ ] Structured JSON logging in API (NestJS Logger → CloudWatch)
- [ ] Prometheus metrics endpoint (`/metrics`)
- [ ] Grafana dashboard: API health overview
- [ ] CloudWatch alarms: error rate, latency, disk usage

---

## v0.5 — Core Platform

**Objective:** A working government messaging platform. Civil servants can log in, join channels,
and send messages.

**Milestone Gate:** End-to-end user journey tested by internal team. Zero P1 bugs.

### Identity Platform

- [ ] User registration (admin-only — no self-signup)
- [ ] Login: Matricule Number + Password
- [ ] Login: Government Email + Password
- [ ] JWT access token (RS256, 15-minute TTL)
- [ ] Refresh token rotation (HttpOnly cookie, 7-day TTL)
- [ ] Account lockout after 5 consecutive failed attempts
- [ ] Password reset via government email
- [ ] TOTP-based MFA (Google Authenticator compatible)
- [ ] MFA backup codes (8 single-use codes)
- [ ] Session management: view and revoke active sessions

### RBAC & Organization

- [ ] All 8 roles implemented (SUPER_ADMIN through GUEST)
- [ ] Government → Province → Ministry → Department → Division hierarchy
- [ ] Admin panel: create and manage users
- [ ] Admin panel: assign roles and organizational scope
- [ ] User profile: display name, avatar, job title, contact info

### Channels & Messaging

- [ ] Public channels (ministry-wide)
- [ ] Private channels (invite-only)
- [ ] Direct messages (1:1 between users)
- [ ] Text messages with Markdown formatting
- [ ] Message reactions (emoji)
- [ ] Message threads (reply-in-thread)
- [ ] Message edit (last 15 minutes)
- [ ] Message soft delete
- [ ] @mentions with notification
- [ ] Cursor-based message pagination
- [ ] Unread message tracking

### Real-Time

- [ ] Socket.IO server with Redis adapter
- [ ] Real-time message delivery (channel rooms)
- [ ] Typing indicators
- [ ] Online presence (online/away/offline)
- [ ] Real-time notifications for mentions and DMs

### File Sharing

- [ ] File upload via MinIO pre-signed URL
- [ ] Allowed file types enforced (documents, images, video, audio)
- [ ] File size limits enforced (500MB video, 100MB audio, 100MB default)
- [ ] ClamAV virus scan on every upload
- [ ] File download via pre-signed URL (5-minute expiry)
- [ ] Image preview (thumbnail generation)
- [ ] File metadata stored in PostgreSQL

### Search

- [ ] OpenSearch integration
- [ ] Full-text message search within channels user can access
- [ ] File search by name and type
- [ ] User search (for DMs and mentions)

### Audit & Security

- [ ] All login events logged to audit_logs
- [ ] All file operations logged
- [ ] All admin actions logged
- [ ] Security headers enforced via NGINX
- [ ] Rate limiting: per-user and per-IP
- [ ] Input validation on all API endpoints

---

## v1.0 — MVP (Production-Ready)

**Objective:** GovSphere is ready for real government users. The platform is secure, stable,
performant, and internationalized.

**Milestone Gate:** Third-party security audit passed. 99.9% uptime maintained for 30 days in
staging.

### Localization

- [ ] 5 languages implemented from day one:
  - French (default)
  - English
  - Lingala
  - Swahili
  - Tshiluba
- [ ] UI fully translated
- [ ] API error messages translated
- [ ] Email templates translated
- [ ] User language preference persisted

### Performance

- [ ] API response time p99 < 500ms (under 500 concurrent users)
- [ ] Message delivery latency < 100ms (WebSocket)
- [ ] File upload: client → MinIO direct (API not in upload path)
- [ ] Database query optimization (EXPLAIN ANALYZE on all hot paths)
- [ ] Redis caching for: user profiles, channel metadata, role lookups
- [ ] Next.js static generation for public pages
- [ ] CDN (CloudFront) for static assets

### External Partners

- [ ] External partner invitation (admin-issued invite link)
- [ ] Google OAuth (invitation-only, admin-approved)
- [ ] Microsoft OAuth (invitation-only, admin-approved)
- [ ] GUEST role enforcement (read-only, no file upload)
- [ ] Partner session isolation (cannot see unshared channels)

### Accessibility

- [ ] WCAG 2.1 AA compliance verified by automated tool (axe-core)
- [ ] Keyboard navigation throughout (no mouse-only flows)
- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)
- [ ] Contrast ratios verified for all color combinations
- [ ] Focus indicators visible on all interactive elements

### Administration

- [ ] Super Admin dashboard: system-wide user and role management
- [ ] Ministry Admin dashboard: ministry-scoped management
- [ ] Audit log viewer with date range filter and export to CSV
- [ ] System health dashboard

### Quality

- [ ] Unit test coverage ≥ 80% on API services
- [ ] Integration test suite covering all critical paths
- [ ] E2E test suite: login, send message, upload file, admin panel
- [ ] Load test: 500 concurrent users, all p99 targets met
- [ ] Third-party penetration test — all findings remediated
- [ ] OWASP Top 10 verification — all items addressed

---

## v1.5 — Desktop Application (Tauri)

**Objective:** A native desktop experience for Windows and macOS that feels native, loads instantly,
and works partially offline.

**Milestone Gate:** Desktop app passes all v1.0 feature tests. Installable packages distributed to
pilot government offices.

### Desktop

- [ ] Tauri 2 application wrapping the Next.js web app
- [ ] Native system tray with notification badge
- [ ] Desktop push notifications (OS-level notification center)
- [ ] Native file system integration (drag-and-drop upload from Finder/Explorer)
- [ ] Auto-update mechanism (user prompted when new version available)
- [ ] Windows (NSIS installer, .exe), macOS (.dmg), Linux (.AppImage, .deb) builds
- [ ] Deep link handling: `govsphere://channel/clx...` opens app to that channel
- [ ] Single-instance enforcement (second launch focuses existing window)

### Offline Support (Partial)

- [ ] Message queue: messages composed offline are queued and sent when online
- [ ] Cached channel list, user list, recent messages (SQLite via Tauri)
- [ ] Offline indicator in the UI with sync status when reconnected
- [ ] File uploads queued when offline, resume when reconnected

---

## v2.0 — Mobile Application (iOS & Android)

**Objective:** A full-featured mobile app for civil servants who need government communication on
the go.

**Milestone Gate:** App approved in government-managed App Store / Play Store distribution. 200
pilot users onboarded.

### Mobile

- [ ] React Native + Expo managed workflow
- [ ] iOS (iPhone and iPad) + Android support from one codebase
- [ ] Biometric authentication: Face ID, Touch ID, Fingerprint
- [ ] Push notifications: new messages, mentions, DMs (FCM + APNs)
- [ ] Mobile-optimized message composer with emoji keyboard
- [ ] Camera integration: take photo and share directly in channel
- [ ] Voice memo: record and send audio messages
- [ ] Background sync: messages sync while app is backgrounded
- [ ] Offline-ready: SQLite local cache, optimistic message sending
- [ ] App size: < 50MB (no bundled large assets)

### Shared Mobile & Desktop

- [ ] Shared API client package (`packages/api-client`)
- [ ] Shared authentication flow (token storage uses platform-native secure storage)
- [ ] Shared notification handling logic

---

## v3.0 — Video, Voice & Calendar

**Objective:** GovSphere becomes the complete government communication platform. Replaces Zoom,
Skype, and Calendly for internal use.

**Milestone Gate:** 1,000+ concurrent video meeting participants tested successfully.

### Video & Voice

- [ ] 1:1 video calls (WebRTC peer-to-peer)
- [ ] Group video calls (up to 50 participants) via SFU (Mediasoup or LiveKit)
- [ ] Screen sharing during calls
- [ ] Call recording (stored in MinIO, linked in channel)
- [ ] AI-generated meeting transcript (local Whisper model)
- [ ] Virtual backgrounds
- [ ] Noise cancellation

### Calendar & Meetings

- [ ] Integrated calendar with meeting scheduling
- [ ] Create meeting from channel (auto-creates video room)
- [ ] Calendar invites via government email
- [ ] Recurring meetings
- [ ] Meeting agenda and notes
- [ ] AI meeting summary generated after call ends
- [ ] Availability detection (shows busy/free before scheduling)

---

## v4.0 — Intelligence Platform

**Objective:** GovSphere applies AI and workflow automation to make government more efficient.

**Milestone Gate:** Pilot ministry reports measurable reduction in document processing time.

### Artificial Intelligence

- [ ] AI message summarization (summarize a thread, catch up on a channel)
- [ ] AI document analysis (upload a PDF, ask questions about it)
- [ ] AI meeting transcript search ("find all meetings where Budget was discussed")
- [ ] AI translation (translate message to any of the 5 supported languages)
- [ ] AI draft composer (AI writes draft reply, human reviews and sends)
- [ ] Self-hosted models (Ollama or vLLM) for data sovereignty — no external AI APIs

### Digital Signatures

- [ ] Government document signing (PDF with digital signature)
- [ ] Signature verification
- [ ] Audit trail of signature chain
- [ ] Integration with DRC Public Key Infrastructure (PKI) — if available

### Workflow Automation

- [ ] Document approval workflows (request → review → approve → archive)
- [ ] Automated notifications based on channel events (BullMQ triggers)
- [ ] Zapier-like rule engine for ministry administrators
- [ ] REST API webhooks for integration with legacy government systems

### Analytics

- [ ] Ministry-level communication analytics dashboard
- [ ] Message volume trends
- [ ] Most active channels and users
- [ ] File storage usage by ministry
- [ ] Platform adoption metrics
- [ ] All analytics anonymized and privacy-compliant

---

## Phase 9 — Security & Compliance (Planned)

_Scope defined. Implementation date to be confirmed._

- MFA enforcement for privileged roles (MINISTRY_ADMIN and above)
- Password reset with time-limited secure tokens
- Session management UI (view, revoke all devices)
- Device registration and device trust scoring
- IP address logging on all authentication events
- RBAC enforcement unit tests covering all permission boundaries
- File access audit: who downloaded what and when
- Data retention automation: messages and files auto-archived per policy
- Automated database backup and restore tests
- Incident response runbook finalized

## Phase 10 — Desktop & Mobile Deep Integration (Planned)

_Scope defined as part of v1.5 and v2.0. Listed separately for planning visibility._

- Tauri desktop setup and native packaging
- React Native + Expo project setup
- Shared `packages/api-client` for web, desktop, mobile
- Push notification infrastructure (FCM + APNs)
- Mobile biometric login
- Offline-ready message queue architecture

---

## Version Summary

| Version | Focus                                         | Status         |
| ------- | --------------------------------------------- | -------------- |
| v0.1    | Foundation — Infrastructure & CI/CD           | 🔄 In Progress |
| v0.5    | Core Platform — Auth, Messaging, Files        | 📋 Planned     |
| v1.0    | MVP — Production Ready, Localized, Accessible | 📋 Planned     |
| v1.5    | Tauri Desktop                                 | 📋 Planned     |
| v2.0    | React Native Mobile (iOS + Android)           | 📋 Planned     |
| v3.0    | Video, Voice, Calendar                        | 📋 Planned     |
| v4.0    | AI, Workflows, Digital Signatures             | 📋 Planned     |
