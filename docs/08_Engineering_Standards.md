# GovSphere — Engineering Standards

**Document Version:** 1.0  
**Status:** Approved  
**Last Updated:** 2026-06-24

---

## 1. Purpose

This document defines the non-negotiable engineering standards for the GovSphere platform. Every
engineer — regardless of seniority — follows these standards. Consistency, readability, and
maintainability are valued over personal preference or clever shortcuts.

> "Any fool can write code that a computer can understand. Good programmers write code that humans
> can understand." — Martin Fowler

---

## 2. Monorepo Structure

```
govsphere/
├── apps/
│   ├── web/               # Next.js 15 — browser application
│   ├── api/               # NestJS — REST + WebSocket API
│   ├── desktop/           # Tauri 2 — desktop wrapper
│   └── mobile/            # React Native + Expo — mobile app
├── packages/
│   ├── database/          # Prisma schema, migrations, client
│   ├── types/             # Shared TypeScript type definitions
│   ├── utils/             # Pure utility functions (no side effects)
│   ├── ui/                # Shared React component library
│   └── config/            # Shared configs (ESLint, TypeScript, etc.)
├── docs/                  # Engineering documentation (this folder)
├── scripts/               # Developer utility scripts
├── .github/               # GitHub Actions CI/CD workflows
├── docker/                # Dockerfile and docker-compose files
├── turbo.json             # Turborepo build graph
├── package.json           # Root workspace manifest
├── tsconfig.json          # Root TypeScript config
├── .eslintrc.js           # Root ESLint config
├── .env                   # Local environment variables (never committed)
└── .env.example           # Environment variable template (committed)
```

### Package Dependency Rules

```
apps/* can depend on:    packages/* (any)
packages/ui can depend on: packages/types, packages/utils
packages/utils can depend on: packages/types
packages/types depends on: nothing internal
packages/database depends on: nothing internal
```

**Rule:** packages must never depend on apps. Apps can depend on packages. Circular dependencies are
never permitted.

---

## 3. Naming Conventions

### Files and Directories

| Type                                  | Convention                           | Example                                 |
| ------------------------------------- | ------------------------------------ | --------------------------------------- |
| NestJS modules, controllers, services | `kebab-case.type.ts`                 | `auth.service.ts`, `user.controller.ts` |
| React components                      | `PascalCase.tsx`                     | `MessageBubble.tsx`, `UserAvatar.tsx`   |
| React hooks                           | `camelCase starting with "use"`      | `useAuth.ts`, `useMessages.ts`          |
| Utility functions                     | `camelCase.ts`                       | `formatDate.ts`, `generateId.ts`        |
| Type definition files                 | `camelCase.types.ts`                 | `user.types.ts`, `auth.types.ts`        |
| Test files                            | same name + `.spec.ts` or `.test.ts` | `auth.service.spec.ts`                  |
| E2E tests                             | `kebab-case.e2e.ts`                  | `login-flow.e2e.ts`                     |
| Constants                             | `SCREAMING_SNAKE_CASE.ts`            | `HTTP_STATUS.ts`, `ERROR_CODES.ts`      |
| Directories                           | `kebab-case`                         | `user-management/`, `file-storage/`     |

### TypeScript Symbols

| Symbol Type      | Convention                    | Example                               |
| ---------------- | ----------------------------- | ------------------------------------- |
| Variables        | `camelCase`                   | `const userId = ...`                  |
| Functions        | `camelCase`                   | `function getUserById() {...}`        |
| Classes          | `PascalCase`                  | `class AuthService {...}`             |
| Interfaces       | `PascalCase` (no `I` prefix)  | `interface UserProfile {...}`         |
| Types            | `PascalCase`                  | `type AuthResponse = {...}`           |
| Enums            | `PascalCase`                  | `enum UserRole {...}`                 |
| Enum members     | `SCREAMING_SNAKE_CASE`        | `UserRole.MINISTRY_ADMIN`             |
| Constants        | `SCREAMING_SNAKE_CASE`        | `const MAX_FILE_SIZE = ...`           |
| React components | `PascalCase`                  | `export function MessageList() {...}` |
| React hooks      | `camelCase with "use" prefix` | `export function useAuth() {...}`     |

### Database (Prisma)

| Object          | Convention               | Example                                |
| --------------- | ------------------------ | -------------------------------------- |
| Model names     | `PascalCase` singular    | `User`, `Message`, `Channel`           |
| Field names     | `camelCase`              | `firstName`, `createdAt`, `ministryId` |
| Relation fields | `camelCase`, descriptive | `author`, `messages`, `ministry`       |
| Enum names      | `PascalCase`             | `UserRole`, `MessageType`              |
| Enum values     | `SCREAMING_SNAKE_CASE`   | `MINISTRY_ADMIN`, `FILE_SHARE`         |

---

## 4. TypeScript Standards

### Strict Mode

All packages must have `strict: true` in tsconfig. The following rules are mandatory and cannot be
downgraded to `warn`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type Safety Rules

**Never use `any`.** Every occurrence of `any` is a bug waiting to happen. Use these instead:

```typescript
// ❌ Wrong
function process(data: any) { ... }

// ✅ Use unknown and narrow it
function process(data: unknown) {
  if (typeof data === "string") { ... }
}

// ✅ Use a proper type
function process(data: UserProfile) { ... }

// ✅ Use generics
function process<T extends Record<string, unknown>>(data: T) { ... }
```

**Prefer `type` over `interface` for unions and computed types. Prefer `interface` for object shapes
that may be extended:**

```typescript
// ✅ interface for object shapes
interface UserProfile {
  id: string;
  email: string;
}

// ✅ type for unions
type AuthMethod = "matricule" | "email" | "oauth";

// ✅ type for mapped/computed types
type PartialUser = Partial<UserProfile>;
```

**No type assertions unless absolutely necessary:**

```typescript
// ❌ Wrong — suppresses type errors
const user = data as User;

// ✅ Use type guards
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data;
}
```

**Explicit return types on all exported functions:**

```typescript
// ❌ Missing return type
export async function getUser(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

// ✅ Explicit return type
export async function getUser(id: string): Promise<User> {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}
```

---

## 5. NestJS Standards

### Module Organization

Each NestJS module is self-contained. Every resource (Auth, Users, Channels, Messages, Files, etc.)
has its own module directory:

```
apps/api/src/
├── app.module.ts
├── main.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   └── auth.service.spec.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       └── update-user.dto.ts
└── common/
    ├── decorators/
    ├── filters/
    ├── guards/
    ├── interceptors/
    └── pipes/
```

### Controller Rules

- Controllers handle only HTTP concerns: routing, request validation, response shaping
- No business logic in controllers
- Every route is protected by a guard (or explicitly marked `@Public()`)
- All inputs are validated via DTOs with `class-validator`

```typescript
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<UserProfileResponse> {
    return this.usersService.findById(id);
  }
}
```

### Service Rules

- Services contain all business logic
- Services depend on the database via the injected `PrismaService`
- Services never depend on other services from a different module directly — use events or shared
  utilities
- Services throw typed exceptions, not raw Error objects

```typescript
// ✅ Typed exception
throw new NotFoundException("USER_NOT_FOUND", "User does not exist");

// ❌ Raw error
throw new Error("user not found");
```

### DTO Rules

- Every request body has a DTO decorated with `class-validator`
- DTOs use `@IsString()`, `@IsEmail()`, `@MinLength()`, etc. — never raw types alone
- DTOs are used for input validation only; never used as database models

```typescript
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  credential: string; // matricule or email

  @IsString()
  @MinLength(12)
  password: string;
}
```

---

## 6. Next.js Standards

### App Router

GovSphere uses the Next.js App Router (not Pages Router).

```
apps/web/src/app/
├── layout.tsx           # Root layout
├── page.tsx             # Home page (redirect to /dashboard)
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx       # Authenticated layout (sidebar, header)
│   ├── dashboard/
│   │   └── page.tsx
│   └── channels/
│       └── [channelId]/
│           └── page.tsx
└── api/                 # API routes (minimal — prefer NestJS)
```

### Server vs Client Components

```typescript
// Default: Server Component (no "use client")
// For data fetching, SEO content, static content

// "use client" only when you need:
// - useState, useEffect, useRef
// - Event handlers (onClick, onChange)
// - Browser APIs (window, localStorage, navigator)
// - Third-party client libraries (socket.io-client)
```

Rule: Keep "use client" boundaries as deep as possible. A page should be a Server Component; only
the interactive parts (forms, real-time feeds) should be client components.

### Data Fetching

```typescript
// ✅ Server Component — fetches on server
async function ChannelPage({ params }: { params: { channelId: string } }) {
  const channel = await api.channels.findById(params.channelId);
  return <ChannelView channel={channel} />;
}

// ❌ Don't fetch in useEffect without React Query
useEffect(() => {
  fetch("/api/channels").then(...); // bypasses caching, loading states, error handling
}, []);
```

All client-side data fetching uses TanStack Query (React Query). No raw `fetch` in client
components.

---

## 7. Prisma Standards

### Query Rules

**Always select only the fields you need:**

```typescript
// ❌ Fetches entire user row including sensitive fields
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, displayName: true, avatarUrl: true },
});
```

**Never expose `passwordHash` or `mfaSecret` in API responses:**

Create explicit response type transformations — never return the raw Prisma model.

**Transactions for multi-step operations:**

```typescript
// ✅ Atomic transaction
const result = await prisma.$transaction(async (tx) => {
  const message = await tx.message.create({ data: messageData });
  await tx.channel.update({
    where: { id: channelId },
    data: { lastMessageAt: new Date() },
  });
  return message;
});
```

**Soft delete pattern:**

No records are hard-deleted from the database. Use `isDeleted: true` or status flags. The deletion
timestamp and the user who triggered the deletion are always recorded.

### Migration Rules

- Migrations are generated with `prisma migrate dev --name <description>`
- Migration names use snake_case, e.g., `add_mfa_fields_to_user`
- Migrations are never edited after they have been applied to any environment
- Destructive migrations (dropping columns) require a data backup before application
- All migrations are reviewed in pull requests before merging

