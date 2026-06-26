# Prinodia Workspace — Identity Platform Architecture

**Document Version:** 1.0  
**Status:** Approved for Implementation  
**Classification:** CONFIDENTIAL — Internal Engineering  
**Author:** Lead Solution Architect & Security Architect  
**Last Updated:** 2026-06-24

---

## Table of Contents

1. [Identity Platform Purpose](#1-identity-platform-purpose)
2. [Authentication Methods](#2-authentication-methods)
3. [User Types](#3-user-types)
4. [User Statuses](#4-user-statuses)
5. [RBAC Model](#5-rbac-model)
6. [Permission Matrix](#6-permission-matrix)
7. [Session Management](#7-session-management)
8. [MFA Design](#8-mfa-design)
9. [Password Policy](#9-password-policy)
10. [Audit Logging](#10-audit-logging)
11. [Database Review & Schema Proposals](#11-database-review--schema-proposals)
12. [API Design](#12-api-design)
13. [Security Risks & Mitigations](#13-security-risks--mitigations)
14. [Implementation Plan](#14-implementation-plan)

---

## 1. Identity Platform Purpose

### Why Identity Is the Foundation

Prinodia Workspace is a platform where ministers discuss national policy, department heads share classified
circulars, and civil servants collaborate on sensitive government operations. Every feature —
messaging, file sharing, channels, meetings — depends on one absolute prerequisite: **we must know
who you are, and we must be certain**.

If the identity platform fails, the entire security model collapses. A message in the wrong person's
hands is a data breach. A file downloaded by an unauthorized user is a national security event. A
shared account used by two civil servants makes audit trails meaningless and accountability
impossible.

The Identity Platform is therefore not just a login screen. It is the enforcement point for:

- **Authentication** — prove who you are
- **Authorization** — determine what you are allowed to do
- **Accountability** — record every action you take
- **Session integrity** — ensure your credential is valid for the duration of every request

No feature in Prinodia Workspace is built until the Identity Platform is in place and hardened. This is a
deliberate engineering decision: all other modules — Channels, Messages, Files, Search — are built
on top of the identity layer and delegate every access decision to it.

### Design Principles for the Identity Platform

- **No implicit trust.** Every request is authenticated. Expired or missing tokens are always
  rejected, regardless of the source.
- **Least privilege by default.** A new user has zero permissions until explicitly granted a role.
  Roles grant only what is necessary.
- **Explicit scope.** A Ministry Admin's power extends only to their ministry. A Division Admin's
  power extends only to their division. Scope violations are blocked at the API layer, not just the
  UI.
- **Auditability.** Every identity event — login, logout, role change, password reset — is
  permanently recorded and cannot be altered or deleted.
- **Graceful degradation.** If the identity platform has a temporary error, the rest of the platform
  fails safely: access is denied, not granted.

---

## 2. Authentication Methods

### 2.1 Supported Methods (Current)

#### Method 1: Matricule Number + Password

The Matricule Number is the government-issued civil servant identification number for the DRC. It is
the primary and preferred authentication method for all government employees.

**Format rules:**

- Stored as a `String` in the database — never as `Int` or `BigInt`
- Leading zeros must be preserved
- Dots (`.`) are part of the format and must be stored as-is
- No normalization on input — the user types it exactly as it appears on their government ID card

**Accepted matricule formats:**

| Example     | Notes                                   |
| ----------- | --------------------------------------- |
| `1.641.558` | Three-part format, most common          |
| `478.432`   | Two-part format                         |
| `424.55`    | Two-part format, shorter second segment |

**Validation regex:** `^\d{1,4}(\.\d{1,4}){1,2}$`

**Lookup rule:** API performs an exact string match against `User.matricule`. Case does not apply
(digits and dots only). Whitespace is trimmed before comparison.

#### Method 2: Government Email + Password

All civil servants are issued a `@gouv.cd` email address. This is the secondary authentication
method.

**Format:** `[firstname.lastname]@[ministry].gouv.cd`  
**Example:** `jean.mbeki@finances.gouv.cd`

**Validation:** Standard email format validation. The email domain must end in `.gouv.cd`. External
email domains (Gmail, Outlook, Yahoo, etc.) are rejected for this authentication path.

**Lookup rule:** API performs a case-insensitive match against `User.email`.

### 2.2 Future Methods (Not Yet Implemented)

#### Method 3: Microsoft SSO (v1.5+)

For civil servants whose ministries use Microsoft 365. Azure AD integration via OAuth 2.0 / OpenID
Connect.

- **Scope:** Government employees only — must match an existing `User` record by email
- **Trigger:** "Sign in with Microsoft" button on the login screen
- **Account linking:** On first Microsoft SSO login, the system links the Microsoft account to the
  existing government user record (matched by `.gouv.cd` email)
- **Restriction:** Cannot be used to create new accounts — only to authenticate existing ones

#### Method 4: Google Sign-In for External Partners (v1.0+)

For invited external partners (NGO representatives, international partners, consultants) who do not
have DRC government credentials.

- **Scope:** External partners with GUEST role ONLY
- **Trigger:** Invitation email containing a one-time acceptance link
- **Admin approval required:** A Ministry Admin or higher must issue the invitation
- **Domain restriction:** Any Google-managed email domain is accepted, but the invitation is bound
  to the specific email address — changing Google accounts after acceptance is not permitted without
  admin action
- **Cannot escalate:** External users authenticated via Google can never be promoted above GUEST
  role

### 2.3 Credential Storage Rules

| Credential       | Storage                     | Notes                                                         |
| ---------------- | --------------------------- | ------------------------------------------------------------- |
| Password         | bcrypt hash, cost factor 12 | Plaintext never stored                                        |
| Matricule        | Plaintext string            | Not sensitive — government-issued public ID                   |
| Government email | Plaintext string            | Normalized to lowercase on save                               |
| MFA secret       | AES-256-GCM encrypted       | Key in environment variable only                              |
| OAuth tokens     | Not stored                  | OAuth flow is stateless — only the user identity is persisted |

---

## 3. User Types

User types describe the **role** a person plays in the government hierarchy. They are not the same
as system roles (which control permissions) — they describe the person's real-world title and
responsibilities.

| User Type               | Description                                                                                                                                  | Default System Role |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Government Employee** | Standard civil servant. The most common user type. Works in a specific ministry, department, and division.                                   | `EMPLOYEE`          |
| **Minister**            | Head of a ministry. Participates in cross-ministry channels and has visibility into their ministry's full communication.                     | `MINISTRY_ADMIN`    |
| **Director**            | Head of a department within a ministry. Manages department-level channels and team assignments.                                              | `DEPARTMENT_ADMIN`  |
| **Department Admin**    | IT or administrative manager responsible for onboarding and managing users within a department. Not a director — a technical administrator.  | `DEPARTMENT_ADMIN`  |
| **IT Administrator**    | System-level administrator. Manages platform configuration, user accounts, and technical infrastructure. Not necessarily in any ministry.    | `GOVERNMENT_ADMIN`  |
| **External Partner**    | Non-government collaborator (NGO, international organization, consultant). Invited by admin. Read-only access to explicitly shared channels. | `GUEST`             |
| **Guest**               | A temporary user — could be a visiting official or a contractor. Same permissions as External Partner.                                       | `GUEST`             |

**Important:** User type is a metadata field (`userType` on the `User` model) that describes the
person. System role (stored in the `UserRole` join table) controls what they can actually do. A
Minister must still be explicitly assigned `MINISTRY_ADMIN` — the user type alone does not grant
permissions.

---

## 4. User Statuses

A user's status determines whether they can log in and use the platform at any given moment.

| Status        | Can Log In | Can Use App | Description                                                                                                                                                           |
| ------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING`     | ❌         | ❌          | Account created by admin, but user has not completed first login / email verification.                                                                                |
| `ACTIVE`      | ✅         | ✅          | Normal operating state. Account is fully functional.                                                                                                                  |
| `SUSPENDED`   | ❌         | ❌          | Temporarily disabled by admin. Common during investigations or disciplinary proceedings. The account and its data are preserved.                                      |
| `LOCKED`      | ❌         | ❌          | Automatically set after exceeding failed login attempts. Resets after lockout duration or admin action.                                                               |
| `DEACTIVATED` | ❌         | ❌          | Civil servant has left the ministry or changed positions. Account is disabled but data is retained for audit purposes. Set by admin.                                  |
| `ARCHIVED`    | ❌         | ❌          | Long-term storage state. Applied after a configurable retention period post-deactivation. User data is retained for legal compliance but the account is fully closed. |

### Status Transition Rules

```
Created by admin → PENDING
    PENDING + first login completed → ACTIVE
    ACTIVE + 5 failed logins → LOCKED
    LOCKED + lockout period expires → ACTIVE
    LOCKED + admin unlocks → ACTIVE
    ACTIVE + admin suspends → SUSPENDED
    SUSPENDED + admin reactivates → ACTIVE
    ACTIVE or SUSPENDED + admin deactivates → DEACTIVATED
    DEACTIVATED + retention period → ARCHIVED
```

**Transitions that are never permitted:**

- `ARCHIVED` → any other status (archived is permanent)
- Any status → `PENDING` (PENDING is only the initial state)

---

## 5. RBAC Model

### 5.1 Role Definitions

Prinodia Workspace uses a hierarchical role system. Higher role weight includes all permissions of lower
roles in the same organizational scope, plus additional permissions.

| Role               | Weight | Scope             | Description                                                                                                             |
| ------------------ | ------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`      | 100    | System-wide       | Full access to everything. Reserved for Prinodia Workspace platform engineers and the DRC IT authority. Maximum 3 accounts.      |
| `GOVERNMENT_ADMIN` | 90     | Cross-ministry    | Can manage all ministries. Assigned to IT administrators and senior government officials.                               |
| `MINISTRY_ADMIN`   | 70     | Ministry          | Full access within their assigned ministry. Can manage departments, divisions, users, and channels within the ministry. |
| `DEPARTMENT_ADMIN` | 50     | Department        | Full access within their assigned department. Can manage divisions and users within the department.                     |
| `DIVISION_ADMIN`   | 40     | Division          | Full access within their assigned division. Can manage teams and users within the division.                             |
| `TEAM_MANAGER`     | 30     | Team              | Can manage their team's channels and members.                                                                           |
| `EMPLOYEE`         | 10     | Assigned channels | Standard user. Can send messages and upload files in channels they are members of.                                      |
| `GUEST`            | 0      | Invited channels  | Read-only access to specific channels they have been invited to. Cannot send messages or upload files.                  |

### 5.2 Organizational Scope

Roles are scoped to organizational units. The scope is enforced at the data access layer — not just
the UI — for every API request.

```
SUPER_ADMIN / GOVERNMENT_ADMIN
  └── [No scope restriction — cross-ministry access]

MINISTRY_ADMIN
  └── Ministry: { ministryId }
      └── Can access: all departments, divisions, teams, and channels within this ministry

DEPARTMENT_ADMIN
  └── Department: { departmentId }
      └── Can access: all divisions, teams, and channels within this department
      └── Exception: can also read ministry-level channels (read-only)

DIVISION_ADMIN
  └── Division: { divisionId }
      └── Can access: all teams and channels within this division

TEAM_MANAGER
  └── Team: { teamId }
      └── Can access: all channels within this team

EMPLOYEE
  └── Explicit channel membership only

GUEST
  └── Specific channel invitations only
```

### 5.3 Permission System

Permissions are fine-grained capabilities that can be grouped into roles. The system uses a
`Role → RolePermission → Permission` join structure, allowing:

- Standard role assignments (role comes with a predefined permission set)
- Custom role creation (for ministries with unique workflows)
- Permission overrides (grant a specific permission to a user outside their role, for edge cases)

**Permission naming convention:** `RESOURCE:ACTION`

**Core permissions:**

```
AUTH permissions:
  AUTH:LOGIN                    Can authenticate with the platform
  AUTH:SETUP_MFA                Can enable/disable MFA on own account
  AUTH:MANAGE_SESSIONS          Can view and revoke own sessions

USER permissions:
  USER:READ_OWN                 Can read own profile
  USER:UPDATE_OWN               Can update own profile (display name, avatar)
  USER:READ_MINISTRY            Can read user profiles within own ministry
  USER:READ_ALL                 Can read all user profiles (system-wide)
  USER:CREATE                   Can create new user accounts
  USER:UPDATE_ROLE              Can assign or change user roles
  USER:DEACTIVATE               Can deactivate user accounts
  USER:UNLOCK                   Can unlock locked accounts

CHANNEL permissions:
  CHANNEL:READ_MEMBER           Can read messages in channels they are a member of
  CHANNEL:SEND_MESSAGE          Can send messages in channels they are a member of
  CHANNEL:CREATE_PUBLIC         Can create public channels
  CHANNEL:CREATE_PRIVATE        Can create private channels
  CHANNEL:MANAGE_OWN            Can manage channels they created
  CHANNEL:MANAGE_MINISTRY       Can manage any channel within own ministry
  CHANNEL:MANAGE_ALL            Can manage any channel in the system
  CHANNEL:ARCHIVE               Can archive channels
  CHANNEL:ADD_MEMBER            Can add members to channels

FILE permissions:
  FILE:UPLOAD                   Can upload files to channels they are a member of
  FILE:DOWNLOAD_OWN             Can download files in their channels
  FILE:DELETE_OWN               Can delete files they uploaded
  FILE:DELETE_ANY_MINISTRY      Can delete any file within own ministry
  FILE:DELETE_ANY               Can delete any file in the system

ADMIN permissions:
  ADMIN:VIEW_AUDIT_LOGS_MINISTRY  Can view audit logs for own ministry
  ADMIN:VIEW_AUDIT_LOGS_ALL       Can view all audit logs
  ADMIN:MANAGE_ROLES              Can create and modify roles
  ADMIN:INVITE_EXTERNAL           Can invite external partners
  ADMIN:SYSTEM_CONFIG             Can modify system-wide configuration
```

---

## 6. Permission Matrix

### Full Matrix: Role → Permission

✅ = Granted by default for this role  
⚠️ = Granted within organizational scope only  
❌ = Denied

| Permission                     | SUPER | GOV | MIN | DEPT | DIV | TEAM | EMP | GUEST |
| ------------------------------ | :---: | :-: | :-: | :--: | :-: | :--: | :-: | :---: |
| **Authentication**             |       |     |     |      |     |      |     |       |
| AUTH:LOGIN                     |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| AUTH:SETUP_MFA                 |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| AUTH:MANAGE_SESSIONS           |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| **Users**                      |       |     |     |      |     |      |     |       |
| USER:READ_OWN                  |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| USER:UPDATE_OWN                |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| USER:READ_MINISTRY             |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| USER:READ_ALL                  |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| USER:CREATE                    |  ✅   | ✅  | ⚠️  |  ⚠️  | ❌  |  ❌  | ❌  |  ❌   |
| USER:UPDATE_ROLE               |  ✅   | ✅  | ⚠️  |  ⚠️  | ❌  |  ❌  | ❌  |  ❌   |
| USER:DEACTIVATE                |  ✅   | ✅  | ⚠️  |  ⚠️  | ❌  |  ❌  | ❌  |  ❌   |
| USER:UNLOCK                    |  ✅   | ✅  | ⚠️  |  ⚠️  | ❌  |  ❌  | ❌  |  ❌   |
| **Channels**                   |       |     |     |      |     |      |     |       |
| CHANNEL:READ_MEMBER            |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| CHANNEL:SEND_MESSAGE           |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| CHANNEL:CREATE_PUBLIC          |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ❌  |  ❌   |
| CHANNEL:CREATE_PRIVATE         |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ❌  |  ❌   |
| CHANNEL:MANAGE_OWN             |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| CHANNEL:MANAGE_MINISTRY        |  ✅   | ✅  | ⚠️  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| CHANNEL:MANAGE_ALL             |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| CHANNEL:ARCHIVE                |  ✅   | ✅  | ⚠️  |  ⚠️  | ❌  |  ❌  | ❌  |  ❌   |
| CHANNEL:ADD_MEMBER             |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ❌  |  ❌   |
| **Files**                      |       |     |     |      |     |      |     |       |
| FILE:UPLOAD                    |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| FILE:DOWNLOAD_OWN              |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |
| FILE:DELETE_OWN                |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| FILE:DELETE_ANY_MINISTRY       |  ✅   | ✅  | ⚠️  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| FILE:DELETE_ANY                |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| **Administration**             |       |     |     |      |     |      |     |       |
| ADMIN:VIEW_AUDIT_LOGS_MINISTRY |  ✅   | ✅  | ⚠️  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| ADMIN:VIEW_AUDIT_LOGS_ALL      |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| ADMIN:MANAGE_ROLES             |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| ADMIN:INVITE_EXTERNAL          |  ✅   | ✅  | ⚠️  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| ADMIN:SYSTEM_CONFIG            |  ✅   | ❌  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |

### Channel-Level Access Control

Beyond role-level permissions, channel membership is a second independent gate. Even if a user has
`CHANNEL:READ_MEMBER` permission, they can only read channels they are a member of. Being a
MINISTRY_ADMIN grants the ability to join any channel in the ministry — but they are not
automatically a member of every channel.

```
Access to a channel message requires BOTH:
  1. RBAC: User role has CHANNEL:READ_MEMBER AND channel is within user's scope
  2. Membership: User has an active ChannelMember record for that channel

Exception (overrides membership requirement):
  CHANNEL:MANAGE_ALL → can read any channel without being a member
  CHANNEL:MANAGE_MINISTRY → can read any channel within their ministry without being a member
```

---

## 7. Session Management

### 7.1 Token Architecture

Prinodia Workspace uses two-token authentication: a short-lived access token and a long-lived refresh token.

#### Access Token

```
Format:     JWT signed with RS256 (2048-bit RSA key pair)
TTL:        15 minutes
Storage:    Client memory only (JavaScript variable, React state)
            NEVER in localStorage, NEVER in sessionStorage

Payload:
{
  "sub":        "cuid-user-id",           // user ID
  "jti":        "cuid-token-id",          // unique token ID (for blacklisting)
  "role":       "MINISTRY_ADMIN",         // highest role name (for quick checks)
  "weight":     70,                       // role weight integer
  "ministryId": "cuid-ministry-id",       // organizational scope
  "sessionId":  "cuid-session-id",        // links token to session record
  "iat":        1719216600,               // issued at
  "exp":        1719217500                // expires at (iat + 15 min)
}
```

**Why RS256:** The private key signs tokens on the API server. Any service can verify tokens using
the public key without needing the private key. The private key is never distributed.

**Why memory-only:** localStorage survives browser close and is readable by any JavaScript on the
page (XSS vulnerability). Memory storage is cleared when the tab closes, limiting the exposure
window.

#### Refresh Token

```
Format:     JWT signed with RS256 (same key pair)
TTL:        7 days
Storage:    HttpOnly cookie
            Secure: true (HTTPS only)
            SameSite: Strict (blocks cross-site requests)
            Path: /auth/refresh (only sent to the refresh endpoint)

Payload:
{
  "sub":       "cuid-user-id",
  "jti":       "cuid-token-id",
  "sessionId": "cuid-session-id",
  "family":    "cuid-token-family",       // for refresh token rotation family tracking
  "iat":       1719216600,
  "exp":       1719820800                 // 7 days
}
```

**Why HttpOnly:** The `HttpOnly` flag prevents JavaScript from reading the cookie. It can only be
sent automatically by the browser to the server. This makes it XSS-immune.

**Why `Path: /auth/refresh`:** The refresh token cookie is only transmitted when the browser calls
`/auth/refresh` — not on every API request. This limits the window where the cookie is in transit.

### 7.2 Token Rotation

On every call to `POST /auth/refresh`:

```
1. Validate the incoming refresh token (signature, expiry, not blacklisted)
2. Check that the sessionId in the token matches an active UserSession record
3. Issue a new access token (new jti, new exp)
4. Issue a new refresh token (new jti, same sessionId, new exp)
5. Blacklist the old refresh token jti in Redis (TTL = remaining time of old token)
6. Set the new refresh token as the HttpOnly cookie
7. Return the new access token in the response body
```

**Token family tracking:** Each refresh token carries a `family` identifier (set at login, not
rotated). If a refresh token from a family is used after the family has been rotated (indicating
token reuse / theft), the entire session is immediately invalidated and the user is forced to
re-login.

### 7.3 Token Blacklist

The Redis blacklist is checked on every authenticated request:

```
Key:   blacklist:access:{jti}
Value: "1"
TTL:   Remaining seconds until token expiry

Key:   blacklist:refresh:{jti}
Value: "1"
TTL:   Remaining seconds until token expiry
```

Blacklisting events:

- `POST /auth/logout` → blacklist the current access token and refresh token
- `POST /auth/logout-all` → blacklist all active tokens for all sessions belonging to the user
- Admin suspends/deactivates account → blacklist all tokens for the user
- Password changed → blacklist all tokens for the user (force re-login on all devices)

### 7.4 Session Lifecycle

```
Login
  → Create UserSession record:
      { userId, deviceId, ipAddress, userAgent, platform, createdAt, lastUsedAt, isActive: true }
  → Both access and refresh tokens carry sessionId

Each API request
  → Validate access token
  → Verify sessionId in token matches an active UserSession
  → Update session.lastUsedAt

Refresh
  → Validate refresh token
  → Verify session is still active
  → Issue new tokens (rotation)

Logout
  → Set UserSession.isActive = false
  → Set UserSession.revokedAt = now()
  → Blacklist current access + refresh tokens
  → Clear HttpOnly cookie

Auto-expiry
  → Sessions with lastUsedAt older than 30 days are marked expired by a scheduled job
```

### 7.5 Multi-Device Support

Users can be logged in on multiple devices simultaneously:

- Web browser (Next.js)
- Desktop app (Tauri)
- Mobile app (React Native)

Each login creates an independent `UserSession`. Logging out from one device does not affect others
unless `POST /auth/logout-all` is called.

---

## 8. MFA Design

### 8.1 TOTP (Time-Based One-Time Password) — Primary Method

```
Standard:   RFC 6238
Algorithm:  HMAC-SHA1
Period:     30 seconds
Digits:     6
Tolerance:  ±1 period (accepts codes from current and adjacent windows for clock skew)
Library:    otplib (Node.js)
QR format:  otpauth://totp/Prinodia Workspace:{email}?secret={base32secret}&issuer=Prinodia Workspace
```

**Compatible apps:** Google Authenticator, Microsoft Authenticator, Authy, 1Password, Aegis
(Android)

**MFA Setup Flow:**

```
1. User navigates to Account → Security → Enable MFA
2. POST /auth/mfa/setup (authenticated)
3. API generates a 160-bit cryptographically random secret (crypto.randomBytes(20))
4. API encodes secret as Base32
5. API generates otpauth:// URI and derives a QR code data URL
6. API returns: { secret: string (base32), qrCode: string (data URL), otpauthUri: string }
7. The MFA secret is NOT saved yet — user must verify before it is activated
8. User scans QR code, gets first code from authenticator app
9. POST /auth/mfa/verify-setup { code: "123456" }
10. API verifies the code against the unconfirmed secret
11. On success:
    a. Encrypt the secret with AES-256-GCM (key from MFA_ENCRYPTION_KEY env)
    b. Save encrypted secret to User.mfaSecret
    c. Set User.mfaEnabled = true
    d. Generate 8 backup codes (see below)
    e. Return backup codes ONCE — this is the only time they are shown
12. Write AUDIT LOG: MFA_ENABLED
```

**MFA Login Flow:**

```
1. User completes credential check (matricule/email + password) — credentials valid
2. If User.mfaEnabled = true:
   a. Issue short-lived MFA challenge token (TTL: 5 minutes)
      { sub: userId, type: "mfa_challenge", exp: +5min }
   b. Return HTTP 202 with { mfaRequired: true, challengeToken: string }
   c. Client shows MFA code input screen
3. User submits code: POST /auth/mfa/verify { challengeToken, code }
4. API validates challenge token (not expired, type matches)
5. API fetches User, decrypts mfaSecret, verifies TOTP code
6. On success: Issue normal access + refresh tokens, create session
7. On failure: Increment failed MFA attempts (max 5 before temporary lock)
```

### 8.2 Backup Codes

When MFA is enabled, 8 single-use backup codes are generated.

```
Format:    XXXXX-XXXXX (10 alphanumeric characters, dash in middle)
Example:   A3K9M-7BZ2Q
Quantity:  8 codes
Storage:   Each code hashed with bcrypt (cost 10) before storage in MfaBackupCode table
Usage:     Each code can be used exactly once
After use: Code is marked used (isUsed: true, usedAt: timestamp) — never deleted
Viewing:   Shown ONCE at MFA setup. Never retrievable afterward.
           User must disable and re-enable MFA to get new backup codes.
```

**Backup code login flow:**

```
1. At MFA challenge step, user clicks "Use backup code"
2. POST /auth/mfa/verify { challengeToken, backupCode: "A3K9M-7BZ2Q" }
3. API fetches all non-used backup codes for the user
4. API bcrypt.compare(input, each stored hash) until match found
5. On match: Mark code as used, issue tokens, create session
6. API sends alert notification: "A backup code was used to log in from [IP]"
7. If user has fewer than 3 backup codes remaining, recommend generating new ones
```

### 8.3 MFA Enforcement Policy

| Role               | MFA Status                                                  |
| ------------------ | ----------------------------------------------------------- |
| `SUPER_ADMIN`      | **Mandatory** — account cannot be used without MFA          |
| `GOVERNMENT_ADMIN` | **Mandatory**                                               |
| `MINISTRY_ADMIN`   | **Mandatory**                                               |
| `DEPARTMENT_ADMIN` | **Strongly recommended** — enforced by system configuration |
| `DIVISION_ADMIN`   | Optional (default)                                          |
| `TEAM_MANAGER`     | Optional (default)                                          |
| `EMPLOYEE`         | Optional (default)                                          |
| `GUEST`            | Optional (default)                                          |

Enforcement is configured via the `SystemConfig` model. When enforcement is active, users with that
role are redirected to MFA setup on first login after the policy is activated. They cannot use the
platform until MFA is configured.

### 8.4 Future: FIDO2 / WebAuthn (v1.0+)

Hardware security keys (YubiKey 5) and platform authenticators (Windows Hello, Touch ID, Face ID)
will be supported via the WebAuthn API for the highest-risk accounts.

```
Registration:   navigator.credentials.create(publicKeyCredentialCreationOptions)
Authentication: navigator.credentials.get(publicKeyCredentialRequestOptions)
Storage:        MfaDevice model stores { credentialId, publicKey, counter, deviceName }
```

FIDO2 will be available as an alternative to TOTP, not a replacement. Users may register multiple
FIDO2 devices (e.g., a YubiKey and a backup device).

---

## 9. Password Policy

### 9.1 Requirements

| Rule                       | Requirement                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| Minimum length             | 12 characters                                                                         |
| Maximum length             | 128 characters (prevents DoS via bcrypt on very long passwords)                       |
| Uppercase required         | At least 1 uppercase letter (A-Z)                                                     |
| Lowercase required         | At least 1 lowercase letter (a-z)                                                     |
| Number required            | At least 1 digit (0-9)                                                                |
| Special character required | At least 1 special character (`!@#$%^&\*()-\_=+[]{}                                   | ;:',.<>?`) |
| Common password rejection  | Checked against a list of 100,000 most common passwords                               |
| Breach check               | Optional: k-anonymity check via HaveIBeenPwned API (first 5 chars of SHA-1 hash only) |
| History                    | Cannot reuse the last 10 passwords (hashes stored in `PasswordHistory` table)         |
| Hashing algorithm          | bcrypt with cost factor 12                                                            |
| Expiry — privileged roles  | 90 days (`SUPER_ADMIN`, `GOVERNMENT_ADMIN`, `MINISTRY_ADMIN`)                         |
| Expiry — standard roles    | 180 days                                                                              |
| Expiry enforcement         | User is redirected to password change screen. Cannot access platform until changed.   |

### 9.2 Password Reset Flow

```
1. User submits: POST /auth/forgot-password { credential: "1.641.558" }
   (credential is matricule OR email)

2. API looks up user by credential (case-insensitive for email)

3. Regardless of whether user is found, API returns HTTP 200:
   { message: "If an account with that credential exists, a reset email has been sent." }
   (Prevents user enumeration attacks)

4. If user IS found AND has a government email:
   a. Generate 32 bytes of cryptographically random data (crypto.randomBytes(32))
   b. Convert to hex string (64 chars) → this is the raw token sent in the email
   c. SHA-256 hash the raw token → this is what is stored in the DB
   d. Create PasswordResetToken record:
      { userId, tokenHash, expiresAt: now() + 1 hour, used: false }
   e. Send email with link: https://govsphere.gouv.cd/reset-password?token={rawToken}

5. User clicks link → client sends: POST /auth/reset-password { token, newPassword }

6. API:
   a. SHA-256 hashes the received token
   b. Finds PasswordResetToken where tokenHash matches AND used = false AND expiresAt > now()
   c. If not found: return HTTP 400 { error: "TOKEN_INVALID_OR_EXPIRED" }
   d. Validates new password against policy
   e. Checks password history (cannot reuse last 10)
   f. Hashes new password with bcrypt
   g. Updates User.passwordHash
   h. Marks PasswordResetToken.used = true
   i. Invalidates all active sessions for this user (force re-login on all devices)
   j. Blacklists all active access tokens for this user in Redis
   k. Writes AUDIT LOG: PASSWORD_RESET

7. Returns HTTP 200 { message: "Password reset successful. Please log in." }
```

### 9.3 Account Lockout

| Trigger                              | Action                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| 5 consecutive failed login attempts  | Account `status` set to `LOCKED`. `lockedUntil` set to `now() + 30 minutes`.                |
| 10 consecutive failed login attempts | Account `status` set to `LOCKED`. `lockedUntil` set to null (manual admin unlock required). |
| Successful login                     | `failedLoginCount` reset to 0.                                                              |
| Admin unlock                         | `status` set to `ACTIVE`, `lockedUntil` cleared, `failedLoginCount` reset to 0.             |
| Lockout expiry                       | On next login attempt, API checks `lockedUntil < now()` — if passed, unlocks automatically. |

**Response on locked account:** HTTP 401 with
`{ error: "ACCOUNT_LOCKED", lockedUntil: ISO_TIMESTAMP }`. The lockout duration is disclosed (not
the reason for lockout) to allow legitimate users to know when to try again.

---

## 10. Audit Logging

### 10.1 Audit Log Record Structure

Every audit log entry has:

```typescript
{
  id: string; // CUID
  userId: string; // Who performed the action (null for system events)
  action: string; // Event type (enum)
  entityType: string; // What was affected (e.g., "USER", "CHANNEL", "FILE")
  entityId: string; // ID of the affected entity
  metadata: JSON; // Event-specific context (see per-event schema below)
  ipAddress: string; // Request IP (from X-Forwarded-For via NGINX)
  userAgent: string; // Browser/client identifier
  createdAt: DateTime; // Immutable timestamp
}
```

**Immutability guarantee:** The database user has only `INSERT` and `SELECT` on `audit_logs`.
`UPDATE` and `DELETE` are never granted to the application user.

### 10.2 Authentication Events

| Event           | Trigger                     | Metadata                                                                                                                                                  |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOGIN_SUCCESS` | Successful login            | `{ method: "matricule" \| "email" \| "oauth", mfaUsed: boolean, sessionId }`                                                                              |
| `LOGIN_FAILED`  | Failed credential attempt   | `{ credential: "matricule" \| "email", reason: "INVALID_PASSWORD" \| "USER_NOT_FOUND" \| "ACCOUNT_LOCKED" \| "ACCOUNT_SUSPENDED", attemptCount: number }` |
| `LOGOUT`        | User-initiated logout       | `{ sessionId, sessionDuration_minutes: number }`                                                                                                          |
| `LOGOUT_ALL`    | User logged out all devices | `{ sessionCount: number }`                                                                                                                                |
| `TOKEN_REFRESH` | Successful token rotation   | `{ sessionId }`                                                                                                                                           |
| `TOKEN_INVALID` | Token validation failed     | `{ reason: "EXPIRED" \| "BLACKLISTED" \| "INVALID_SIGNATURE" }`                                                                                           |

### 10.3 MFA Events

| Event                   | Trigger               | Metadata                                                    |
| ----------------------- | --------------------- | ----------------------------------------------------------- |
| `MFA_ENABLED`           | User enables TOTP MFA | `{ method: "TOTP" }`                                        |
| `MFA_DISABLED`          | User disables MFA     | `{ method: "TOTP", disabledBy: userId }`                    |
| `MFA_CHALLENGE_SUCCESS` | MFA code verified     | `{ method: "TOTP" \| "BACKUP_CODE" }`                       |
| `MFA_CHALLENGE_FAILED`  | Invalid MFA code      | `{ method: "TOTP" \| "BACKUP_CODE", attemptCount: number }` |
| `MFA_BACKUP_CODE_USED`  | Backup code consumed  | `{ codesRemaining: number }`                                |

### 10.4 Password Events

| Event                       | Trigger                               | Metadata                          |
| --------------------------- | ------------------------------------- | --------------------------------- |
| `PASSWORD_CHANGED`          | User changes own password             | `{ changedBy: "self" }`           |
| `PASSWORD_CHANGED_BY_ADMIN` | Admin resets user's password          | `{ changedBy: adminUserId }`      |
| `PASSWORD_RESET_REQUESTED`  | Forgot password flow initiated        | `{ credential: "email" }`         |
| `PASSWORD_RESET`            | Password reset completed              | `{}`                              |
| `PASSWORD_EXPIRED`          | Password expiry enforcement triggered | `{ daysSinceLastChange: number }` |

### 10.5 User Management Events

| Event              | Trigger                     | Metadata                                                |
| ------------------ | --------------------------- | ------------------------------------------------------- |
| `USER_CREATED`     | New user created            | `{ createdBy: adminUserId, userType, initialRole }`     |
| `USER_UPDATED`     | Profile or settings changed | `{ fields: string[], changedBy: userId }`               |
| `USER_DEACTIVATED` | Account deactivated         | `{ deactivatedBy: adminUserId, reason?: string }`       |
| `USER_SUSPENDED`   | Account suspended           | `{ suspendedBy: adminUserId, reason?: string }`         |
| `USER_REACTIVATED` | Account restored            | `{ reactivatedBy: adminUserId }`                        |
| `USER_UNLOCKED`    | Locked account unlocked     | `{ unlockedBy: adminUserId \| "system_auto" }`          |
| `ACCOUNT_LOCKED`   | Automatic lockout triggered | `{ attemptCount: number, lockedUntil?: ISO_TIMESTAMP }` |

### 10.6 Role & Permission Events

| Event                | Trigger                  | Metadata                                                                   |
| -------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `ROLE_ASSIGNED`      | Role given to a user     | `{ assignedBy: adminUserId, role, scope: { ministryId?, departmentId? } }` |
| `ROLE_REMOVED`       | Role revoked from a user | `{ removedBy: adminUserId, role }`                                         |
| `PERMISSION_CHANGED` | Role permission modified | `{ changedBy: adminUserId, permission, action: "GRANTED" \| "REVOKED" }`   |

### 10.7 Session Events

| Event             | Trigger                            | Metadata                                          |
| ----------------- | ---------------------------------- | ------------------------------------------------- |
| `SESSION_CREATED` | New session on login               | `{ sessionId, device, platform }`                 |
| `SESSION_REVOKED` | Session revoked (by user or admin) | `{ sessionId, revokedBy: userId \| adminUserId }` |

---

## 11. Database Review & Schema Proposals

### 11.1 Review of Current Schema (v1 Migration)

The current Prisma schema (`packages/database/prisma/schema.prisma`) contains 13 models covering the
core communication features. The `User` model has foundational identity fields. However, the
identity platform requires additional models and fields that are not yet present.

**What the current schema has (correct):**

- `User` model with `matricule`, `email`, `passwordHash`, `role` (enum), `status` (enum),
  `mfaEnabled`, `mfaSecret`, `failedLoginCount`, `lockedUntil`
- `UserRole` enum with all 8 roles
- `UserStatus` enum with `ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`, `LOCKED`
- Basic `AuditLog` model

**What is missing and must be added:**

### 11.2 Proposed New Models

#### Model: `Role` (Custom role definitions)

The current schema uses a `UserRole` enum which is suitable for standard roles. However, to support
custom ministry-specific roles in the future, a `Role` table is needed.

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique               // e.g., "MINISTRY_ADMIN"
  displayName String                          // e.g., "Ministry Administrator"
  weight      Int                             // 0–100
  isSystem    Boolean  @default(false)        // true = cannot be deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  permissions RolePermission[]
  userRoles   UserRole[]

  @@map("roles")
}
```

#### Model: `Permission` (Fine-grained capabilities)

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique               // e.g., "USER:CREATE"
  description String
  resource    String                          // e.g., "USER"
  action      String                          // e.g., "CREATE"
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]

  @@map("permissions")
}
```

#### Model: `RolePermission` (Join: Role → Permissions)

```prisma
model RolePermission {
  id           String   @id @default(cuid())
  roleId       String
  permissionId String
  createdAt    DateTime @default(now())

  role       Role       @relation(fields: [roleId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}
```

#### Model: `UserRole` (Join: User → Role, with scope)

The current schema has `role UserRole` as a simple enum on the `User` model. This must be replaced
with a join table to support scoped roles and multiple roles per user.

```prisma
model UserRole {
  id           String    @id @default(cuid())
  userId       String
  roleId       String
  ministryId   String?   // scope: null = system-wide
  departmentId String?   // scope: null = ministry-wide
  divisionId   String?   // scope: null = department-wide
  grantedBy    String    // adminUserId who assigned this role
  grantedAt    DateTime  @default(now())
  expiresAt    DateTime?  // optional: role expires on a date

  user       User       @relation(fields: [userId], references: [id])
  role       Role       @relation(fields: [roleId], references: [id])

  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}
```

#### Model: `UserSession` (Active login sessions)

```prisma
model UserSession {
  id           String    @id @default(cuid())
  userId       String
  deviceId     String?   // links to UserDevice
  ipAddress    String
  userAgent    String
  platform     String    // "web" | "desktop" | "mobile"
  refreshToken String?   // hashed refresh token jti (for validation)
  isActive     Boolean   @default(true)
  lastUsedAt   DateTime  @default(now())
  revokedAt    DateTime?
  expiresAt    DateTime  // session hard expiry (30 days from creation)
  createdAt    DateTime  @default(now())

  user   User        @relation(fields: [userId], references: [id])
  device UserDevice? @relation(fields: [deviceId], references: [id])

  @@index([userId])
  @@index([refreshToken])
  @@map("user_sessions")
}
```

#### Model: `UserDevice` (Registered devices)

```prisma
model UserDevice {
  id          String    @id @default(cuid())
  userId      String
  name        String    // "Chrome on macOS", "Prinodia Workspace Android"
  platform    String    // "web" | "desktop" | "mobile"
  fingerprint String    // device fingerprint hash
  trusted     Boolean   @default(false)
  lastSeenAt  DateTime  @default(now())
  createdAt   DateTime  @default(now())

  user     User          @relation(fields: [userId], references: [id])
  sessions UserSession[]

  @@index([userId])
  @@unique([userId, fingerprint])
  @@map("user_devices")
}
```

#### Model: `LoginHistory` (All login attempts, success and failure)

```prisma
model LoginHistory {
  id         String   @id @default(cuid())
  userId     String?  // null if user not found (failed attempt for unknown credential)
  credential String   // the matricule or email that was used (for lookup)
  success    Boolean
  failReason String?  // "INVALID_PASSWORD" | "ACCOUNT_LOCKED" | "USER_NOT_FOUND" etc.
  ipAddress  String
  userAgent  String
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([ipAddress])
  @@index([createdAt])
  @@map("login_history")
}
```

#### Model: `PasswordResetToken`

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique   // SHA-256 hash of the raw token
  used      Boolean  @default(false)
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("password_reset_tokens")
}
```

#### Model: `PasswordHistory` (Prevent password reuse)

```prisma
model PasswordHistory {
  id           String   @id @default(cuid())
  userId       String
  passwordHash String   // bcrypt hash of old password
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("password_history")
}
```

#### Model: `MfaDevice` (Future: FIDO2/WebAuthn devices)

```prisma
model MfaDevice {
  id           String   @id @default(cuid())
  userId       String
  name         String   // "YubiKey 5C", "Touch ID on MacBook"
  type         String   // "TOTP" | "FIDO2"
  credentialId String?  // FIDO2: WebAuthn credential ID
  publicKey    String?  // FIDO2: public key (base64)
  counter      Int?     // FIDO2: signature counter
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime?

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("mfa_devices")
}
```

#### Model: `MfaBackupCode`

```prisma
model MfaBackupCode {
  id        String   @id @default(cuid())
  userId    String
  codeHash  String   // bcrypt hash of the backup code
  isUsed    Boolean  @default(false)
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("mfa_backup_codes")
}
```

### 11.3 Required Changes to Existing `User` Model

The `User` model needs these additions:

```prisma
// ADD to User model:
userType       UserType   @default(EMPLOYEE)    // see UserType enum below
displayName    String?                            // preferred display name (may differ from full name)
firstName      String
lastName       String
lockedUntil    DateTime?                          // auto-unlock after this timestamp
passwordChangedAt DateTime?                       // for expiry enforcement
lastLoginAt    DateTime?                          // for inactive account detection

// REMOVE from User model:
role           UserRole                           // replaced by UserRole join table
// (keep the enum definition for backward compat, but deprecate the field)
```

### 11.4 New Enums Required

```prisma
enum UserType {
  GOVERNMENT_EMPLOYEE
  MINISTER
  DIRECTOR
  DEPARTMENT_ADMIN
  IT_ADMINISTRATOR
  EXTERNAL_PARTNER
  GUEST
}

enum UserStatus {
  PENDING
  ACTIVE
  SUSPENDED
  LOCKED
  DEACTIVATED
  ARCHIVED
}
```

`UserStatus` already exists in the current schema — verify it has `LOCKED` and `ARCHIVED`.

---

## 12. API Design

All endpoints use the base path `/v1`. All requests require `Authorization: Bearer {accessToken}`
except the public auth endpoints marked `[PUBLIC]`.

### 12.1 Authentication Endpoints

#### `POST /v1/auth/login` `[PUBLIC]`

Authenticate with matricule/email and password.

```
Request:
{
  "credential": "1.641.558",      // matricule or government email
  "password": "Str0ng!Pass",
  "deviceFingerprint": "abc123"   // optional: for device tracking
}

Response 200 — No MFA:
{
  "accessToken": "eyJ...",
  "user": { "id", "displayName", "role", "ministryId" },
  "sessionId": "clx..."
}
// + HttpOnly cookie: refreshToken

Response 202 — MFA Required:
{
  "mfaRequired": true,
  "challengeToken": "eyJ..."      // short-lived, 5-minute TTL
}

Response 401 — INVALID_CREDENTIALS | ACCOUNT_LOCKED | ACCOUNT_SUSPENDED
Response 422 — Validation error
```

#### `POST /v1/auth/refresh` `[PUBLIC — cookie only]`

Exchange refresh token for new access + refresh tokens.

```
Request:
  // No body — refresh token comes from HttpOnly cookie automatically

Response 200:
{
  "accessToken": "eyJ..."
}
// + New HttpOnly cookie: refreshToken (rotated)

Response 401 — TOKEN_EXPIRED | TOKEN_INVALID | SESSION_REVOKED
```

#### `POST /v1/auth/logout` `[AUTHENTICATED]`

Logout from the current device.

```
Request:
  // No body required

Response 200:
{
  "message": "Logged out successfully"
}
// + Clears HttpOnly cookie
```

#### `POST /v1/auth/logout-all` `[AUTHENTICATED]`

Logout from all devices. Invalidates all sessions.

```
Response 200:
{
  "message": "Logged out from all devices",
  "revokedSessions": 3
}
```

#### `POST /v1/auth/forgot-password` `[PUBLIC]`

Initiate password reset. Always returns 200 (no user enumeration).

```
Request:
{
  "credential": "jean.mbeki@finances.gouv.cd"
}

Response 200:
{
  "message": "If an account exists with that credential, a reset link has been sent."
}
```

#### `POST /v1/auth/reset-password` `[PUBLIC]`

Complete password reset with token from email.

```
Request:
{
  "token": "a3f9b2c1...",    // 64-char hex token from email link
  "newPassword": "NewStr0ng!Pass"
}

Response 200:
{
  "message": "Password reset successful. Please log in."
}

Response 400 — TOKEN_INVALID_OR_EXPIRED | PASSWORD_POLICY_VIOLATION | PASSWORD_HISTORY_VIOLATION
```

#### `POST /v1/auth/mfa/setup` `[AUTHENTICATED]`

Begin MFA setup — returns secret and QR code.

```
Response 200:
{
  "secret": "JBSWY3DPEHPK3PXP",    // Base32 secret
  "qrCode": "data:image/png;base64,...",
  "otpauthUri": "otpauth://totp/Prinodia Workspace:jean.mbeki@finances.gouv.cd?secret=..."
}
```

#### `POST /v1/auth/mfa/verify-setup` `[AUTHENTICATED]`

Confirm MFA setup with first code. Returns backup codes.

```
Request:
{
  "code": "123456"
}

Response 200:
{
  "backupCodes": ["A3K9M-7BZ2Q", "B4L0N-8CA3R", ...],   // 8 codes — shown ONCE
  "message": "MFA enabled. Save your backup codes."
}

Response 400 — INVALID_CODE
```

#### `POST /v1/auth/mfa/verify` `[PUBLIC — challenge token required]`

Complete MFA challenge during login.

```
Request:
{
  "challengeToken": "eyJ...",
  "code": "123456"          // TOTP code
  // OR
  "backupCode": "A3K9M-7BZ2Q"
}

Response 200:
{
  "accessToken": "eyJ...",
  "user": { ... },
  "sessionId": "clx..."
}
// + HttpOnly cookie: refreshToken

Response 401 — INVALID_CODE | CHALLENGE_EXPIRED
```

#### `GET /v1/auth/me` `[AUTHENTICATED]`

Get the authenticated user's profile and resolved permissions.

```
Response 200:
{
  "id": "clx...",
  "displayName": "Jean Mbeki",
  "email": "jean.mbeki@finances.gouv.cd",
  "matricule": "1.641.558",
  "userType": "GOVERNMENT_EMPLOYEE",
  "status": "ACTIVE",
  "roles": [{ "role": "MINISTRY_ADMIN", "ministryId": "clx...", "weight": 70 }],
  "permissions": ["USER:CREATE", "CHANNEL:CREATE_PUBLIC", ...],
  "mfaEnabled": true,
  "avatarUrl": null
}
```

### 12.2 User Management Endpoints

#### `GET /v1/users` `[AUTHENTICATED — USER:READ_MINISTRY or higher]`

List users. Results scoped to the requester's organizational scope.

```
Query params:
  page, limit       Pagination (offset-based for admin lists)
  status            Filter by UserStatus
  role              Filter by role
  ministryId        Filter by ministry (requires GOVERNMENT_ADMIN+)
  search            Full-text search on name, email, matricule

Response 200:
{
  "data": [{ user objects }],
  "meta": { "total": 245, "page": 1, "limit": 25 }
}
```

#### `POST /v1/users` `[AUTHENTICATED — USER:CREATE]`

Create a new user. Admin-only — no self-registration.

```
Request:
{
  "firstName": "Jean",
  "lastName": "Mbeki",
  "email": "jean.mbeki@finances.gouv.cd",
  "matricule": "1.641.558",
  "userType": "GOVERNMENT_EMPLOYEE",
  "ministryId": "clx...",
  "departmentId": "clx...",
  "initialRole": "EMPLOYEE",
  "language": "fr"
}

Response 201:
{
  "id": "clx...",
  "status": "PENDING",
  "temporaryPassword": "Tmp!Pass123"    // shown ONCE — user must change on first login
}
```

#### `PATCH /v1/users/:id/status` `[AUTHENTICATED — USER:DEACTIVATE or USER:UNLOCK]`

Change a user's status.

```
Request:
{
  "status": "SUSPENDED" | "ACTIVE" | "DEACTIVATED",
  "reason": "Disciplinary suspension pending investigation"
}

Response 200:
{
  "id": "clx...",
  "status": "SUSPENDED"
}
```

### 12.3 Role & Permission Endpoints

#### `POST /v1/roles` `[AUTHENTICATED — ADMIN:MANAGE_ROLES]`

Create a custom role.

```
Request:
{
  "name": "MINISTRY_AUDITOR",
  "displayName": "Ministry Auditor",
  "weight": 35,
  "permissions": ["ADMIN:VIEW_AUDIT_LOGS_MINISTRY", "CHANNEL:READ_MEMBER"]
}

Response 201:
{ "id": "clx...", "name": "MINISTRY_AUDITOR", ... }
```

#### `POST /v1/permissions` `[AUTHENTICATED — SUPER_ADMIN only]`

Register a new system permission.

```
Request:
{
  "key": "REPORT:GENERATE",
  "description": "Can generate ministry reports",
  "resource": "REPORT",
  "action": "GENERATE"
}
```

#### `POST /v1/users/:id/roles` `[AUTHENTICATED — USER:UPDATE_ROLE]`

Assign a role to a user with scope.

```
Request:
{
  "roleId": "clx...",
  "ministryId": "clx...",    // scope
  "departmentId": null,
  "expiresAt": null
}

Response 200:
{ "id": "clx...", "userId", "roleId", "scope": {...} }
```

---

## 13. Security Risks & Mitigations

### Risk 1: Stolen Access Token

**Threat:** An attacker intercepts or extracts a valid access token and uses it to impersonate the
user.

**Mitigations:**

- Access token TTL is 15 minutes — short enough to limit damage
- Token is stored in memory only — cannot be extracted by XSS
- JTI (token ID) in Redis blacklist enables immediate revocation
- Anomaly detection: if a token is used from a different IP than the one that created the session,
  flag for review

### Risk 2: Stolen Refresh Token

**Threat:** An attacker extracts the refresh token from the cookie and uses it to generate unlimited
access tokens.

**Mitigations:**

- HttpOnly + Secure + SameSite=Strict cookie prevents XSS and CSRF access
- Token family tracking: reuse of an already-rotated token triggers immediate session termination
- Refresh tokens can be revoked via "Logout all devices"
- Refresh cookie path is `/auth/refresh` only — not sent on every request

### Risk 3: Weak Passwords

**Threat:** Users choose easily guessable passwords. An attacker guesses or brute-forces them.

**Mitigations:**

- 12-character minimum with complexity requirements
- Common password blocklist (100,000 entries)
- HaveIBeenPwned breach check
- Account lockout after 5 failed attempts
- Mandatory expiry for privileged roles (90 days)
- bcrypt cost 12 — makes offline brute force computationally expensive

### Risk 4: Shared Accounts

**Threat:** Two civil servants share one account, destroying accountability and audit trail
integrity.

**Mitigations:**

- Matricule is unique per civil servant by government assignment — the system enforces uniqueness
- Audit logs capture IP, user agent, and session ID per action — anomalous concurrent access is
  detectable
- Device tracking flags when an account is used from a new, unrecognized device
- Account sharing is a disciplinary matter covered in the platform's Terms of Use
- MFA enforcement for privileged roles — sharing the account means sharing the TOTP device, which is
  impractical

### Risk 5: Privilege Escalation

**Threat:** A user assigns themselves or another user a higher role than authorized. Or exploits a
bug to bypass scope restrictions.

**Mitigations:**

- `USER:UPDATE_ROLE` permission is required to assign roles
- Scope restriction: a MINISTRY_ADMIN can only assign roles up to `DEPARTMENT_ADMIN` within their
  ministry (cannot create MINISTRY_ADMIN or higher)
- All role assignments are audit-logged with the granting admin's ID
- RBAC checks are enforced at the API service layer — not only the controller
- Unit tests cover all RBAC boundary conditions

### Risk 6: Unauthorized File Access

**Threat:** A user constructs a direct URL to a file in MinIO and downloads it without
authorization.

**Mitigations:**

- MinIO files are not publicly accessible — bucket policies deny all public read
- Every download requires a pre-signed URL generated by the API
- The API verifies the requesting user's channel membership before generating the URL
- Pre-signed URLs expire in 5 minutes
- Every download is audit-logged

### Risk 7: Brute Force Attacks

**Threat:** An automated attacker submits thousands of login attempts against a user's account.

**Mitigations:**

- Account lockout after 5 failures
- IP-level rate limiting (100 requests/minute per IP on all `/auth/*` endpoints)
- Global rate limiting on the login endpoint (BullMQ rate limiter)
- CAPTCHA integration (optional) for accounts with repeated lockout history

### Risk 8: Insider Threat

**Threat:** A civil servant with legitimate access misuses it — exfiltrates data, reads unauthorized
channels, covers tracks.

**Mitigations:**

- Audit logs are immutable — the application user cannot DELETE or UPDATE audit records
- Audit log access requires `ADMIN:VIEW_AUDIT_LOGS_MINISTRY` or higher
- Audit logs exported to WORM storage for long-term retention
- Anomaly detection (future): alert on unusual access patterns (off-hours, bulk file downloads)
- Least privilege: employees only have access to channels they are explicitly added to
- All file downloads are logged with user identity and timestamp

### Risk 9: Session Fixation

**Threat:** An attacker sets a known session token before login, then after the user logs in, uses
the pre-set token.

**Mitigation:**

- A new session ID is always generated on successful login
- There is no mechanism to pre-set or predict session IDs (CUIDs are cryptographically random)

### Risk 10: JWT Algorithm Confusion

**Threat:** An attacker sends a JWT with `alg: "none"` or switches from RS256 to HS256.

**Mitigation:**

- The API uses `jsonwebtoken` with `algorithms: ["RS256"]` explicitly specified
- Any token with a different algorithm is rejected at validation time

---

## 14. Implementation Plan

The Identity Platform is implemented in the following sequence. Each task must be completed and
reviewed before the next begins.

### Task 1: Prisma Schema Update

**Goal:** Add all new identity models to the schema and create the migration.

**Scope:**

- Add `Role`, `Permission`, `RolePermission` models
- Add `UserRole` join table (replace enum field on User)
- Add `UserSession`, `UserDevice`, `LoginHistory` models
- Add `PasswordResetToken`, `PasswordHistory` models
- Add `MfaDevice`, `MfaBackupCode` models
- Add `userType`, `firstName`, `lastName`, `displayName`, `lockedUntil`, `passwordChangedAt`,
  `lastLoginAt` to User
- Add `UserType` enum
- Verify `UserStatus` has all 6 statuses
- Run `prisma migrate dev --name add_identity_platform`
- Seed default roles and permissions

**Output:** Updated schema file, migration file, seed data script.

### Task 2: Auth Module (NestJS)

**Goal:** Implement the authentication service and routes.

**Scope:**

- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.service.ts` — login, refresh, logout, token generation
- `apps/api/src/auth/auth.controller.ts` — POST /auth/login, /auth/refresh, /auth/logout,
  /auth/logout-all
- `apps/api/src/auth/strategies/jwt.strategy.ts` — validates access tokens
- `apps/api/src/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/decorators/public.decorator.ts`
- Unit tests: auth.service.spec.ts

**Output:** Working login flow returning JWT access token + refresh token cookie.

### Task 3: User Module (NestJS)

**Goal:** User CRUD for administrators.

**Scope:**

- `apps/api/src/users/users.module.ts`
- `apps/api/src/users/users.service.ts` — findById, create, updateStatus, list with pagination and
  filters
- `apps/api/src/users/users.controller.ts` — GET /users, POST /users, PATCH /users/:id/status, GET
  /auth/me
- DTOs: `create-user.dto.ts`, `update-user-status.dto.ts`
- Response transformers: strip passwordHash, mfaSecret from all responses
- Unit tests: users.service.spec.ts

**Output:** Admin can create and manage users via API.

### Task 4: Role Module (NestJS)

**Goal:** Manage roles and assign them to users with scope.

**Scope:**

- `apps/api/src/roles/roles.module.ts`
- `apps/api/src/roles/roles.service.ts` — findAll, create, assignToUser, revokeFromUser
- `apps/api/src/roles/roles.controller.ts` — GET /roles, POST /roles, POST /users/:id/roles
- Seeder: insert the 8 default system roles with their permission sets
- Unit tests

**Output:** RBAC role assignment works end-to-end.

### Task 5: Permission Module (NestJS)

**Goal:** Register permissions and attach them to roles.

**Scope:**

- `apps/api/src/permissions/permissions.module.ts`
- `apps/api/src/permissions/permissions.service.ts` — resolvePermissionsForUser(userId)
- Permission seeder: insert all permissions defined in Section 5.3
- `resolvePermissionsForUser` called on every authenticated request to populate the request context
- Unit tests: all RBAC boundary conditions tested

**Output:** Permissions are enforced. Every API route checks the correct permission.

### Task 6: Session Module (NestJS)

**Goal:** Device-aware session tracking and revocation.

**Scope:**

- `apps/api/src/sessions/sessions.module.ts`
- `apps/api/src/sessions/sessions.service.ts` — create, list, revoke, revokeAll, cleanup
- `apps/api/src/sessions/sessions.controller.ts` — GET /sessions, DELETE /sessions/:id, DELETE
  /sessions (all)
- Redis integration for token blacklisting
- Scheduled job: invalidate sessions with `lastUsedAt > 30 days`
- Unit tests

**Output:** Users can see and revoke their active sessions.

### Task 7: MFA Scaffolding

**Goal:** TOTP MFA with backup codes.

**Scope:**

- `apps/api/src/auth/mfa/mfa.service.ts` — generateSecret, verifySetup, verifyCode,
  generateBackupCodes, verifyBackupCode
- `apps/api/src/auth/mfa/mfa.controller.ts` — POST /auth/mfa/setup, /auth/mfa/verify-setup,
  /auth/mfa/verify
- MFA enforcement guard: checks mfaEnabled for roles that require it
- MFA challenge token logic (short-lived JWT, 5-minute TTL)
- Encryption of TOTP secret with AES-256-GCM
- Unit tests: mfa.service.spec.ts

**Output:** Users can enable TOTP MFA and use it during login.

### Task 8: Audit Logging

**Goal:** Immutable, comprehensive audit trail for all identity events.

**Scope:**

- `apps/api/src/audit/audit.service.ts` — log(event) method, async BullMQ queue
- BullMQ queue: audit-log-queue (write to DB asynchronously to avoid blocking request)
- `apps/api/src/audit/audit.controller.ts` — GET /audit-logs (with filters, pagination)
- Interceptor: auto-log all mutating requests
- Unit tests: verify each audit event is logged with correct metadata

**Output:** All identity events produce immutable audit log entries.

### Task 9: Frontend Login Pages (Next.js)

**Goal:** Login, MFA verification, password reset, and first-login password change screens.

**Scope:**

- `apps/web/src/app/(auth)/login/page.tsx` — Matricule or email + password form
- `apps/web/src/app/(auth)/mfa/page.tsx` — TOTP code input + backup code option
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — Credential input
- `apps/web/src/app/(auth)/reset-password/page.tsx` — New password form
- `apps/web/src/app/(auth)/change-password/page.tsx` — Forced password change (first login)
- `useAuth` hook: wraps API calls, manages access token in memory
- Auth middleware: redirects unauthenticated requests to /login

**Output:** A working, styled login flow in the web app.

### Task 10: Admin User Management UI (Next.js)

**Goal:** Admin panel screens for managing users, roles, and viewing audit logs.

**Scope:**

- `apps/web/src/app/(dashboard)/admin/users/page.tsx` — Paginated user list with filters
- `apps/web/src/app/(dashboard)/admin/users/[id]/page.tsx` — User detail: status, roles, sessions,
  audit history
- `apps/web/src/app/(dashboard)/admin/users/new/page.tsx` — Create user form
- `apps/web/src/app/(dashboard)/admin/audit/page.tsx` — Audit log viewer with date range + event
  type filters
- Role-based route protection: redirect non-admins away from /admin/\*

**Output:** Administrators can manage the full user lifecycle from the web interface.
