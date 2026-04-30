# Elysia + Drizzle + Better-Auth Migration — Design Spec

**Date:** 2026-04-30
**Status:** Approved
**Context:** Migrate the SQA Food Delivery backend from Express + SQLite to Elysia (Bun) + PostgreSQL (Drizzle ORM) + Better-Auth, while keeping the same API contract for the frontend.

---

## 1. Goals

1. Replace Express with Elysia (Bun-native HTTP framework).
2. Replace SQLite (better-sqlite3) with PostgreSQL via Drizzle ORM.
3. Replace custom JWT/bcrypt auth with Better-Auth (email + password).
4. Set up Eden Treaty for optional end-to-end type safety.
5. Preserve exact API contract so the React frontend needs minimal changes.
6. Establish testing infrastructure using Bun's native test runner.
7. Improve project docs: README, `.env.example`, `CHANGELOG.md`.

---

## 2. Decisions

| Decision | Choice |
|----------|--------|
| Data migration | Clean slate — seed fresh test data |
| PostgreSQL | User's existing PostgreSQL instance |
| Test runner | Bun native (`bun test`) |
| Backend language | Full TypeScript (`.ts`) |
| Architecture approach | Approach B — fresh backend, same API contract |

---

## 3. File Structure

```
apps/backend/
├── src/
│   ├── index.ts              # Entry point — creates Elysia app, starts server
│   ├── app.ts                # Elysia app composition (plugins, guards, routes)
│   ├── config.ts             # Environment config (typed, validated)
│   ├── db/
│   │   ├── schema.ts         # Drizzle ORM schema (all tables)
│   │   └── index.ts          # DB connection + singleton getter + migrate + seed
│   ├── auth/
│   │   └── index.ts          # Better-Auth Elysia plugin config + auth guard
│   ├── routes/
│   │   ├── health.ts         # GET /api/health, GET /metrics
│   │   ├── auth.ts           # Auth wrapper routes (translates Better-Auth to existing contract)
│   │   ├── menu.ts           # GET /api/menu
│   │   ├── orders.ts         # POST/GET /api/orders, GET/PATCH /api/orders/:id/status
│   │   ├── promo.ts          # POST /api/promo/validate, GET /api/promo/codes
│   │   └── ratings.ts        # POST/GET /api/ratings/*
│   ├── services/
│   │   ├── menuService.ts
│   │   ├── orderService.ts
│   │   ├── promoService.ts
│   │   └── ratingService.ts
│   ├── middleware/
│   │   ├── rateLimit.ts      # Elysia rate-limit plugin config
│   │   └── requestId.ts      # Request ID + logging hook
│   ├── lib/
│   │   ├── money.ts          # Cents utilities (integer-based money math)
│   │   └── errors.ts         # HttpError class + global error handler hook
│   └── seed/
│       ├── menu.json         # Menu seed data (existing, unchanged)
│       └── index.ts          # Seed runner (menu items + promo codes)
├── tests/
│   ├── setup.ts              # Fresh app factory for tests
│   ├── health.test.ts
│   ├── auth.test.ts
│   ├── menu.test.ts
│   ├── orders.test.ts
│   ├── promo.test.ts
│   └── ratings.test.ts
├── package.json
├── tsconfig.json
├── drizzle.config.ts         # Drizzle Kit config
└── .env.example
```

---

## 4. Drizzle ORM Schema

All tables are defined in `src/db/schema.ts` using `drizzle-orm/pg-core`. Migration SQL is generated via `drizzle-kit generate` and applied at startup via `drizzle-kit migrate`.

### Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `menu_items` | id, name, description, price, image_url, category | Seed from `menu.json` |
| `promos` | code (PK), discount, description, expires_at, max_uses, max_per_user, first_order_only | Seed from hard-coded promo list |
| `delivery_addresses` | id, user_id (FK→users.id), name, address, phone, created_at | Created per order |
| `orders` | id, user_id (FK→users.id), total_cents, status, promo_code, discount, delivery_address_id, created_at | Status: pending/in_progress/delivered |
| `order_items` | id, order_id (FK→orders.id CASCADE), menu_id (FK→menu_items.id), qty, price_at_order | One row per item in order |
| `ratings` | id, user_id (FK→users.id CASCADE), menu_id (FK→menu_items.id CASCADE), stars (1-5), review, created_at | Unique constraint on (user_id, menu_id) |

### Better-Auth Tables

Better-Auth manages its own tables via the Drizzle adapter: `user`, `session`, `account`. Our `orders.user_id`, `ratings.user_id`, and `delivery_addresses.user_id` reference Better-Auth's `user.id` column.

---

## 5. Route Mapping

