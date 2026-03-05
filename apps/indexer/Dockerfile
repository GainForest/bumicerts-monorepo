# syntax=docker/dockerfile:1
#
# Multi-stage Dockerfile for @gainforest/indexer
#
# Build context must be the MONOREPO ROOT (atproto-packages/), not this directory.
#
# Build:
#   docker build -f apps/indexer/Dockerfile -t gainforest-indexer .
#
# Run:
#   docker run --env-file apps/indexer/.env gainforest-indexer
#
# Or via monorepo root script:
#   docker build -f apps/indexer/Dockerfile -t gainforest-indexer .
#   docker run --env-file apps/indexer/.env gainforest-indexer

# ─────────────────────────────────────────────────────────────
# Stage 1: install deps + copy source
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder

WORKDIR /repo

# Copy workspace manifests first for layer caching
COPY package.json bun.lock* ./
COPY apps/indexer/package.json apps/indexer/
# Patches must live at the workspace root so bun can find them during install
COPY apps/indexer/patches/ patches/
# GENERATED workspace package.json is needed so bun can resolve the workspace
COPY GENERATED/package.json GENERATED/

# Install only the indexer's dependencies (hoisted into /repo/node_modules)
RUN bun install --frozen-lockfile --filter @gainforest/indexer

# Copy the pre-generated lexicons and types (committed to git)
COPY GENERATED/lexicons/ GENERATED/lexicons/

# Copy the indexer source (includes pre-generated src/generated/ and src/tap/)
COPY apps/indexer/src/ apps/indexer/src/
COPY apps/indexer/tsconfig.json apps/indexer/

# ─────────────────────────────────────────────────────────────
# Stage 2: minimal runtime image
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runtime

WORKDIR /app

# Copy only what's needed to run the indexer
COPY --from=builder /repo/node_modules/ ./node_modules/
COPY --from=builder /repo/apps/indexer/src/ ./src/
COPY --from=builder /repo/apps/indexer/tsconfig.json ./

# Health check — polls the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${HEALTH_PORT:-4001}/health | grep -q '"status":"ok"' || exit 1

EXPOSE 4000
EXPOSE 4001

CMD ["bun", "run", "src/index.ts"]
