# ADR-009 — Authenticate with Matricule Number

**Status:** Accepted **Date:** 2026-06 **Deciders:** Prinodia Workspace Engineering Team, DRC Government IT
Authority

---

## Context

Government employees in the DRC are each assigned a **Matricule Number** — a unique government
identifier used across all HR, payroll, and administrative systems. Formats vary:

- 4-digit groups: `1.641.558`
- 3-digit groups: `478.432`
- 2-digit groups: `424.55`

Pattern: `^\d{1,4}(\.\d{1,4}){1,2}$`

Government employees know their Matricule Number; many do not have official government email
addresses. The authentication system must support Matricule-based login as the primary government
employee authentication method.

## Decision

We will support **two authentication methods** on a single login endpoint:

1. **Matricule Number + Password** — primary method for government employees
2. **Government Email + Password** — secondary method (same endpoint, credential type auto-detected)

The credential type is detected automatically:

- If the credential matches `^\d{1,4}(\.\d{1,4}){1,2}$` → Matricule authentication
- Otherwise → Email authentication

Matricule Numbers are stored as **`String`** in the database (`User.matriculeNumber`), never as an
integer. Leading zeros, dot separators, and length variations must be preserved exactly as issued by
the government HR system.

## Alternatives Considered

**Email-only authentication:**

- Rejected. A significant portion of DRC government employees do not have official email addresses.
  Requiring email would exclude them from the platform.

**Matricule-only authentication:**

- Rejected. External partners (NGOs, contractors) are invited as `GUEST` users and do not have
  matricule numbers. Email is the appropriate identifier for them.

**National ID number:**

- Considered as an alternative identifier. Rejected because the Matricule is the government HR
  system's primary key and is already used across all official systems. Using a different identifier
  would require a separate mapping table.

**SSO with Keycloak or Active Directory:**

- Considered for future use. The current government IT infrastructure does not have a centralized
  SSO service. Prinodia Workspace implements its own credential store now, with a migration path to federated
  identity once the government establishes a national IdP.

**Storing Matricule as Integer:**

- Explicitly rejected. The Matricule format (e.g., `1.641.558`) is not a numeric value. Leading
  zeros would be lost, dot separators cannot be stored in integers, and two Matricules with
  different formats might incorrectly compare as equal. Stored as `String` with format validation.

## Consequences

**Positive:**

- Government employees use the identifier they already know from their HR documents
- No dependency on government email infrastructure (which is patchy in the DRC)
- Single login endpoint handles both credential types cleanly
- Auto-detection logic is transparent to the user (same UI form for both)
- Matricule stored as String preserves format exactly as issued

**Negative:**

- Matricule format validation (`^\d{1,4}(\.\d{1,4}){1,2}$`) must be kept in sync with the actual HR
  system's format
- If the government changes the Matricule format, a migration will be needed
- Users logging in with a Matricule that doesn't exist yet in Prinodia Workspace (pre-provisioned) need a
  clear error message

## Security Notes

- Matricule + Email fields are indexed uniquely in the database
- Login attempts are rate-limited (10 req/sec per IP, 100 req/min per IP)
- Failed login attempts are counted per user — lockout at 5 attempts (30 min) and 10 attempts (admin
  unlock)
- Matricule numbers are never included in JWT payloads sent to clients unless explicitly needed
- The Matricule field uses a `UNIQUE` constraint in PostgreSQL to prevent duplicate registrations