| Express Route | Elysia File | Auth | Notes |
|---|---|---|---|
| `GET /api/health` | `routes/health.ts` | No | DB health check |
| `GET /metrics` | `routes/health.ts` | No | Prometheus metrics endpoint |
| `POST /api/auth/signup` | `routes/auth.ts` | No | Wraps Better-Auth signup, returns `{ token, user }` |
| `POST /api/auth/login` | `routes/auth.ts` | No | Wraps Better-Auth login, returns `{ token, user }` |
| `POST /api/auth/logout` | `routes/auth.ts` | Yes | Wraps Better-Auth logout |
| `GET /api/menu` | `routes/menu.ts` | No | Menu items with rating summaries |
| `POST /api/orders` | `routes/orders.ts` | Yes | Create order with items + promo + delivery |
| `GET /api/orders` | `routes/orders.ts` | Yes | List user's orders |
| `GET /api/orders/:id` | `routes/orders.ts` | Yes | Get single order |
| `PATCH /api/orders/:id/status` | `routes/orders.ts` | Yes | Advance status (pending→in_progress→delivered) |
| `POST /api/promo/validate` | `routes/promo.ts` | No | Validate promo code shape |
| `GET /api/promo/codes` | `routes/promo.ts` | No | List active promos |
| `POST /api/ratings` | `routes/ratings.ts` | Yes | Submit/update rating (requires delivered order) |
| `GET /api/ratings/summary` | `routes/ratings.ts` | No | Total ratings count |
| `GET /api/ratings/:menuId` | `routes/ratings.ts` | No | Summary + ratings list for menu item |
| `GET /api/ratings/:menuId/mine` | `routes/ratings.ts` | Yes | Current user's rating for menu item |

### Route Composition Pattern

Each route file exports an Elysia instance as a plugin:

```typescript
export const ordersRoutes = new Elysia({ prefix: '/orders' })
  .use(authGuard)
  .post('/', handler, { body: schema })
  .get('/', handler)
  .get('/:id', handler)
  .patch('/:id/status', handler, { body: schema });
```

These are composed in `app.ts`:

```typescript
const app = new Elysia()
  .use(corsPlugin)
  .use(rateLimitPlugin)
  .use(authPlugin)       // Better-Auth
  .use(healthRoutes)     // prefix: none (handles /api/health, /metrics)
  .use(authRoutes)       // prefix: /api/auth
  .use(menuRoutes)       // prefix: /api/menu
  .use(ordersRoutes)     // prefix: /api/orders
  .use(promoRoutes)      // prefix: /api/promo
  .use(ratingsRoutes)    // prefix: /api/ratings
  .onError(errorHandler);
```

**Note on prefix strategy:** Some routes use Elysia's built-in `prefix`, others may use explicit paths. The implementation favors whichever produces the cleanest composition. The API contract (path) is the invariant — not how it's internally registered.

---

## 6. Better-Auth Integration

