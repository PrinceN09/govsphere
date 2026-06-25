# Security Policy

## Supported Versions

GovSphere applies security patches to the most recent minor release only.

| Version         | Supported |
| --------------- | --------- |
| 0.1.x (current) | ✅        |
| < 0.1.0         | ❌        |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Security issues in GovSphere may expose sensitive government data or authentication systems. We take
all reports seriously and will respond promptly.

### Responsible Disclosure

Please report security vulnerabilities by emailing **security@govsphere.gouv.cd**.

Include in your report:

- Type of vulnerability (e.g., authentication bypass, privilege escalation, SQL injection)
- Affected component (e.g., API auth, RBAC, file storage)
- Steps to reproduce
- Potential impact and affected data
- Your suggested fix (if any)

### What to Expect

| Timeline        | Action                                         |
| --------------- | ---------------------------------------------- |
| Within 48 hours | Acknowledgement of your report                 |
| Within 7 days   | Initial assessment and severity classification |
| Within 30 days  | Fix deployed or mitigation applied             |
| After fix       | Coordinated public disclosure (if appropriate) |

We follow
[responsible disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)
practices. We will not take legal action against researchers who report vulnerabilities in good
faith.

## Security Architecture

For the full security architecture, see
[docs/07_Security_Architecture.md](./docs/07_Security_Architecture.md).

Key security properties:

- Zero Trust architecture — every request authenticated and authorized
- RS256 asymmetric JWT — private key never leaves the API server
- AES-256-GCM for TOTP secrets at rest
- bcrypt cost 12 for password hashing
- Immutable audit logs (DB user has INSERT + SELECT only)
- Account lockout after 5 failed login attempts

## Security Contacts

| Role             | Contact                       |
| ---------------- | ----------------------------- |
| Security Lead    | security@govsphere.gouv.cd    |
| Engineering Lead | engineering@govsphere.gouv.cd |

## Scope

### In Scope

- Authentication and session management (JWT, refresh tokens, MFA)
- Authorization and RBAC (role assignment, permission checks)
- API endpoints (injection, broken object level authorization)
- Password handling and storage
- File upload and access controls
- Audit log integrity

### Out of Scope

- Issues in third-party dependencies (report to the respective project)
- Social engineering attacks
- Physical access to infrastructure
- Issues requiring non-default configuration

## Bug Bounty

GovSphere does not currently operate a public bug bounty program. Researchers who responsibly
disclose valid vulnerabilities will be credited (with their consent) in the release notes.
