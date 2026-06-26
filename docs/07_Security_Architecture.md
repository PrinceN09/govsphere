# Prinodia Workspace — Security Architecture

**Document Version:** 1.0  
**Status:** Approved  
**Classification:** CONFIDENTIAL — Internal Engineering  
**Last Updated:** 2026-06-24

---

## 1. Security Philosophy

Prinodia Workspace protects **state secrets**. The threat model is not an individual hacker — it is
nation-state actors, corporate espionage, insider threats, and the systemic risk of government
communication being exposed. The security architecture is designed accordingly:

- **Zero Trust** — no implicit trust based on network location. Every request is authenticated and
  authorized.
- **Defense in Depth** — multiple independent security layers. Compromise of one layer does not
  compromise the system.
- **Least Privilege** — every user, service, and process has the minimum permissions required.
- **Audit Everything** — every action that changes state is recorded immutably.
- **Fail Secure** — when in doubt, deny. Errors default to access denied, not access granted.

---

## 2. Authentication Architecture

### 2.1 Identity Providers

Prinodia Workspace supports three authentication paths:

| Path                        | Users                  | Method                          |
| --------------------------- | ---------------------- | ------------------------------- |
| Matricule + Password        | All civil servants     | Internal                        |
| Government Email + Password | All civil servants     | Internal                        |
| Google / Microsoft OAuth    | External partners only | Invitation-only, admin-approved |

**External OAuth Rule:** External provider login is never available by default. An administrator
must explicitly invite an external user, approve their access, and assign them the GUEST role.
External users cannot escalate beyond GUEST without admin action.

### 2.2 Login Flow

```
1. Client submits credential + password
2. API validates credential format (matricule regex or email regex)
3. API looks up user by matricule OR email
4. API checks: user exists, status is ACTIVE, account is not locked
5. API compares password with bcrypt hash (cost factor 12)
6. If invalid: increment failedLoginCount, check lockout threshold
7. If valid: check MFA requirement
   a. MFA not enabled → issue access + refresh tokens
   b. MFA enabled → issue short-lived MFA token, prompt for code
8. On MFA success → issue access + refresh tokens
9. Create UserSession record with device info
10. Write AUDIT LOG: LOGIN event
```

### 2.3 Account Lockout Policy

| Event                                | Action                                          |
| ------------------------------------ | ----------------------------------------------- |
| 5 consecutive failed login attempts  | Lock account for 30 minutes                     |
| 10 consecutive failed login attempts | Lock account until admin unlock                 |
| Lockout expires                      | `lockedUntil` passes, failedLoginCount resets   |
| Successful login                     | `failedLoginCount` resets to 0                  |
| Admin unlock                         | `lockedUntil` cleared, `failedLoginCount` reset |

### 2.4 Password Policy

| Rule                  | Requirement                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| Minimum length        | 12 characters                                                                |
| Maximum length        | 128 characters                                                               |
| Complexity            | At least 1 uppercase, 1 lowercase, 1 number, 1 special character             |
| Common password check | Rejected against list of 100,000 common passwords                            |
| Breach check          | Optional: HaveIBeenPwned API (k-anonymity model — password never sent)       |
| History               | Cannot reuse last 10 passwords                                               |
| Expiry                | 90 days for privileged roles (SUPER_ADMIN, GOVERNMENT_ADMIN, MINISTRY_ADMIN) |
| Hashing               | bcrypt with cost factor 12 (upgrade to Argon2id in v1.0)                     |

### 2.5 Password Reset Flow

```
1. User requests reset via email
2. API generates cryptographically random 32-byte token (hex encoded)
3. Token hashed with SHA-256 before storage in DB
4. Email sent with reset link containing unhashed token (HTTPS only)
5. Token expires in 1 hour
6. User clicks link → API hashes received token → compares with stored hash
7. On match: allow password change, invalidate token, invalidate ALL sessions
8. Write AUDIT LOG: PASSWORD_RESET event
```

---

## 3. Token Architecture

### 3.1 Access Token (JWT — RS256)

```
Algorithm: RS256 (asymmetric — private key signs, public key verifies)
TTL:       15 minutes
Storage:   Memory only (never localStorage, never cookie)

Payload:
{
  "sub":        "userId",
  "jti":        "unique-token-id",    ← for blacklisting
  "role":       "MINISTRY_ADMIN",
  "ministryId": "clx...",
  "sessionId":  "clx...",
  "iat":        1719216600,
  "exp":        1719217500
}
```

**Why RS256:** Asymmetric signing allows the frontend and any future microservice to verify tokens
using only the public key — without access to the private key. The private key never leaves the API
server.

