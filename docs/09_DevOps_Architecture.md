# GovSphere — DevOps Architecture

**Document Version:** 1.0  
**Status:** Approved  
**Last Updated:** 2026-06-24

---

## 1. Philosophy

DevOps at GovSphere follows three principles:

- **Reproducible environments** — Development, staging, and production are identical. "Works on my
  machine" is never an acceptable answer.
- **Automate everything** — No manual steps in the path from code to production. Every deployment is
  triggered by a Git push, not a human SSH session.
- **Fail fast** — Problems are caught in CI before they reach staging. Staging problems are caught
  before they reach production.

---

## 2. Local Development Environment

### Prerequisites

All developers install the same versions of:

```
Node.js      22 LTS        (managed via nvm)
npm          10+
Docker       26+
Docker Compose 2.25+
PostgreSQL   17            (via Docker — do not install natively)
Redis        7             (via Docker)
MinIO        RELEASE.2024  (via Docker)
```

### docker-compose.dev.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: govsphere_dev
      POSTGRES_USER: govsphere_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U govsphere_app"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres_shadow:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: govsphere_shadow
      POSTGRES_USER: govsphere_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - postgres_shadow_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "9000:9000" # S3 API
      - "9001:9001" # MinIO Console
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  postgres_shadow_data:
  redis_data:
  minio_data:
```

### Developer Quickstart

```bash
# 1. Clone and install
git clone https://github.com/govsphere/govsphere.git
cd govsphere
npm install

# 2. Environment
cp .env.example .env
# Fill in the required values

# 3. Start infrastructure
docker compose -f docker/docker-compose.dev.yml up -d

# 4. Run migrations
cd packages/database
npx prisma migrate dev

# 5. Start all apps
npm run dev   # Turborepo runs all apps in parallel
```

After this, the developer has:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- MinIO Console: `http://localhost:9001`

---

## 3. Dockerfile Standards

### API (NestJS)

```dockerfile
# apps/api/Dockerfile

# ── Build stage ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
COPY turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspaces

# Copy source and build
COPY . .
RUN npm run build --workspace=apps/api

# ── Production stage ──────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system govsphere && adduser --system --group govsphere

# Copy only production output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma

USER govsphere

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Web (Next.js)

```dockerfile
# apps/web/Dockerfile

FROM node:22-alpine AS base

# ── Dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Builder ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/web

# ── Runner ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system govsphere && adduser --system --group govsphere

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER govsphere

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### Branch Strategy and CI Triggers

```
Push to feature/* or fix/*
  → ci.yml: lint + type-check + unit tests + build

Pull Request to main
  → ci.yml (above)
  → pr-checks.yml: integration tests, PR size check, conventional commit check

Push to main (merge)
  → deploy-staging.yml: build Docker images + deploy to staging

Tag v*.*.* (release)
  → deploy-production.yml: promote staging images to production
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: ["feature/**", "fix/**", "chore/**", "docs/**"]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: govsphere

jobs:
  quality:
    name: Quality Gates
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4

      - name: Build
        run: npm run build
```

### `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    name: Build Docker Images
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_STAGING_ROLE_ARN }}
          aws-region: af-south-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API image
        run: |
          docker build -t ${{ secrets.ECR_REGISTRY }}/govsphere-api:${{ github.sha }} \
            -f apps/api/Dockerfile .
          docker push ${{ secrets.ECR_REGISTRY }}/govsphere-api:${{ github.sha }}

      - name: Build and push Web image
        run: |
          docker build -t ${{ secrets.ECR_REGISTRY }}/govsphere-web:${{ github.sha }} \
            -f apps/web/Dockerfile .
          docker push ${{ secrets.ECR_REGISTRY }}/govsphere-web:${{ github.sha }}

  deploy:
    name: Deploy to ECS Staging
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster govsphere-staging \
            --task-definition govsphere-migrate \
            --overrides '{"IMAGE_TAG":"${{ github.sha }}"}'

      - name: Deploy API service
        run: |
          aws ecs update-service \
            --cluster govsphere-staging \
            --service govsphere-api \
            --force-new-deployment

      - name: Deploy Web service
        run: |
          aws ecs update-service \
            --cluster govsphere-staging \
            --service govsphere-web \
            --force-new-deployment