---

## 8. Git Conventions

### Branch Strategy (GitHub Flow)

```
main                    # Production-ready code, always deployable
  └── feature/*         # Feature branches (from main)
  └── fix/*             # Bug fix branches (from main)
  └── chore/*           # Maintenance branches (from main)
  └── docs/*            # Documentation-only changes
```

**Never commit directly to `main`.** Every change goes through a pull request.

### Branch Naming

```
feature/auth-mfa-totp
feature/channel-message-pagination
fix/jwt-refresh-rotation-bug
fix/file-upload-size-validation
chore/upgrade-prisma-v6
docs/api-authentication-guide
```

### Commit Message Format

GovSphere follows the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting (no code logic change)
- `refactor` — code restructuring (no feature change, no bug fix)
- `test` — adding or updating tests
- `chore` — tooling, dependency updates, build scripts

**Examples:**

```
feat(auth): implement TOTP-based MFA with backup codes

fix(files): enforce file type allowlist before generating pre-signed URL

docs(api): add cursor pagination examples to API architecture doc

chore(deps): upgrade Prisma from 5.22.0 to 6.0.0

test(auth): add unit tests for account lockout after 5 failed attempts
```

**Rules:**

- Subject line: 72 characters maximum
- Subject line: imperative mood ("add" not "added", "fix" not "fixed")
- No period at end of subject line
- Body explains WHY, not what (the diff already shows what)

---

## 9. Testing Standards

### Test Pyramid

```
          /\
         /  \
        / E2E \          10% — Critical user journeys only
       /________\
      /          \
     / Integration \     30% — API routes, DB queries, guards
    /______________\
   /                \
  /    Unit Tests    \   60% — Services, utilities, DTOs
 /____________________\
```

### Unit Test Rules

- Test file is co-located with the file it tests: `auth.service.spec.ts` is next to
  `auth.service.ts`
- Each unit test is isolated — no real database, no network calls, no file system
- External dependencies are mocked: `jest.mock("../prisma.service")`
- Test name format:
  `describe("AuthService") > describe("login") > it("should throw UnauthorizedException when user is not found")`

```typescript
describe("AuthService", () => {
  describe("login", () => {
    it("should throw UnauthorizedException when user does not exist", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it("should return tokens on valid credentials", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      const result = await authService.login(loginDto);
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });
  });
});
```

### Integration Test Rules

- Integration tests run against a test PostgreSQL database (separate from dev)
- Each test suite resets the database state with `beforeEach` cleanup
- Integration tests are in a separate `/test` directory at the app root
- Integration tests test the full NestJS request/response cycle (controller → service → database)

### E2E Test Rules

- E2E tests use Playwright against a running application
- E2E tests cover only critical user journeys: login, send message, upload file, admin panel
- E2E tests run in CI after successful integration tests

### Coverage Requirements

| Package                  | Minimum Coverage |
| ------------------------ | ---------------- |
| `packages/utils`         | 95%              |
| `packages/types`         | N/A (types only) |
| `apps/api` — services    | 80%              |
| `apps/api` — controllers | 70%              |
| `apps/web` — components  | 60%              |

---

## 10. Code Review Checklist

Every pull request is reviewed against this checklist before approval:

**Correctness**

- [ ] The implementation solves the stated problem
- [ ] Edge cases are handled (empty state, null inputs, unauthorized access)
- [ ] Errors are handled and reported clearly

**Security**

- [ ] No secrets or credentials in code
- [ ] Input is validated before use
- [ ] Authorization checks are in place for sensitive operations
- [ ] Sensitive fields are not returned in API responses

**Database**

- [ ] Queries select only required fields
- [ ] Multi-step operations use transactions
- [ ] No N+1 queries (use `include` or batching)
- [ ] New fields have appropriate database indexes

**Tests**

- [ ] New code has unit tests
- [ ] Tests cover the happy path and at least one failure path
- [ ] Test names clearly describe the scenario

**Standards**

- [ ] Code follows naming conventions in this document
- [ ] No `any` types
- [ ] All exported functions have explicit return types
- [ ] No commented-out code committed to main

**Documentation**

- [ ] New public API endpoints are documented
- [ ] Complex business logic has inline comments explaining WHY
- [ ] Breaking changes are noted in the PR description

---

## 11. Definition of Done

A feature is **Done** when ALL of the following are true:

1. **Code complete** — all acceptance criteria from the task are implemented
2. **Tests written** — unit tests + relevant integration tests pass
3. **Zero lint errors** — `npm run lint` exits 0
4. **Zero type errors** — `npm run type-check` exits 0
5. **Code reviewed** — at least one peer review approval
6. **Documentation updated** — API docs, architecture docs if affected
7. **Migrations applied** — any new schema changes have a migration file
8. **Deployed to staging** — feature verified working in staging environment
9. **No regressions** — existing tests continue to pass

A feature is **never done** when:

- It works locally but hasn't been tested in staging
- Tests are skipped or mocked in ways that hide real failures
- Known bugs are deferred without a tracking ticket
- Documentation is "coming later"
