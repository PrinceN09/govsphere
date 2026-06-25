# =============================================================================
# GovSphere API — Production Dockerfile
# =============================================================================
# Multi-stage build:
#   1. deps    — install production dependencies (node_modules, no devDeps)
#   2. build   — compile TypeScript + generate Prisma client
#   3. runtime — minimal image: node + dist + node_modules (no build tools)
#
# Build context: repo root (needed for shared packages in /packages)
#   docker build -f apps/api/Dockerfile -t govsphere-api .
# =============================================================================

# ── Stage 1: Install ALL dependencies (build + runtime) ──────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests for dependency installation
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/

# Install all deps (including devDeps needed for Prisma generate + TypeScript build)
RUN npm ci --legacy-peer-deps

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true

# Copy source
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build the NestJS API
RUN cd apps/api && npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install dumb-init for correct PID 1 signal handling in containers
RUN apk add --no-cache dumb-init

# Non-root user for security
RUN addgroup --system --gid 1001 govsphere \
 && adduser  --system --uid 1001 --ingroup govsphere govsphere

WORKDIR /app

ENV NODE_ENV=production

# Copy built output
COPY --from=builder --chown=govsphere:govsphere /app/apps/api/dist ./dist
COPY --from=builder --chown=govsphere:govsphere /app/node_modules ./node_modules
COPY --from=builder --chown=govsphere:govsphere /app/packages/database/prisma ./packages/database/prisma

# Prisma generated client (platform-specific binaries must be in runtime image)
COPY --from=builder --chown=govsphere:govsphere \
  /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=govsphere:govsphere \
  /app/node_modules/@prisma ./node_modules/@prisma

USER govsphere

EXPOSE 4000

# Run Prisma migrations then start the server
# Use dumb-init to correctly handle SIGTERM from orchestrators
CMD ["dumb-init", "node", "dist/main.js"]