```

---

## 5. Infrastructure (Terraform)

### Directory Structure

```
infrastructure/
├── modules/
│   ├── networking/        # VPC, subnets, security groups
│   ├── ecs/               # ECS clusters, task definitions, services
│   ├── rds/               # PostgreSQL RDS instance
│   ├── elasticache/       # Redis ElastiCache cluster
│   ├── s3/                # MinIO / S3 buckets
│   └── monitoring/        # CloudWatch, alarms
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
└── README.md
```

### Key Infrastructure Decisions

**Compute:** AWS ECS Fargate (serverless containers — no EC2 instance management)  
**Database:** AWS RDS PostgreSQL 17 (Multi-AZ in production)  
**Cache:** AWS ElastiCache Redis 7 (cluster mode in production)  
**File Storage:** AWS S3 (or MinIO self-hosted for DRC sovereign data requirements)  
**DNS / Load Balancer:** AWS ALB → ECS services  
**Secrets:** AWS Secrets Manager (not environment variables in ECS task definitions)  
**Logging:** CloudWatch Logs → centralized log group per service  
**Region:** `af-south-1` (Cape Town) — closest AWS region to DRC

---

## 6. NGINX Configuration

NGINX acts as the reverse proxy and TLS terminator sitting in front of all services.

```nginx
# /etc/nginx/sites-available/govsphere.conf

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name govsphere.gouv.cd api.govsphere.gouv.cd;
    return 301 https://$host$request_uri;
}

