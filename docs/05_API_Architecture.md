# Prinodia Workspace — API Architecture

**Document Version:** 1.0  
**Status:** Approved  
**Classification:** Internal Engineering  
**Last Updated:** 2026-06-24

---

## 1. API Design Philosophy

The Prinodia Workspace API follows **REST principles with pragmatic extensions**. The API is:

- **Versioned** — breaking changes are never made to existing versions
- **Consistent** — every endpoint follows the same patterns for pagination, filtering, errors, and
  responses
- **Documented** — every endpoint is documented in OpenAPI/Swagger, auto-generated from NestJS
  decorators
- **Secure** — every endpoint requires authentication; access is enforced by role guards
- **Typed** — all request and response shapes are TypeScript-typed DTOs with class-validator
  decorators

---

## 2. REST Standards

### 2.1 URL Structure

```
Base URL:      https://api.govsphere.gouv.cd
Version prefix: /v1
Full URL:      https://api.govsphere.gouv.cd/v1/{resource}
```

### 2.2 Resource Naming

| Convention                               | Example                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Plural nouns for collections             | `/v1/users`, `/v1/channels`                                                            |
| Kebab-case for multi-word resources      | `/v1/refresh-tokens`, `/v1/audit-logs`                                                 |
| Nested resources for owned sub-resources | `/v1/channels/{channelId}/messages`                                                    |
| Avoid deep nesting (max 2 levels)        | `/v1/messages/{messageId}/reactions` (not `/v1/channels/{id}/messages/{id}/reactions`) |
| Actions as POST sub-routes               | `/v1/messages/{messageId}/reactions` POST, not `/v1/messages/{messageId}/add-reaction` |

### 2.3 HTTP Methods

| Method   | Usage                          | Idempotent |
| -------- | ------------------------------ | ---------- |
| `GET`    | Read a resource or collection  | Yes        |
| `POST`   | Create a new resource          | No         |
| `PUT`    | Full replacement of a resource | Yes        |
| `PATCH`  | Partial update of a resource   | Yes        |
| `DELETE` | Soft-delete a resource         | Yes        |

**Rule:** `PATCH` is preferred over `PUT` for updates. `PUT` is reserved for full-document
replacements (e.g. replacing a channel's settings object entirely).

### 2.4 HTTP Status Codes

| Code                        | Usage                                           |
| --------------------------- | ----------------------------------------------- |
| `200 OK`                    | Successful GET, PATCH, PUT                      |
| `201 Created`               | Successful POST (resource created)              |
| `204 No Content`            | Successful DELETE (no body)                     |
| `400 Bad Request`           | Validation error (malformed request)            |
| `401 Unauthorized`          | Missing or invalid authentication token         |
| `403 Forbidden`             | Authenticated but insufficient permissions      |
| `404 Not Found`             | Resource does not exist (or is soft-deleted)    |
| `409 Conflict`              | Uniqueness conflict (e.g. email already exists) |
| `422 Unprocessable Entity`  | Request is valid but business logic rejects it  |
| `429 Too Many Requests`     | Rate limit exceeded                             |
| `500 Internal Server Error` | Unhandled server error                          |
| `503 Service Unavailable`   | Maintenance mode or dependency unavailable      |

---

## 3. Standard Response Format

### 3.1 Success Response

All successful responses are wrapped in a standard envelope:

```typescript
// Single resource
{
  "success": true,
  "data": {
    "id": "clx1234...",
    "email": "minister@finances.gouv.cd",
    "displayName": "Jean-Baptiste Kabila",
    // ...
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-24T08:30:00.000Z"
  }
}

// Collection (paginated)
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-24T08:30:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1243,
      "totalPages": 25,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextCursor": "clx9999..."
    }
  }
}
```

### 3.2 Error Response

All errors follow a consistent structure:

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address",
        "value": "not-an-email"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-24T08:30:00.000Z"
  }
}
```

### 3.3 Error Codes

| Code                      | HTTP Status | Description                               |
| ------------------------- | ----------- | ----------------------------------------- |
| `VALIDATION_ERROR`        | 400         | One or more fields failed validation      |
| `INVALID_CREDENTIALS`     | 401         | Wrong email/password                      |
| `TOKEN_EXPIRED`           | 401         | Access token has expired                  |
| `TOKEN_INVALID`           | 401         | Token is malformed or blacklisted         |
| `MFA_REQUIRED`            | 401         | Valid credentials but MFA code needed     |
| `MFA_INVALID`             | 401         | MFA code is incorrect                     |
| `ACCOUNT_LOCKED`          | 401         | Account locked after failed attempts      |
| `FORBIDDEN`               | 403         | Insufficient role or permission           |
| `NOT_FOUND`               | 404         | Resource does not exist                   |
| `ALREADY_EXISTS`          | 409         | Unique constraint violation               |
| `RATE_LIMITED`            | 429         | Too many requests                         |
| `BUSINESS_RULE_VIOLATION` | 422         | Valid request but business logic rejected |
| `INTERNAL_ERROR`          | 500         | Unexpected server error                   |

---

## 4. API Versioning

### 4.1 Strategy

Prinodia Workspace uses **URL-based versioning** (not header-based or query-string-based):

```
/v1/users       ← Current stable API
/v2/users       ← Future breaking-change API (when needed)
```

### 4.2 Versioning Rules

- New non-breaking additions (new fields, new optional parameters) may be added to the current
  version without a version bump.
- Breaking changes (removing fields, changing response shapes, changing auth behavior) require a new
  major version.
- Old versions are supported for a minimum of **12 months** after a new version is released.
- Deprecated versions return a `Deprecation` and `Sunset` header.

### 4.3 NestJS Implementation

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// Controller
@Controller({ version: '1', path: 'users' })
export class UsersController { ... }
```