**Why memory-only storage:** localStorage is accessible to any JavaScript on the page (XSS risk).
Cookies require careful SameSite/HttpOnly configuration. Memory storage is cleared on tab close,
limiting token lifetime exposure.

### 3.2 Refresh Token (JWT — RS256)

```
Algorithm: RS256
TTL:       7 days (configurable)
Storage:   HttpOnly, Secure, SameSite=Strict cookie
Rotation:  New refresh token issued on every use (old one invalidated)

Payload:
{
  "sub":       "userId",
  "jti":       "unique-token-id",
  "sessionId": "clx...",
  "iat":       1719216600,
  "exp":       1719820800
}
```

**Why HttpOnly cookie:** HttpOnly cookies cannot be accessed by JavaScript (XSS-proof).
`SameSite=Strict` prevents CSRF attacks. `Secure` ensures HTTPS-only transmission.

**Why rotation:** If a refresh token is stolen, the attacker can only use it once before it is
invalidated. The legitimate user's next refresh will fail (token already rotated), alerting them to
potential compromise.

### 3.3 Token Blacklist

Access tokens cannot be invalidated before expiry (stateless by design). To enable immediate
revocation (logout, session termination, account suspension):

```
Redis key: blacklist:{jti}
Value:     "1"
TTL:       Remaining time until token expiry

On every authenticated request:
  → Check Redis for blacklist:{jti}
  → If exists: reject with 401 TOKEN_INVALID
  → If not exists: proceed
```

The Redis blacklist adds ~1ms to every authenticated request — acceptable for a security-critical
system.

---

## 4. Multi-Factor Authentication

### 4.1 TOTP (Time-Based One-Time Password)

```
Standard:    RFC 6238
Algorithm:   HMAC-SHA1
Period:      30 seconds
Digits:      6
Tolerance:   1 period (accepts codes from ±30 seconds for clock skew)
Library:     otplib (Node.js)
```

**Setup Flow:**

```
1. User initiates MFA setup (POST /v1/auth/mfa/setup)
2. API generates 160-bit random secret
3. API returns: secret (base32), otpauth:// URI, QR code data
4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. User submits first code (POST /v1/auth/mfa/confirm)
6. API verifies code is valid
7. API stores encrypted secret in DB (User.mfaSecret)
8. API generates 8 backup codes, hashes them, stores in DB
9. API returns backup codes ONCE (never shown again)
10. Write AUDIT LOG: MFA_ENABLED event
```

**MFA Secret Storage:** The TOTP secret is encrypted at rest using AES-256-GCM with a key derived
from the server's `MFA_ENCRYPTION_KEY` environment variable. The encryption key must never be stored
in the database.

### 4.2 Backup Codes

- 8 single-use backup codes generated at MFA setup
- Each code: 10 characters (2 groups of 5, alphanumeric, e.g. `ABCDE-12345`)
- Hashed with bcrypt before storage (not plaintext)
- Each code can be used exactly once
- Used backup codes are marked invalid, not deleted (audit trail)

### 4.3 Future: FIDO2 / WebAuthn (v1.0)

Hardware security keys (YubiKey) and platform authenticators (Windows Hello, Touch ID) will be
supported via the WebAuthn API for the highest-security accounts.

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Role Hierarchy

```
SUPER_ADMIN        (100)  — Full system access, cross-ministry
    │
GOVERNMENT_ADMIN   (90)   — All ministries, cannot modify Super Admin
    │
MINISTRY_ADMIN     (70)   — Full access within their ministry
    │
DEPARTMENT_ADMIN   (50)   — Full access within their department
    │
DIVISION_ADMIN     (40)   — Full access within their division
    │
TEAM_MANAGER       (30)   — Manage team members and their channels
    │
EMPLOYEE           (10)   — Access to assigned channels
    │
GUEST              (0)    — Read-only access to invited channels
```

### 5.2 Permission Matrix

| Action                     | SUPER | GOV | MIN | DEPT | DIV | TEAM | EMP | GUEST |
| -------------------------- | :---: | :-: | :-: | :--: | :-: | :--: | :-: | :---: |
| Manage users (system)      |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| Manage users (ministry)    |  ✅   | ✅  | ✅  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| Create channels            |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ❌  |  ❌   |
| Send messages              |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| Upload files               |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| Delete any message         |  ✅   | ✅  | ✅  |  ✅  | ❌  |  ❌  | ❌  |  ❌   |
| Delete own message         |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ❌   |
| View audit logs (ministry) |  ✅   | ✅  | ✅  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| View audit logs (system)   |  ✅   | ✅  | ❌  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| Invite external partners   |  ✅   | ✅  | ✅  |  ❌  | ❌  |  ❌  | ❌  |  ❌   |
| Archive channels           |  ✅   | ✅  | ✅  |  ✅  | ❌  |  ❌  | ❌  |  ❌   |
| Read channel (member)      |  ✅   | ✅  | ✅  |  ✅  | ✅  |  ✅  | ✅  |  ✅   |

