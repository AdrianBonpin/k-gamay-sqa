# syntax=docker/dockerfile:1

# ── Stage 1: Install all workspace dependencies ──────────────────────
FROM oven/bun:1.3 AS deps
WORKDIR /app

# Copy workspace root and per-package manifests first for caching
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src ./packages/shared/src

RUN bun install --frozen-lockfile

# ── Stage 2: Build frontend (Vite → dist/) ───────────────────────────
FROM deps AS builder
COPY . .

WORKDIR /app/apps/frontend
RUN bun run build

# ── Stage 3: Production runtime image ────────────────────────────────
FROM oven/bun:1.3 AS runner
WORKDIR /app

# Copy workspace manifests and pre-installed node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY --from=deps /app/node_modules ./node_modules

# Copy shared types package (used by frontend at build time, but keep for consistency)
COPY --from=builder /app/packages ./packages

# Copy backend source and package metadata
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/tsconfig.json ./apps/backend/
COPY --from=builder /app/apps/backend/drizzle.config.ts ./apps/backend/
COPY --from=builder /app/apps/backend/drizzle ./apps/backend/drizzle
COPY --from=builder /app/apps/backend/src ./apps/backend/src
COPY --from=builder /app/apps/backend/seed ./apps/backend/seed

# Copy built frontend (served by backend in production)
COPY --from=builder /app/apps/frontend/dist ./apps/frontend/dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:4000/api/health').then(r => { if (!r.ok) throw new Error('unhealthy') })"]

CMD ["bun", "run", "apps/backend/src/index.ts"]