---

## 5. Authentication Flow

### 5.1 Matricule / Email Login

```
POST /v1/auth/login
{
  "credential": "1.641.558",    // matricule OR email
  "password": "SecureP@ss123",
  "credentialType": "MATRICULE" // or "EMAIL"
}

Response 200 (no MFA):
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": { ... }
}

Response 200 (MFA required):
{
  "mfaToken": "mfa_tmp_abc123",  // short-lived token for MFA step
  "mfaMethod": "TOTP",
  "expiresIn": 300               // 5 minutes to complete MFA
}
```

### 5.2 MFA Verification

```
POST /v1/auth/mfa/verify
{
  "mfaToken": "mfa_tmp_abc123",
  "code": "123456"
}

Response 200:
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": { ... }
}
```

### 5.3 Token Refresh

```
POST /v1/auth/refresh
Authorization: Bearer {refreshToken}

Response 200:
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",   // rotated on every refresh
  "expiresIn": 900
}
```

### 5.4 Logout

```
POST /v1/auth/logout
Authorization: Bearer {accessToken}

Response 204 (no body)
// Blacklists the access token and invalidates the refresh token
```

### 5.5 JWT Token Structure

```typescript
// Access Token Payload (RS256, 15-minute TTL)
{
  "sub": "clx1234...",          // userId
  "jti": "uuid-v4",             // token ID (for blacklisting)
  "role": "MINISTRY_ADMIN",     // user's role
  "ministryId": "clxabc...",    // for scoped access checks
  "sessionId": "clxsession...", // links to UserSession
  "iat": 1719216600,
  "exp": 1719217500
}

// Refresh Token Payload (RS256, 7-day TTL)
{
  "sub": "clx1234...",
  "jti": "uuid-v4",
  "sessionId": "clxsession...",
  "iat": 1719216600,
  "exp": 1719820800
}
```

---

## 6. Pagination

### 6.1 Cursor-Based Pagination (Preferred for Real-Time Data)

Used for: messages, notifications, audit logs

```
GET /v1/channels/{channelId}/messages?cursor=clx9999...&limit=50&direction=before

Response:
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "limit": 50,
      "nextCursor": "clx8888...",
      "prevCursor": "clxaaaa...",
      "hasMore": true
    }
  }
}
```

**Why cursor-based:** Page numbers break when new messages arrive. A cursor points to a stable
position in the message list.

### 6.2 Offset-Based Pagination (For Administrative Lists)

Used for: user lists, channel lists, file lists

```
GET /v1/users?page=2&limit=50

Response:
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 50,
      "total": 5000,
      "totalPages": 100,
      "hasNextPage": true,
      "hasPrevPage": true
    }
  }
}
```

---

## 7. Filtering, Sorting, and Search

### 7.1 Filtering

```
GET /v1/users?ministryId=clx123&role=EMPLOYEE&status=ACTIVE
GET /v1/files?category=DOCUMENT&uploadedAfter=2026-01-01&uploadedBefore=2026-06-30
GET /v1/audit-logs?action=LOGIN_FAILED&userId=clx456&from=2026-06-01&to=2026-06-24
```

**Convention:** Filter parameters use camelCase and match field names in the response.