### 5.3 Resource Scoping

Access is scoped by organizational unit. A `MINISTRY_ADMIN` for the Ministry of Finance cannot
access the Ministry of Defense's channels even though they share the same role level.

```typescript
// Scoping rules applied on every data access:
canAccessResource(user, resource) {
  // 1. Super/Gov admins bypass all scoping
  if (role >= GOVERNMENT_ADMIN) return true;

  // 2. Ministry scope: user must be in the same ministry
  if (resource.ministryId && user.ministryId !== resource.ministryId) return false;

  // 3. Department scope: user must be in the same department
  //    Exception: Ministry admins can cross departments within their ministry
  if (resource.departmentId && user.departmentId !== resource.departmentId) {
    if (role >= MINISTRY_ADMIN) return true;  // Can cross departments
    return false;
  }

  // 4. Owner always has access to their own resources
  if (resource.ownerId === user.id) return true;

  return true;
}
```

---

## 6. Session Management

### 6.1 Session Lifecycle

```
Login → Create UserSession
     → Store sessionId in both tokens
     → Track device info (user agent, IP, platform)

Each request → Validate token
            → Check session is still active
            → Update session.lastUsedAt

Logout → Set session.isActive = false
       → Set session.revokedAt
       → Blacklist access token (JTI in Redis)
       → Delete refresh token cookie

Idle timeout (30 days) → Session marked expired
                       → Next token refresh fails
                       → User redirected to login

Admin revoke → Set session.isActive = false
             → Blacklist any active access token for that session
```

### 6.2 Multi-Device Sessions

Users can have simultaneous active sessions across Web, Desktop, and Mobile. Each session is
independent. Logging out from one device does not affect others unless "Logout all devices" is
explicitly triggered.

Users can view and revoke individual sessions from their security settings page:

```
Active Sessions:
  ✅ Web — Chrome on macOS — 192.168.1.100 — Now (current)
  ✅ Mobile — Prinodia Workspace Android — 192.168.1.105 — 2 hours ago
  ✅ Desktop — Prinodia Workspace Desktop Windows — 10.0.0.55 — Yesterday
  [Revoke] [Revoke] [Revoke]
  [Revoke All Other Sessions]
```

---

## 7. Encryption

### 7.1 Data in Transit

- **All HTTP traffic:** TLS 1.3 (TLS 1.2 as fallback minimum)
- **WebSocket connections:** WSS (WebSocket Secure over TLS 1.3)
- **MinIO internal traffic:** TLS enabled
- **Database connections:** TLS required (`sslmode=require`)
- **Redis connections:** TLS with auth (`requirepass`)
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### 7.2 Data at Rest

| Data            | Encryption                                                 | Key Management               |
| --------------- | ---------------------------------------------------------- | ---------------------------- |
| PostgreSQL      | AES-256 (disk-level via OS/cloud)                          | Server key                   |
| MinIO files     | AES-256 server-side encryption                             | Per-bucket key               |
| Redis           | Memory encryption (Redis Enterprise) or OS disk encryption | Server key                   |
| MFA secrets     | AES-256-GCM at application level                           | `MFA_ENCRYPTION_KEY` env var |
| JWT private key | Stored only in env var / secrets manager                   | Never in DB                  |
| Backup files    | AES-256 encrypted before transmission                      | Separate backup key          |

### 7.3 Sensitive Field Handling

| Field                      | Treatment                                                   |
| -------------------------- | ----------------------------------------------------------- |
| `User.passwordHash`        | bcrypt hash — never returned in API response                |
| `User.mfaSecret`           | AES-256-GCM encrypted — never returned in API response      |
| `User.mfaBackupCodes`      | bcrypt hashed array — one-time display only, then hash-only |
| `UserSession.refreshToken` | Hashed before DB storage (full token only in cookie)        |
| JWT private key            | Environment variable only, never in codebase or DB          |

---

## 8. Security Headers

Applied by NGINX to all responses:

```nginx
# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions policy (disable unused APIs)
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Content Security Policy
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' wss://api.govsphere.gouv.cd;
  media-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'self';
" always;

# Remove server identification
server_tokens off;
```

