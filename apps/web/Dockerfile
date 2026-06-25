# =============================================================================
# GovSphere Web — Production Dockerfile
# =============================================================================
# Multi-stage build using Next.js standalone output.
# next.config.ts must have: output: "standalone"
#
# Build context: repo root
#   docker build -f apps/web/Dockerfile -t govsphere-web .
# =============================================================================

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN npm ci --legacy-peer-deps

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Build Next.js — produces .next/standalone
RUN cd apps/web && npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache dumb-init

RUN addgroup --system --gid 1001 govsphere \
 && adduser  --system --uid 1001 --ingroup govsphere govsphere

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone server bundle
COPY --from=builder --chown=govsphere:govsphere \
  /app/apps/web/.next/standalone ./
COPY --from=builder --chown=govsphere:govsphere \
  /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=govsphere:govsphere \
  /app/apps/web/public ./apps/web/public

USER govsphere

EXPOSE 3000

CMD ["dumb-init", "node", "apps/web/server.js"]
