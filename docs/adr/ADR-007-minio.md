# ADR-007 — Use MinIO for File Storage

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team

---

## Context

GovSphere will handle government documents, images, attachments, and user avatars. The file storage
system must:

- Store file content outside the primary database (performance and cost)
- Be S3-compatible (future cloud migration path)
- Be deployable on-premise to meet DRC data sovereignty requirements
- Support pre-signed URL generation for time-limited authenticated access
- Be integrable with a virus scanning pipeline
- Support large files (up to 50 MB per file, potentially gigabytes in total)

## Decision

We will use **MinIO** (AGPL license, self-hosted) as the S3-compatible object storage system.

**Fundamental rule:** File content (binary data) is never stored in PostgreSQL. Only file metadata
(name, size, MIME type, storage path, uploader, permissions) is stored in the `File` table. All
binary content is stored in MinIO.

## Alternatives Considered

**AWS S3:**

- Rejected for on-premise deployment requirement. GovSphere must be deployable in the DRC on
  government-controlled infrastructure. S3 is available for cloud deployments (MinIO is
  S3-compatible, so the switch is a config change).

**Google Cloud Storage:**

- Same rejection reason as AWS S3.

**Storing files in PostgreSQL (Large Objects / BYTEA):**

- Explicitly rejected. Storing binary data in the database causes: (1) massive database size growth,
  (2) backup/restore times that scale with file size, (3) no CDN path, (4) no virus scan
  integration, (5) memory pressure from loading blobs into the ORM.

**Local filesystem:**

- Rejected. Not scalable across multiple API instances. No redundancy. Cannot be accessed by other
  services.

**Ceph Object Storage:**

- Considered for large-scale deployments. More complex to operate than MinIO. MinIO can be replaced
  with Ceph at the infrastructure level without application code changes (both expose S3 API).

## Consequences

**Positive:**

- S3-compatible API — the application uses the AWS SDK interface; switching to actual S3 or Ceph in
  production requires only a config change
- Files served through authenticated API endpoints, never exposed directly from MinIO
- Pre-signed URLs allow time-limited direct download without proxying through the API
- MinIO Console provides a web UI for bucket management in development
- AGPL license — open source, no per-GB cost
- Bucket policies enforce access control at the storage layer
- Versioning support for document version history (future)

**Negative:**

- MinIO cluster configuration required for production HA (distributed mode)
- Requires separate infrastructure management (vs. managed S3)
- Backup strategy must include MinIO bucket replication

## File Access Model

```
Client → GET /v1/files/:id/download
  → API checks user permissions against File.permissions
  → API generates a pre-signed MinIO URL (15-min TTL)
  → API redirects client to pre-signed URL
  → Client downloads directly from MinIO
```

File content never passes through the NestJS API process — only metadata and auth.

## Buckets

| Bucket                | Contents                                    |
| --------------------- | ------------------------------------------- |
| `govsphere-files`     | Channel attachments, shared documents       |
| `govsphere-avatars`   | User profile photos                         |
| `govsphere-documents` | Administrative documents (higher retention) |