---

## 9. Audit Logging

### 9.1 Audit Events

Every audit log entry includes: `userId`, `action`, `entityType`, `entityId`, `metadata`,
`ipAddress`, `userAgent`, `createdAt`.

**Authentication Events:**

- `LOGIN` — successful login
- `LOGIN_FAILED` — failed login attempt
- `LOGOUT` — user logged out
- `MFA_ENABLED` / `MFA_DISABLED`
- `PASSWORD_CHANGED` / `PASSWORD_RESET`
- `ACCOUNT_LOCKED` / `ACCOUNT_UNLOCKED`
- `SESSION_REVOKED`

**User Management Events:**

- `USER_CREATED` / `USER_UPDATED` / `USER_DEACTIVATED`
- `ROLE_CHANGED` — role reassignment

**Content Events:**

- `MESSAGE_SENT` / `MESSAGE_EDITED` / `MESSAGE_DELETED`
- `FILE_UPLOADED` / `FILE_DOWNLOADED` / `FILE_DELETED`
- `CHANNEL_CREATED` / `CHANNEL_ARCHIVED`

**Administrative Events:**

- `ADMIN_ACTION` — bulk operations, system settings changes
- `INVITATION_SENT` — external partner invited

### 9.2 Immutability

Audit logs are **write-once, append-only**. No API endpoint or admin interface provides the ability
to modify or delete audit log entries. The PostgreSQL user used by the application is granted only
`INSERT` and `SELECT` on the `audit_logs` table — `UPDATE` and `DELETE` are never granted.

For long-term immutability, audit logs older than 30 days should be exported to WORM (Write Once
Read Many) storage.

### 9.3 Sensitive Data in Audit Logs

Audit logs NEVER contain:

- Passwords or password hashes
- JWT tokens
- MFA secrets
- Message content (only message ID and channel ID)
- File content (only file ID and metadata)
- PII beyond what's needed for the audit context

---

## 10. File Security

### 10.1 Upload Security

```
1. Client requests pre-signed URL (authenticated API call)
2. API validates: user has permission to upload to this channel
3. API validates: file type is in the allowed list
4. API validates: file size is within limit
5. Pre-signed URL is generated with 15-minute expiry
6. Client uploads directly to MinIO
7. Client calls API to confirm upload
8. API triggers virus scan via BullMQ queue
9. File is marked PENDING until scan completes
10. ClamAV scans the file
11. If clean: file status → READY, users can now access it
12. If infected: file status → REJECTED, file deleted from MinIO, admin alerted
```

### 10.2 Download Security

- Files are never served directly from MinIO to clients
- The API generates a pre-signed download URL with a 5-minute expiry
- The download URL is specific to the file and the requesting user
- Each download is logged in the audit trail
- Expired URLs cannot be used (MinIO enforces expiry)

### 10.3 Allowed File Types

```
Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp, txt, csv, rtf
Images:    jpg, jpeg, png, gif, webp, svg, bmp, tiff
Video:     mp4, mov, avi, mkv, webm (max 500MB)
Audio:     mp3, wav, ogg, m4a (max 100MB)
Archives:  zip, rar, 7z, tar, gz (scanned before access)
```

**Blocked:** `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.js` (standalone), `.msi`, `.dmg`

---

## 11. Future Government Compliance

### 11.1 DRC Data Protection

Prinodia Workspace is designed to comply with future DRC data protection legislation and to meet the
requirements of any government data classification framework:

- All data is stored within the DRC or in government-approved facilities
- User PII is treated as sensitive data
- Data retention policies are configurable per data type
- Data export capabilities for individual users (right to portability)

### 11.2 ISO 27001 Alignment

The security architecture aligns with ISO/IEC 27001 controls:

| Control Domain      | Implementation                                            |
| ------------------- | --------------------------------------------------------- |
| Access Control      | RBAC, MFA, session management                             |
| Cryptography        | TLS 1.3, AES-256, bcrypt, RS256                           |
| Physical Security   | Government data center (deployment requirement)           |
| Operations Security | Audit logging, change management, backups                 |
| Incident Management | Alert system, security event logging, response procedures |
| Business Continuity | Multi-server deployment, backup/restore, RTO/RPO targets  |

### 11.3 Penetration Testing Requirements

- Annual third-party penetration test before each major release
- OWASP Top 10 must be verified clean at each release
- Automated SAST (Static Application Security Testing) in CI pipeline
- Automated dependency vulnerability scanning (weekly)
