# Pull Request

## Summary

<!-- 1-3 sentences describing what this PR does and why. -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as
      expected)
- [ ] Refactor (code quality improvement, no behavior change)
- [ ] Documentation update
- [ ] Infrastructure / DevOps change
- [ ] Security fix

## Related Issues

Closes #<!-- issue number -->

## What Changed

<!-- List the specific changes made in this PR. Be precise. -->

-
-
-

## Database Changes

- [ ] This PR includes Prisma schema changes
- [ ] A migration file has been generated (`prisma migrate dev --name ...`)
- [ ] The migration is backward-compatible (no destructive changes in production)
- [ ] Seed data was updated if applicable

## Security Checklist

- [ ] No credentials, tokens, or secrets committed
- [ ] No files stored in PostgreSQL (MinIO only)
- [ ] All new endpoints are protected by `JwtAuthGuard` or explicitly decorated `@Public()`
- [ ] All sensitive operations produce an `AuditLog` entry
- [ ] Input is validated via DTOs with class-validator
- [ ] RBAC is enforced with `@RequirePermissions()`
- [ ] No `console.log` statements with sensitive data

## Testing

- [ ] Unit tests pass (`npm run test`)
- [ ] Coverage thresholds maintained (≥80% branches, ≥85% functions/lines)
- [ ] New behavior is covered by tests
- [ ] If this is a bug fix, a regression test was added
- [ ] Manual testing performed (describe below)

**Manual testing:**

<!-- Describe how you manually verified the changes. -->

## i18n

- [ ] No hardcoded UI strings (all text uses i18n keys)
- [ ] If new keys were added, they are included in all 5 locale files (fr, en, ln, sw, lua)
- [ ] If keys were added, French translations are accurate

## Review Notes

<!-- Anything specific you want reviewers to focus on. -->

---

By submitting this PR, I confirm that:

- I have read and followed the [Engineering Standards](../docs/08_Engineering_Standards.md)
- My code follows the existing style and patterns
- I have added/updated documentation where needed