# Web Application
server {
    listen 443 ssl http2;
    server_name govsphere.gouv.cd;

    ssl_certificate     /etc/ssl/govsphere.crt;
    ssl_certificate_key /etc/ssl/govsphere.key;
    ssl_protocols       TLSv1.3 TLSv1.2;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers (see Security Architecture doc)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API + WebSocket
server {
    listen 443 ssl http2;
    server_name api.govsphere.gouv.cd;

    ssl_certificate     /etc/ssl/govsphere-api.crt;
    ssl_certificate_key /etc/ssl/govsphere-api.key;

    # REST API
    location /v1/ {
        proxy_pass http://api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;   # Keep WebSocket alive for 1 hour
    }
}
```

---

## 7. Secrets Management

### Rule: No Secrets in Code or CI Logs

Secrets are never committed to the repository, never printed to logs, and never passed as plain
environment variables in container definitions.

### Secret Storage by Environment

| Environment          | Secrets Store                      |
| -------------------- | ---------------------------------- |
| Local development    | `.env` file (gitignored)           |
| CI/CD                | GitHub Actions Secrets (encrypted) |
| Staging / Production | AWS Secrets Manager                |

### AWS Secrets Manager Integration

At container startup, the ECS task definition retricts secrets from AWS Secrets Manager via IAM role
— no secrets appear in plaintext in ECS console or CloudWatch logs.

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:af-south-1:123456789:secret:govsphere/prod/database-url"
    },
    {
      "name": "JWT_PRIVATE_KEY",
      "valueFrom": "arn:aws:secretsmanager:af-south-1:123456789:secret:govsphere/prod/jwt-private-key"
    }
  ]
}
```

### Secret Rotation Policy

| Secret                      | Rotation Frequency |
| --------------------------- | ------------------ |
| Database password           | 90 days            |
| JWT private/public key pair | 180 days           |
| MinIO access keys           | 90 days            |
| Redis password              | 90 days            |
| SMTP credentials            | 180 days           |

---

## 8. Observability Stack

### Metrics (Prometheus + Grafana)

The NestJS API exposes a `/metrics` endpoint in Prometheus format via `@willsoto/nestjs-prometheus`.
Metrics include:

- HTTP request rate, latency (p50, p90, p99), error rate
- Active WebSocket connections
- BullMQ queue depth per queue
- Database connection pool size
- Memory usage, CPU usage

Grafana dashboards are pre-configured for:

- API health overview
- Authentication events (login success/failure rate)
- Message throughput (messages/second)
- File upload/download rate
- Error budget tracking (SLO monitoring)

### Logging (Loki + Grafana)

All application logs go to stdout/stderr in JSON format. ECS Fargate ships them to CloudWatch Logs →
Grafana Loki.

```typescript
// Logging format — every log line is structured JSON
{
  "level": "info",
  "timestamp": "2026-06-24T10:00:00.000Z",
  "service": "api",
  "traceId": "abc123",
  "userId": "clx...",
  "action": "message.send",
  "channelId": "clx...",
  "duration_ms": 12,
  "message": "Message sent successfully"
}
```

**Log Levels:**

- `error` — actionable failures (bug, infrastructure outage)
- `warn` — degraded behavior (rate limit hit, retry needed)
- `info` — significant business events (login, message sent, file uploaded)
- `debug` — verbose diagnostic (only enabled in local dev, never in production)

### Alerting

Alerts are triggered via Grafana Alerting → PagerDuty:

| Alert                              | Threshold                    | Severity            |
| ---------------------------------- | ---------------------------- | ------------------- |
| API error rate                     | > 1% for 5 minutes           | P1                  |
| API p99 latency                    | > 2 seconds for 5 minutes    | P2                  |
| Database connection pool exhausted | 90% full for 2 minutes       | P1                  |
| BullMQ queue depth                 | > 10,000 jobs for 10 minutes | P2                  |
| Disk usage                         | > 80%                        | P2                  |
| Failed login spike                 | > 100/minute                 | P2 (security alert) |

---

## 9. Backup and Disaster Recovery

### Backup Strategy

| Data             | Method                      | Frequency              | Retention |
| ---------------- | --------------------------- | ---------------------- | --------- |
| PostgreSQL       | RDS automated snapshot      | Daily                  | 30 days   |
| PostgreSQL       | pg_dump + S3 encryption     | Hourly (WAL streaming) | 7 days    |
| MinIO / S3 files | S3 cross-region replication | Continuous             | 365 days  |
| Redis            | RDB snapshot to S3          | Every 6 hours          | 7 days    |

### Recovery Targets

| Metric                         | Target                            |
| ------------------------------ | --------------------------------- |
| RTO (Recovery Time Objective)  | 4 hours (time to restore service) |
| RPO (Recovery Point Objective) | 1 hour (maximum data loss)        |

### Disaster Recovery Runbook

```
Scenario 1: Database corruption
  1. Identify the timestamp of last known-good state
  2. Restore RDS from automated snapshot or pg_dump
  3. Verify data integrity with row count spot checks
  4. Re-run Prisma migrations if schema was ahead of backup
  5. Restart API services
  6. Notify affected users of data gap

Scenario 2: Complete infrastructure loss
  1. Provision new environment with Terraform (target: 30 minutes)
  2. Restore database from most recent backup
  3. Restore MinIO files from S3 replica
  4. Update DNS to new environment
  5. Verify all health checks pass
  6. Open traffic

Scenario 3: Security breach
  1. Immediately: revoke all active sessions (invalidate JWT signing keys)
  2. Immediately: rotate all secrets (database, Redis, MinIO, JWT)
  3. Isolate affected services (disable external traffic)
  4. Forensic audit of audit_logs table
  5. Engage security incident response team
  6. Notify government stakeholders per incident response plan
  7. Restore from last known-clean backup if data was tampered
```

---

## 10. Future: Kubernetes Migration

The initial production deployment uses ECS Fargate for simplicity. When traffic and team size
justify the complexity, GovSphere will migrate to Kubernetes (EKS):

```
ECS Fargate (v0.x - v1.x)
  → Simpler operations, managed by AWS
  → Sufficient for initial scale

Kubernetes/EKS (v2.0+)
  → Horizontal pod autoscaling per service
  → Custom resource limits per service
  → Istio service mesh for inter-service mTLS
  → ArgoCD for GitOps deployments
  → Helm charts for environment management
```

The Dockerfile standards and container architecture defined in this document are designed to be
compatible with Kubernetes from day one — no refactoring will be needed at migration time.