### Configuration

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ['http://localhost:5173'],
});
```

### Auth Wrapper Routes

Better-Auth's native endpoints use different response shapes. Thin wrapper routes in `routes/auth.ts` translate to the existing `{ token, user }` contract the frontend expects:

- `POST /api/auth/signup` → calls Better-Auth signUp → returns `{ token: session.token, user: { id, email, name } }`
- `POST /api/auth/login` → calls Better-Auth signIn → returns `{ token: session.token, user: { id, email, name } }`
- `POST /api/auth/logout` → calls Better-Auth signOut → returns `{ ok: true }`

### Auth Guard

A reusable Elysia hook that extracts the session from Better-Auth's context:

```typescript
const authGuard = new Elysia().derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    set.status = 401;
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required');
  }
  return { user: session.user };
});
```

---

## 7. Error Handling

Single `HttpError` class extended from `Error`. Thrown anywhere in route handlers or services. Caught by a global Elysia `onError` hook:

```typescript
// lib/errors.ts
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// In app.ts — global hook
app.onError(({ error, set }) => {
  if (error instanceof HttpError) {
    set.status = error.status;
    return { error: { code: error.code, message: error.message } };
  }
  // Unexpected errors — log and return generic
  console.error(error);
  set.status = 500;
  return { error: { code: 'INTERNAL', message: 'Internal server error' } };
});
```

Response shape: `{ error: { code: string, message: string } }` — matches existing contract.

---

## 8. CORS, Helmet, Rate Limiting

### CORS
Elysia's native `cors` plugin — same origin allowlist, same behavior as Express equivalent.

### Security Headers
No direct Helmet equivalent for Elysia. Use a custom `onRequest` hook that sets security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (production only)
- CSP headers as needed

### Rate Limiting
Use `@elysiajs/rate-limit` or equivalent plugin:
- Global: 300 req / 15 min window for `/api/*`
- Auth: 10 req / 15 min for `/api/auth/login`, `/api/auth/signup`
- Bypass in test environment (config-gated)

---

## 9. Logging

Replace pino with Bun's native console or a lightweight Elysia logger. Request ID middleware generates a UUID per request and attaches it to logs.

If structured logging is required, `pino` can be kept as a Bun-compatible dependency (pino works in Bun).

---

## 10. Metrics

Port the prom-client setup to Elysia. Prom-client is a JS library — works in Bun. Same `Histogram` and `Counter` metrics, exposed on `/metrics`. The middleware becomes an Elysia hook that records duration and increments counters on response finish.

---

## 11. Testing Strategy

### Infrastructure
- **Runner:** `bun test` (Bun native, Jest-compatible assertions)
- **Setup:** `tests/setup.ts` — creates a fresh Elysia app per test, pointing at a test PostgreSQL database
- **Isolation:** Each test file gets a clean DB (truncate tables or use a dedicated test DB)
- **No MSW for backend tests** — integration tests hit the real Elysia app via `fetch()`

### Test Coverage Tracking

A markdown file (`docs/TEST-CASES.md`) tracks all test cases:

| Module | Unit Tests | Integration Tests | Edge Cases |
|--------|-----------|-------------------|------------|
| Health | DB up returns 200, DB down returns 503 | Full endpoint | — |
| Auth | Signup validation, login invalid creds, duplicate email | Signup→login→logout flow, token expiry | Missing fields, SQL injection attempts |
| Menu | — | List all items with rating summaries | Empty DB, item not found |
| Orders | Money math (toCents/fromCents/applyDiscountCents), status transition validation | Create→list→get→update status flow | Invalid menuId, zero qty, expired promo, maxUses exceeded, firstOrderOnly violation |
| Promo | Lookup by code, expiry check, maxUses check | Validate + apply to order | Missing code, invalid discount fraction |
| Ratings | Star validation (0, 6, non-integer), review max length | Submit→fetch→summary→my rating | Rating without delivered order, duplicate rating (upsert), non-existent menu item |

### Frontend Tests
Existing frontend tests using MSW + Vitest continue to work. The MSW handlers need to match the new API responses. No changes to the test framework.

---

## 12. Frontend Migration

### Minimal Changes (Same API Contract)

**`src/api/client.ts`:**
- Update `baseURL` from proxy-based to explicit new backend URL
- Keep Axios interceptor logic (token attachment, 401 handling)

**`src/api/auth.ts`:**
- Adjust response type destructuring if Better-Auth's wrapper returns slightly different shapes
- Core functions (`login`, `signup`, `logoutApi`) remain the same

**Everything else untouched:**
- `menu.ts`, `orders.ts`, `promo.ts`, `ratings.ts` — all API calls use the same paths and payloads

### Eden Treaty (Optional, Future Phase)

For a later phase, export the Elysia app type and use Eden on the frontend:

```typescript
// frontend/src/api/client.ts (with Eden)
import { treaty } from '@elysiajs/eden';
import type { App } from '../../backend/src/app';
export const api = treaty<App>('http://localhost:3001');
```

Benefits: full type inference, compile-time URL checking, no manual response typing.

---

## 13. Project Config & Tooling

### Root `package.json` Changes

- Switch scripts from `npm`/`npm-run-all` to `bun`
- Workspaces: Bun reads `workspaces` from `package.json` natively
- Remove `npm-run-all` dependency
- Add concurrent dev script using `bun --filter`

### New `tsconfig.json` (backend)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

### `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

---

## 14. Documentation Deliverables

### `.env.example` (root level)

```env
# =============================================================================
# Environment Configuration
# =============================================================================
# Copy this file to .env.local and fill in your actual values
# Never commit .env.local to version control
# =============================================================================

# -----------------------------------------------------------------------------
# SYSTEM & DEPLOYMENT
# -----------------------------------------------------------------------------
NIXPACKS_NODE_VERSION=22

# -----------------------------------------------------------------------------
# DATABASE
# -----------------------------------------------------------------------------
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

### `CHANGELOG.md`

Tracks all changes in [Keep a Changelog](https://keepachangelog.com/) format — sections: Added, Changed, Removed, Fixed.

### Updated `README.md`

- Updated tech stack reflects Elysia, Drizzle, PostgreSQL, Better-Auth, Bun
- Updated installation and dev commands (bun instead of npm)
- Updated environment section
- Retains QA workflow section

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Better-Auth response shapes differ from existing contract | Auth wrapper routes translate shapes |
| PostgreSQL connection failures | Health check endpoint, connection retry at startup |
| Frontend MSW test handlers break | Update MSW handlers to match new responses |
| Bun/Elysia ecosystem gaps (no direct Helmet equivalent) | Manual security header hook |
| Drizzle migration drift | `drizzle-kit check` before deployment |
| Eden type complexity | Optional — can be skipped entirely; frontend works with Axios |

---

## 16. Out of Scope

- Data migration from SQLite to PostgreSQL (clean slate)
- Eden Treaty frontend integration (optional future phase)
- Better-Auth social login providers (email/password only)
- CI/CD pipeline setup
- Production deployment configuration
