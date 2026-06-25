# Contributing to GovSphere

Thank you for contributing to GovSphere — the Digital Operating System for the Government of the
DRC.

## Prerequisites

Before contributing:

1. You must be a verified government employee or an authorized external partner
2. You must have a valid matricule number or partner authorization code
3. You must have completed the security onboarding checklist
4. You must have signed the Contributor Agreement

## Development Setup

See the [README](./README.md#local-development) for full local setup instructions.

## Branching Strategy

We use GitHub Flow:

```
main           ← production-ready; protected; requires PR + 2 approvals
  └── develop  ← integration branch; requires PR + 1 approval
        └── feature/JIRA-123-short-description
        └── fix/JIRA-456-short-description
        └── chore/update-dependencies
```

Branch naming:

- `feature/<ticket>-<short-description>` for new features
- `fix/<ticket>-<short-description>` for bug fixes
- `chore/<description>` for maintenance (deps, config, docs)
- `security/<description>` for security fixes (may skip develop)

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE, Closes #123]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

**Scopes:** `api`, `web`, `db`, `auth`, `identity`, `channels`, `files`, `infra`, `i18n`

**Examples:**

```
feat(identity): add TOTP MFA device registration endpoint
fix(auth): prevent token reuse after session revocation
security(identity): enforce MFA requirement for MINISTRY_ADMIN role
chore(deps): update @nestjs/* to 10.4.0
```

## Code Standards

Full standards are documented in
[docs/08_Engineering_Standards.md](./docs/08_Engineering_Standards.md).

**Critical rules:**

- TypeScript strict mode — no `any`, no `@ts-ignore`
- All functions have explicit return types
- All DTOs use class-validator decorators
- No `console.log` in production code (use `AppLogger`)
- No files stored in PostgreSQL — MinIO only
- All sensitive operations write an `AuditLog` entry
- All UI text uses i18n keys — no hardcoded strings
- No secrets or credentials in code or commits

## Testing Requirements

Every PR must maintain or improve coverage:

| Metric     | Minimum |
| ---------- | ------- |
| Branches   | 80%     |
| Functions  | 85%     |
| Lines      | 85%     |
| Statements | 85%     |

**Write tests for:**

- All new service methods
- All RBAC boundaries (permission checks, role weight validation)
- All authentication flows
- All error cases and edge conditions

Run tests:

```bash
npm run test        # All tests
npm run test:watch  # Watch mode during development
npm run test:cov    # With coverage report
```

## Pull Request Process

1. Create a branch from `develop` (or `main` for hotfixes)
2. Make your changes following the standards above
3. Write/update tests
4. Run the full check suite:
   ```bash
   npm run lint
   npm run type-check
   npm run test:cov
   npm run build
   ```
5. Fill out the PR template completely
6. Request review from at least one CODEOWNER
7. Address all review comments before merging

**PRs touching security-sensitive code** (auth, RBAC, MFA, session management) require review from
`@govsphere-security` in addition to the engineering team.

## Database Migrations

When changing the Prisma schema:

```bash
# Generate a new migration
npx prisma migrate dev --name describe-what-changed

# Validate the migration
npx prisma validate
```

Rules:

- Never modify existing migration files
- Migrations must be backward-compatible (additive changes only)
- If renaming or deleting a column, coordinate with the team first
- Include a rollback plan for any destructive migration

## Security

- Never commit `.env` files or secrets
- Never disable security checks with `// eslint-disable` without a justification comment
- If you find a security vulnerability, report it to security@govsphere.gouv.cd — do not open a
  public issue
- See [SECURITY.md](./SECURITY.md) for the full security policy

## Getting Help

- Engineering questions: open an issue or contact engineering@govsphere.gouv.cd
- Security concerns: security@govsphere.gouv.cd
- Architecture questions: see [docs/](./docs/) or open a discussion