### 7.2 Sorting

```
GET /v1/users?sortBy=lastName&sortOrder=asc
GET /v1/files?sortBy=size&sortOrder=desc
GET /v1/audit-logs?sortBy=createdAt&sortOrder=desc
```

**Default:** All collections sort by `createdAt DESC` unless specified.

### 7.3 Field Selection (Sparse Fieldsets)

```
GET /v1/users?fields=id,displayName,email,role
```

Reduces bandwidth for mobile clients that don't need every field.

### 7.4 Full-Text Search

```
GET /v1/search?q=budget+2026&type=messages&channelId=clx123&from=2026-01-01
```

Returns a unified search response across messages, files, and users (scoped to the user's access).

---

## 8. Rate Limiting

### 8.1 Rate Limit Tiers

| Endpoint Group          | Limit         | Window                   |
| ----------------------- | ------------- | ------------------------ |
| `POST /auth/login`      | 5 requests    | 15 minutes (by IP)       |
| `POST /auth/mfa/verify` | 5 requests    | 5 minutes (by MFA token) |
| `POST /auth/refresh`    | 30 requests   | 15 minutes (by userId)   |
| `POST /messages`        | 60 requests   | 1 minute (by userId)     |
| `POST /files`           | 20 requests   | 1 minute (by userId)     |
| `GET /search`           | 30 requests   | 1 minute (by userId)     |
| All other endpoints     | 1000 requests | 1 minute (by userId)     |

### 8.2 Rate Limit Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1719217500
Retry-After: 45   (only on 429)
```

---

## 9. Validation

### 9.1 Input Validation Strategy

All incoming data is validated through:

1. **DTO classes** with `class-validator` decorators
2. **Global `ValidationPipe`** with `whitelist: true` (strips unknown fields) and
   `forbidNonWhitelisted: true`
3. **Zod schemas** in `@prinodia/config` for environment variables
4. **Prisma** as the final safety net for DB-level constraints

### 9.2 DTO Example

```typescript
// create-message.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MessageType } from "@prinodia/types";

export class CreateMessageDto {
  @ApiProperty({ example: "Bonjour à tous", maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @ApiProperty({ required: false, description: "ID of message being replied to" })
  @IsString()
  @IsOptional()
  replyToId?: string;
}
```

---

## 10. WebSocket Standards

### 10.1 Connection

```typescript
// Client connection
const socket = io("wss://api.govsphere.gouv.cd", {
  auth: {
    token: accessToken, // JWT access token
  },
  transports: ["websocket"],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

### 10.2 Event Naming Convention

```
{resource}:{action}
```

Examples:

- `message:new`
- `message:updated`
- `message:deleted`
- `channel:member_joined`
- `user:presence_changed`
- `notification:new`
- `typing:start`
- `typing:stop`
- `error` (server → client for WS-level errors)

### 10.3 Error Handling on WebSocket

```typescript
// Server emits structured errors
socket.emit("error", {
  code: "UNAUTHORIZED",
  message: "Your session has expired. Please log in again.",
});

// Client handles
socket.on("error", (error) => {
  if (error.code === "UNAUTHORIZED") {
    // Redirect to login
  }
});
```

### 10.4 Heartbeat & Reconnection

- Server sends a `ping` event every 25 seconds
- Client must respond with `pong` within 5 seconds
- On connection loss, the client attempts reconnection with exponential backoff (max 30 seconds)
- On reconnection, the client re-joins all channels it was previously in

---

## 11. API Endpoint Reference

### 11.1 Authentication

| Method | Endpoint                          | Description                        |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/v1/auth/login`                  | Login with matricule or email      |
| POST   | `/v1/auth/mfa/verify`             | Complete MFA verification          |
| POST   | `/v1/auth/mfa/setup`              | Initialize TOTP setup              |
| POST   | `/v1/auth/mfa/confirm`            | Confirm TOTP setup with first code |
| POST   | `/v1/auth/mfa/disable`            | Disable MFA (requires password)    |
| POST   | `/v1/auth/refresh`                | Refresh access token               |
| POST   | `/v1/auth/logout`                 | Logout current session             |
| POST   | `/v1/auth/logout-all`             | Logout all sessions                |
| POST   | `/v1/auth/password/reset-request` | Request password reset email       |
| POST   | `/v1/auth/password/reset`         | Complete password reset            |
| POST   | `/v1/auth/password/change`        | Change password (authenticated)    |

### 11.2 Users

| Method | Endpoint                                  | Description                   |
| ------ | ----------------------------------------- | ----------------------------- |
| GET    | `/v1/users`                               | List users (admin only)       |
| POST   | `/v1/users`                               | Create user (admin only)      |
| GET    | `/v1/users/me`                            | Get current user's profile    |
| PATCH  | `/v1/users/me`                            | Update current user's profile |
| GET    | `/v1/users/{userId}`                      | Get user by ID                |
| PATCH  | `/v1/users/{userId}`                      | Update user (admin only)      |
| DELETE | `/v1/users/{userId}`                      | Deactivate user (admin only)  |
| GET    | `/v1/users/{userId}/sessions`             | List user's active sessions   |
| DELETE | `/v1/users/{userId}/sessions/{sessionId}` | Revoke a session              |
| POST   | `/v1/users/me/avatar`                     | Upload avatar                 |

### 11.3 Organizations

| Method | Endpoint                                   | Description                   |
| ------ | ------------------------------------------ | ----------------------------- |
| GET    | `/v1/ministries`                           | List ministries               |
| POST   | `/v1/ministries`                           | Create ministry (super admin) |
| GET    | `/v1/ministries/{ministryId}`              | Get ministry                  |
| PATCH  | `/v1/ministries/{ministryId}`              | Update ministry               |
| GET    | `/v1/ministries/{ministryId}/departments`  | List departments              |
| POST   | `/v1/ministries/{ministryId}/departments`  | Create department             |
| GET    | `/v1/departments/{departmentId}/divisions` | List divisions                |
| POST   | `/v1/departments/{departmentId}/divisions` | Create division               |

### 11.4 Channels

| Method | Endpoint                                    | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| GET    | `/v1/channels`                              | List accessible channels |
| POST   | `/v1/channels`                              | Create channel           |
| GET    | `/v1/channels/{channelId}`                  | Get channel              |
| PATCH  | `/v1/channels/{channelId}`                  | Update channel           |
| DELETE | `/v1/channels/{channelId}`                  | Archive channel          |
| GET    | `/v1/channels/{channelId}/members`          | List members             |
| POST   | `/v1/channels/{channelId}/members`          | Add member               |
| DELETE | `/v1/channels/{channelId}/members/{userId}` | Remove member            |

### 11.5 Messages

| Method | Endpoint                                     | Description                      |
| ------ | -------------------------------------------- | -------------------------------- |
| GET    | `/v1/channels/{channelId}/messages`          | List messages (cursor paginated) |
| POST   | `/v1/channels/{channelId}/messages`          | Send message                     |
| PATCH  | `/v1/messages/{messageId}`                   | Edit message                     |
| DELETE | `/v1/messages/{messageId}`                   | Delete message                   |
| POST   | `/v1/messages/{messageId}/reactions`         | Add reaction                     |
| DELETE | `/v1/messages/{messageId}/reactions/{emoji}` | Remove reaction                  |
| POST   | `/v1/channels/{channelId}/messages/pin`      | Pin message                      |
| GET    | `/v1/channels/{channelId}/messages/pinned`   | List pinned messages             |

### 11.6 Files

| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| POST   | `/v1/files/upload-url`            | Request pre-signed upload URL |
| POST   | `/v1/files/confirm`               | Confirm upload complete       |
| GET    | `/v1/files/{fileId}`              | Get file metadata             |
| GET    | `/v1/files/{fileId}/download-url` | Get pre-signed download URL   |
| DELETE | `/v1/files/{fileId}`              | Soft-delete file              |

### 11.7 Search

| Method | Endpoint              | Description                               |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/v1/search`          | Global search across messages/files/users |
| GET    | `/v1/search/messages` | Search messages only                      |
| GET    | `/v1/search/files`    | Search files only                         |
| GET    | `/v1/search/users`    | Search users only                         |

### 11.8 Notifications

| Method | Endpoint                      | Description        |
| ------ | ----------------------------- | ------------------ |
| GET    | `/v1/notifications`           | List notifications |
| PATCH  | `/v1/notifications/{id}/read` | Mark as read       |
| POST   | `/v1/notifications/read-all`  | Mark all as read   |

### 11.9 Admin

| Method | Endpoint                      | Description                |
| ------ | ----------------------------- | -------------------------- |
| GET    | `/v1/admin/audit-logs`        | Query audit logs           |
| GET    | `/v1/admin/stats`             | System statistics          |
| GET    | `/v1/admin/health`            | System health check        |
| POST   | `/v1/admin/users/bulk-import` | Bulk import users from CSV |
