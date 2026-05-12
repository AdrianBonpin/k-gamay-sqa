# System Completion & Hardening — Implementation Plan

> **CURRENT PROGRESS:** ALL PHASES COMPLETE ✅ — 26/26 tasks done

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure, optimize, and complete the K-Gamay food delivery system by fixing the unprotected manage API, removing Express dead code, integrating Better-Auth admin roles, eliminating N+1 queries, adding security headers, redesigning the admin dashboard to match the project theme, and filling feature gaps.

**Architecture:** Monorepo (Bun workspaces) — Elysia backend with PostgreSQL/Drizzle, React + Vite + TailwindCSS frontend. Better-Auth admin plugin enables role-based admin access instead of shared header password. All admin components are decomposed from one monolithic page into focused tab components using the existing warm/light design system.

**Tech Stack:** Bun, Elysia, Drizzle ORM (PostgreSQL), Better-Auth + admin plugin, React 18, Vite, TailwindCSS, Zustand, Axios

---

## Phase 1: Critical Security Fix — Wire Admin Guard

**Why this first:** The manage API routes at `/api/manage/*` currently have zero authentication — `requireManageAuth` is imported but never applied. This is a production vulnerability that must be patched before any other work.

### Task 1.1: Apply existing manageAuth guard to manage routes

**Files:**
- Modify: `apps/backend/src/routes/manage.ts:1-60` (add guard wrapping)
- Verify: manual `curl` test

- [x] **Step 1: Add guard to manageRoutes Elysia instance**

Open `apps/backend/src/routes/manage.ts`. The `manageRoutes` instance is defined on line ~50 as:
```typescript
export const manageRoutes = new Elysia({ prefix: '/api/manage' })
```

Wrap all route definitions inside a `.guard()` call using the already-imported `requireManageAuth`:

```typescript
import { requireManageAuth } from '../middleware/manageAuth';

export const manageRoutes = new Elysia({ prefix: '/api/manage' })
  .guard({ beforeHandle: requireManageAuth }, (app) =>
    app
      .get('/', async () => { /* ... existing dashboard handler ... */ })
      .get('/users', async () => { /* ... */ })
      // ... all remaining routes indented inside this guard
  );
```

The key change: move all existing `.get()`, `.post()`, `.patch()`, `.delete()` chains inside the `app => app...` callback of a `.guard({ beforeHandle: requireManageAuth }, ...)` wrapper. Ensure the closing of the guard matches properly.

- [x] **Step 2: Verify guard blocks unauthenticated requests**

```bash
curl -s http://localhost:4000/api/manage | jq .
```
Expected: `{ "error": { "code": "MANAGE_UNAUTHORIZED", "message": "Invalid management key" } }` with status 401.

- [x] **Step 3: Verify guard allows authenticated requests**

```bash
curl -s -H "x-manage-key: YOUR_MANAGE_PASSWORD" http://localhost:4000/api/manage | jq .
```
Expected: `{ "ok": true, "stats": { ... } }` with status 200.

- [x] **Step 4: Verify all manage sub-routes are protected**

```bash
curl -s http://localhost:4000/api/manage/users | jq .
curl -s http://localhost:4000/api/manage/orders | jq .
curl -s http://localhost:4000/api/manage/menu | jq .
curl -s http://localhost:4000/api/manage/promos | jq .
curl -s http://localhost:4000/api/manage/ratings | jq .
```
Expected: All return 401 `MANAGE_UNAUTHORIZED` without the header.

- [x] **Step 5: Commit**

```bash
git add apps/backend/src/routes/manage.ts
git commit -m "security: apply requireManageAuth guard to all /api/manage routes"
```

### Task 1.2: Run existing backend tests to confirm nothing is broken

- [x] **Step 1: Run the full backend test suite**

```bash
cd apps/backend && bun test
```

Expected: All tests pass. If any test accesses `/api/manage/*` without the `x-manage-key` header, they will now fail and need updating.

- [x] **Step 2: If manage tests exist and fail, update them to include the auth header**

If `tests/manage.test.ts` or similar exists, add the header to test requests:
```typescript
const res = await app.handle(
  new Request('http://localhost/api/manage', {
    headers: { 'x-manage-key': process.env.MANAGE_PASSWORD || 'test-key' }
  })
);
```

Set `MANAGE_PASSWORD=test-key` in test setup or `vitest.config.js` env.

- [x] **Step 3: Re-run tests to confirm all pass**

```bash
cd apps/backend && bun test
```
Expected: All green.

- [x] **Step 4: Commit any test fixes**

```bash
git add apps/backend/tests/
git commit -m "test: update manage tests to include x-manage-key header"
```

---

## Phase 2: Remove Express.js Dead Code

**Why:** The old Express files are vestigial and potentially confusing. Remove them to establish a clean Elysia-only backend. The entry point (`src/index.ts` → `src/app.ts`) already uses Elysia exclusively.

### Task 2.1: Delete all Express-era files

**Files to DELETE:**
- `apps/backend/app.js`
- `apps/backend/server.js`
- `apps/backend/config.js`
- `apps/backend/db.js`
- `apps/backend/routes/auth.js`
- `apps/backend/routes/manage.js`
- `apps/backend/routes/menu.js`
- `apps/backend/routes/orders.js`
- `apps/backend/routes/promo.js`
- `apps/backend/routes/ratings.js`
- `apps/backend/middleware/auth.js`
- `apps/backend/middleware/httpsOnly.js`
- `apps/backend/middleware/manageAuth.js`
- `apps/backend/middleware/rateLimit.js`
- `apps/backend/middleware/tokenDenylist.js`
- `apps/backend/services/authService.js`
- `apps/backend/services/orderService.js`
- `apps/backend/services/promoService.js`
- `apps/backend/services/ratingService.js`
- `apps/backend/lib/asyncHandler.js`
- `apps/backend/lib/logger.js`
- `apps/backend/lib/metrics.js`
- `apps/backend/lib/money.js`
- `apps/backend/package-lock.json`
- `apps/backend/.env.example` (superseded by root `.env.example`)

- [x] **Step 1: Delete the files**

```bash
cd /Users/adrianbonpin/Documents/Code/school/k-gamay-sqa

rm apps/backend/app.js
rm apps/backend/server.js
rm apps/backend/config.js
rm apps/backend/db.js
rm apps/backend/routes/auth.js
rm apps/backend/routes/manage.js
rm apps/backend/routes/menu.js
rm apps/backend/routes/orders.js
rm apps/backend/routes/promo.js
rm apps/backend/routes/ratings.js
rm apps/backend/middleware/auth.js
rm apps/backend/middleware/httpsOnly.js
rm apps/backend/middleware/manageAuth.js
rm apps/backend/middleware/rateLimit.js
rm apps/backend/middleware/tokenDenylist.js
rm apps/backend/services/authService.js
rm apps/backend/services/orderService.js
rm apps/backend/services/promoService.js
rm apps/backend/services/ratingService.js
rm apps/backend/lib/asyncHandler.js
rm apps/backend/lib/logger.js
rm apps/backend/lib/metrics.js
rm apps/backend/lib/money.js
rm apps/backend/package-lock.json
rm apps/backend/.env.example
```

- [x] **Step 2: Remove empty directories**

```bash
rmdir apps/backend/routes 2>/dev/null
rmdir apps/backend/middleware 2>/dev/null
rmdir apps/backend/services 2>/dev/null
rmdir apps/backend/lib 2>/dev/null
```

- [x] **Step 3: Verify the backend still starts**

```bash
cd apps/backend && bun run src/index.ts &
sleep 3
curl -s http://localhost:4000/api/health | jq .
kill %1
```

Expected: `{ "ok": true, "db": "ok", "service": "food-delivery-backend", "uptime": ... }`

- [x] **Step 4: Run the backend test suite**

```bash
cd apps/backend && bun test
```

Expected: All tests pass.

- [x] **Step 5: Verify frontend still builds (if it imports anything from removed paths)**

```bash
cd apps/frontend && bun run build
```

Expected: Build succeeds. The frontend imports from `@k-gamay/shared` and its own `api/` directory — neither should reference removed Express files.

- [x] **Step 6: Commit**

```bash
git add -A apps/backend/
git commit -m "chore: remove all Express.js dead code; backend is now Elysia-only"
```

---

## Phase 3: Better-Auth Admin Plugin Integration

**Why:** Replace the shared `x-manage-key` password approach with proper role-based admin authentication. Better-Auth's admin plugin provides user CRUD, role management, banning, impersonation, and session management out of the box.

### Task 3.1: Add admin plugin to Better-Auth configuration

**Files:**
- Modify: `apps/backend/src/auth/index.ts`
- Verify: `apps/backend/src/db/schema.ts` (review only — schema changes in Task 3.2)

- [x] **Step 1: Add admin plugin import and registration**

Open `apps/backend/src/auth/index.ts`. Add the admin plugin:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { getDb } from '../db';
import { config } from '../config';

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  trustedOrigins: config.corsOrigins,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    admin(),
  ],
});
```

- [x] **Step 2: Verify the file compiles**

```bash
cd apps/backend && bun run --check src/auth/index.ts
```

Expected: No TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add apps/backend/src/auth/index.ts
git commit -m "feat: add Better-Auth admin plugin to auth config"
```

### Task 3.2: Add admin schema columns to Drizzle and run migration

**Files:**
- Modify: `apps/backend/src/db/schema.ts`
- Run: `drizzle-kit generate` and `drizzle-kit migrate`

- [x] **Step 1: Add admin plugin columns to the user table in schema.ts**

Open `apps/backend/src/db/schema.ts`. Add these fields to the `user` table definition:

```typescript
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  name: text('name').notNull(),
  image: text('image'),
  // Admin plugin fields
  role: text('role').default('user').notNull(),
  banned: boolean('banned').default(false).notNull(),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});
```

And add to the `session` table:
```typescript
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  // Admin plugin field
  impersonatedBy: text('impersonated_by'),
});
```

- [x] **Step 2: Generate the migration**

```bash
cd apps/backend && bun run db:generate
```

Expected: A new SQL file appears in `apps/backend/drizzle/` with ALTER TABLE ADD COLUMN statements.

- [x] **Step 3: Apply the migration**

```bash
cd apps/backend && bun run db:migrate
```

Expected: Migration runs successfully. Existing users get `role = 'user'` as default.

- [x] **Step 4: Verify the backend still starts and auth works**

```bash
cd apps/backend && bun run src/index.ts &
sleep 3
curl -s -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test"}' | jq .
kill %1
```

Expected: Signup succeeds with token and user in response.

- [x] **Step 5: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/drizzle/
git commit -m "feat: add admin plugin columns (role, banned, impersonatedBy) to Drizzle schema"
```

### Task 3.3: Create admin guard middleware

**Files:**
- Create: `apps/backend/src/middleware/adminGuard.ts`
- Modify: `apps/backend/src/routes/manage.ts` (wire admin guard)

- [x] **Step 1: Create the admin guard middleware**

Create `apps/backend/src/middleware/adminGuard.ts`:

```typescript
import { Elysia } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

/**
 * Elysia guard that requires:
 * 1. A valid Better-Auth session (user is signed in)
 * 2. The user has the 'admin' role (or is in the adminUserIds list)
 *
 * Replaces the old `requireManageAuth` + `x-manage-key` approach.
 */
export const adminGuard = new Elysia().derive(async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required');
  }

  const user = session.user as Record<string, unknown>;
  const roleStr: string = (user.role as string) ?? '';
  const roles = roleStr.split(',').map((r) => r.trim()).filter(Boolean);

  if (!roles.includes('admin')) {
    throw new HttpError(403, 'ADMIN_REQUIRED', 'Admin access required');
  }

  return { adminUser: session.user };
});
```

- [x] **Step 2: Wire adminGuard to manage routes**

Open `apps/backend/src/routes/manage.ts`. Replace the temporary `requireManageAuth` guard with the new `adminGuard`:

**Remove the old import line:**
```typescript
import { requireManageAuth } from '../middleware/manageAuth';
```

**Add the new import:**
```typescript
import { adminGuard } from '../middleware/adminGuard';
```

**Replace the guard:** Change `.guard({ beforeHandle: requireManageAuth }, (app) =>` to:
```typescript
  .use(adminGuard)
```

Then un-indent all routes so they chain directly on `manageRoutes` instead of being inside an `app =>` callback. The pattern becomes:

```typescript
export const manageRoutes = new Elysia({ prefix: '/api/manage' })
  .use(adminGuard)
  .get('/', async () => { /* dashboard */ })
  .get('/users', async () => { /* users */ })
  // ... all routes chain directly
```

- [x] **Step 3: Verify adminGuard blocks requests without a session**

Start the backend and test:

```bash
curl -s http://localhost:4000/api/manage | jq .
```

Expected: `{ "error": { "code": "AUTH_REQUIRED", "message": "Authentication required" } }` with status 401.

- [x] **Step 4: Verify adminGuard blocks non-admin users**

Sign up a regular user and try accessing manage:

```bash
# Sign up a regular user
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"regular@test.com","password":"password123","name":"Regular"}' | jq -r '.token')

# Try accessing manage with regular user token
curl -s http://localhost:4000/api/manage \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: `{ "error": { "code": "ADMIN_REQUIRED", "message": "Admin access required" } }` with status 403.

- [x] **Step 5: Commit**

```bash
git add apps/backend/src/middleware/adminGuard.ts apps/backend/src/routes/manage.ts
git commit -m "feat: create adminGuard middleware and wire to manage routes"
```

### Task 3.4: Create admin login route

**Files:**
- Create: `apps/backend/src/routes/admin-auth.ts`
- Modify: `apps/backend/src/app.ts` (register the route)

- [x] **Step 1: Create admin login route**

Create `apps/backend/src/routes/admin-auth.ts`:

```typescript
import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

export const adminAuthRoutes = new Elysia({ prefix: '/api/admin' })
  .post(
    '/login',
    async ({ body, set }) => {
      let result;
      try {
        result = await auth.api.signInEmail({
          body: {
            email: body.email as string,
            password: body.password as string,
          },
          asResponse: true,
        });
      } catch {
        throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      }

      const setCookie = result.headers.get('set-cookie');
      if (setCookie) {
        set.headers['set-cookie'] = setCookie;
      }

      const json = await result.json();

      // Verify the authenticated user has admin role
      const user = json.user as Record<string, unknown> | undefined;
      const roleStr: string = (user?.role as string) ?? '';
      const roles = roleStr.split(',').map((r) => r.trim()).filter(Boolean);

      if (!roles.includes('admin')) {
        // Sign them out immediately — not an admin
        await auth.api.signOut({ headers: new Headers({ cookie: setCookie ?? '' }) });
        throw new HttpError(403, 'NOT_ADMIN', 'This account does not have admin access');
      }

      return {
        token: json.token,
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          role: user?.role,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  );
```

- [x] **Step 2: Register admin auth routes in app.ts**

Open `apps/backend/src/app.ts`. Import and register the new route:

```typescript
import { adminAuthRoutes } from './routes/admin-auth';
```

Add to the app composition before `manageRoutes`:
```typescript
  .use(adminAuthRoutes)   // /api/admin/login
  .use(manageRoutes)      // /api/manage (admin guard applies internally)
```

- [x] **Step 3: Verify the admin login route works**

After seeding an admin user (Task 3.5), test:

```bash
curl -s -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kgamay.com","password":"admin123456"}' | jq .
```

Expected: `{ "token": "...", "user": { "id": "...", "email": "admin@kgamay.com", "name": "Admin", "role": "admin" } }` with status 200.

- [x] **Step 4: Verify non-admin login is rejected**

```bash
curl -s -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"regular@test.com","password":"password123"}' | jq .
```

Expected: `{ "error": { "code": "NOT_ADMIN", "message": "This account does not have admin access" } }` with status 403.

- [x] **Step 5: Commit**

```bash
git add apps/backend/src/routes/admin-auth.ts apps/backend/src/app.ts
git commit -m "feat: add admin login route with role verification"
```

### Task 3.5: Update seed script to create initial admin user

**Files:**
- Modify: `apps/backend/src/seed/index.ts`
- Modify: `.env.example` (add ADMIN_EMAIL/ADMIN_PASSWORD)

- [x] **Step 1: Add admin seeding logic**

Open `apps/backend/src/seed/index.ts`. Add the following after the existing seed logic (after promo seeding, before or after ratings seeding):

```typescript
// Seed admin user
const adminEmail = process.env.ADMIN_EMAIL || 'admin@kgamay.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

const [existingAdmin] = await db
  .select({ id: schema.user.id })
  .from(schema.user)
  .where(eq(schema.user.email, adminEmail));

if (!existingAdmin) {
  try {
    // Create user via Better-Auth's internal signup API
    const result = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: 'Admin',
      },
    });

    // Set the role to admin
    await db
      .update(schema.user)
      .set({ role: 'admin' })
      .where(eq(schema.user.email, adminEmail));

    console.log(`Admin user created: ${adminEmail}`);
  } catch (err) {
    console.error('Failed to create admin user:', err);
  }
}
```

You'll need to add the import for `auth` at the top:
```typescript
import { auth } from '../auth';
```

And add `eq` to the drizzle-orm imports if not already present.

- [x] **Step 2: Add admin env vars to root .env.example**

Open `.env.example` (root). Add after the `MANAGE_PASSWORD` section:

```env
# ── Admin Account ─────────────────────────────────────────────────────
# Initial admin user created by seed script on first run.
# Change the password after first login.
ADMIN_EMAIL=admin@kgamay.com
ADMIN_PASSWORD=admin123456
```

- [x] **Step 3: Verify admin user is created on startup**

Start the backend:
```bash
cd apps/backend && bun run src/index.ts
```

Look for the log line: `Admin user created: admin@kgamay.com`.

Then test login:
```bash
curl -s -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kgamay.com","password":"admin123456"}' | jq .
```

Expected: Successful login response with admin role.

- [x] **Step 4: Commit**

```bash
git add apps/backend/src/seed/index.ts .env.example
git commit -m "feat: seed initial admin user on startup"
```

### Task 3.6: Remove old requireManageAuth middleware

**Files to DELETE:**
- `apps/backend/src/middleware/manageAuth.ts`

- [x] **Step 1: Delete the old middleware**

```bash
rm apps/backend/src/middleware/manageAuth.ts
```

- [x] **Step 2: Verify no remaining imports**

```bash
grep -r "requireManageAuth" apps/backend/src/ || echo "No references found — clean"
grep -r "manageAuth" apps/backend/src/ || echo "No references found — clean"
```

Expected: "No references found — clean" for both.

- [x] **Step 3: Remove MANAGE_PASSWORD from .env.example**

Open `.env.example` (root). Remove or comment out the `MANAGE_PASSWORD` section:

```env
# ── Management Panel (DEPRECATED — replaced by Better-Auth admin plugin) ──
# MANAGE_PASSWORD is no longer used. Admin access is now via Better-Auth
# admin roles. Set ADMIN_EMAIL and ADMIN_PASSWORD below.
# MANAGE_PASSWORD=deprecated
```

- [x] **Step 4: Commit**

```bash
git add -A apps/backend/src/middleware/ .env.example
git commit -m "refactor: remove old x-manage-key auth; fully replaced by Better-Auth admin roles"
```

---

## Phase 4: Eliminate N+1 Query Anti-Patterns

**Why:** Multiple handlers execute per-row database queries in loops, causing linear/quadratic degradation as data grows. Fix using batch-loading with `inArray()` and in-memory `Map` grouping.

### Task 4.1: Create batch-loader utility and fix manage users

**Files:**
- Create: `apps/backend/src/lib/batchLoader.ts`
- Modify: `apps/backend/src/routes/manage.ts` (users and promos handlers)

- [x] **Step 1: Create the groupBy utility**

Create `apps/backend/src/lib/batchLoader.ts`:

```typescript
/** Groups an array by a key extracted from each element. */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
```

- [x] **Step 2: Fix GET /api/manage/users — batch order counts**

Open `apps/backend/src/routes/manage.ts`. In the `GET /users` handler, replace the per-user order count loop:

**Before (current):**
```typescript
const enriched = await Promise.all(
  users.map(async (u) => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(eq(schema.orders.userId, u.id));
    return { ...u, createdAt: u.createdAt.toISOString(), orderCount: Number(row.n) };
  }),
);
```

**After (batched):**
```typescript
// Batch-load order counts for all users
const userIds = users.map((u) => u.id);
const orderCounts = userIds.length > 0
  ? await db
      .select({
        userId: schema.orders.userId,
        n: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.userId, userIds))
      .groupBy(schema.orders.userId)
  : [];

const countMap = new Map(orderCounts.map((r) => [r.userId, Number(r.n)]));

const enriched = users.map((u) => ({
  ...u,
  createdAt: u.createdAt.toISOString(),
  orderCount: countMap.get(u.id) ?? 0,
}));
```

- [x] **Step 3: Fix GET /api/manage/promos — batch usage counts**

In the `GET /promos` handler, replace the per-promo usage count loop:

**After (batched):**
```typescript
// Batch-load usage counts for all promos
const promoCodes = rows.map((p) => p.code);
const usageCounts = promoCodes.length > 0
  ? await db
      .select({
        promoCode: schema.orders.promoCode,
        n: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.promoCode, promoCodes))
      .groupBy(schema.orders.promoCode)
  : [];

const usageMap = new Map(usageCounts.map((r) => [r.promoCode, Number(r.n)]));

const enriched = rows.map((p) => ({
  ...p,
  expiresAt: p.expiresAt?.toISOString() ?? null,
  firstOrderOnly: Boolean(p.firstOrderOnly),
  useCount: usageMap.get(p.code) ?? 0,
}));
```

- [x] **Step 4: Run tests to verify**

```bash
cd apps/backend && bun test
```

Expected: All tests pass.

- [x] **Step 5: Commit**
git commit -m "perf: batch-load order counts and promo usage to fix N+1 queries"
```

### Task 4.2: Fix N+1 in manage orders and customer orders

**Files:**
- Modify: `apps/backend/src/routes/manage.ts` (orders handlers)
- Modify: `apps/backend/src/services/orderService.ts` (listOrders)

- [x] **Step 1: Fix GET /api/manage/orders — batch items and delivery**

In the `GET /orders` handler in `manage.ts`, replace the per-order items/delivery loop.

After fetching `orderRows`, add batch loading:

```typescript
// Collect all order IDs and delivery address IDs
const orderIds = orderRows.map((o) => o.id);
const deliveryIds = orderRows
  .map((o) => o.deliveryAddressId)
  .filter((id): id is number => id !== null);

// Batch-load all items in one query
const allItems = orderIds.length > 0
  ? await db
      .select({
        orderItemId: schema.orderItems.id,
        orderId: schema.orderItems.orderId,
        menuId: schema.orderItems.menuId,
        qty: schema.orderItems.qty,
        priceAtOrder: schema.orderItems.priceAtOrder,
        name: schema.menuItems.name,
        imageUrl: schema.menuItems.imageUrl,
      })
      .from(schema.orderItems)
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuId, schema.menuItems.id))
      .where(inArray(schema.orderItems.orderId, orderIds))
  : [];

// Batch-load all delivery addresses in one query
const allAddresses = deliveryIds.length > 0
  ? await db
      .select({
        id: schema.deliveryAddresses.id,
        name: schema.deliveryAddresses.name,
        address: schema.deliveryAddresses.address,
        phone: schema.deliveryAddresses.phone,
      })
      .from(schema.deliveryAddresses)
      .where(inArray(schema.deliveryAddresses.id, deliveryIds))
  : [];

// Group by parent ID
const { groupBy } = await import('../lib/batchLoader');
const itemsByOrder = groupBy(allItems, (it) => it.orderId);
const addressById = new Map(allAddresses.map((a) => [a.id, a]));

// Enrich orders
const enriched = orderRows.map((o) => {
  const items = (itemsByOrder.get(o.id) ?? []).map((it) => ({
    id: it.orderItemId,
    menuId: it.menuId,
    qty: it.qty,
    priceAtOrder: it.priceAtOrder,
    name: it.name,
    imageUrl: it.imageUrl,
  }));

  const addr = o.deliveryAddressId ? addressById.get(o.deliveryAddressId) : undefined;
  const delivery = addr ? { name: addr.name, address: addr.address, phone: addr.phone } : null;

  return {
    id: o.id,
    userId: o.userId,
    userEmail: o.userEmail,
    userName: o.userName,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    total: fromCents(o.totalCents),
    totalCents: o.totalCents,
    promoCode: o.promoCode ?? null,
    discount: typeof o.discount === 'number' ? o.discount : 0,
    items,
    delivery,
  };
});

return enriched;
```

- [x] **Step 2: Fix customer listOrders in orderService.ts**

Open `apps/backend/src/services/orderService.ts`. In `listOrders()`, apply the same batch-loading pattern:

After fetching `rows` (all orders), collect IDs and batch-load:

```typescript
export async function listOrders(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(sql`${schema.orders.createdAt} desc`);

  if (rows.length === 0) return [];

  // Batch-load items
  const orderIds = rows.map((o) => o.id);
  const allItems = await db
    .select({
      orderItemId: schema.orderItems.id,
      orderId: schema.orderItems.orderId,
      menuId: schema.orderItems.menuId,
      qty: schema.orderItems.qty,
      priceAtOrder: schema.orderItems.priceAtOrder,
      name: schema.menuItems.name,
      description: schema.menuItems.description,
      imageUrl: schema.menuItems.imageUrl,
      category: schema.menuItems.category,
    })
    .from(schema.orderItems)
    .innerJoin(schema.menuItems, eq(schema.orderItems.menuId, schema.menuItems.id))
    .where(inArray(schema.orderItems.orderId, orderIds));

  // Batch-load addresses
  const deliveryIds = rows
    .map((o) => o.deliveryAddressId)
    .filter((id): id is number => id !== null);
  const allAddresses = deliveryIds.length > 0
    ? await db
        .select({
          id: schema.deliveryAddresses.id,
          name: schema.deliveryAddresses.name,
          address: schema.deliveryAddresses.address,
          phone: schema.deliveryAddresses.phone,
        })
        .from(schema.deliveryAddresses)
        .where(inArray(schema.deliveryAddresses.id, deliveryIds))
    : [];

  // Group helpers
  function groupByOrderId<T extends { orderId: number }>(arr: T[]): Map<number, T[]> {
    const m = new Map<number, T[]>();
    for (const it of arr) {
      const g = m.get(it.orderId);
      if (g) g.push(it); else m.set(it.orderId, [it]);
    }
    return m;
  }
  const itemsByOrder = groupByOrderId(allItems);
  const addrById = new Map(allAddresses.map((a) => [a.id, a]));

  return rows.map((order) => {
    const items = (itemsByOrder.get(order.id) ?? []).map((it) => ({
      id: it.orderItemId,
      menuId: it.menuId,
      qty: it.qty,
      priceAtOrder: it.priceAtOrder,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      category: it.category,
    }));

    const addr = order.deliveryAddressId ? addrById.get(order.deliveryAddressId) : undefined;
    const delivery = addr ? { name: addr.name, address: addr.address, phone: addr.phone } : null;

    return {
      id: order.id,
      userId: order.userId,
      total: fromCents(order.totalCents),
      totalCents: order.totalCents,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      promoCode: order.promoCode ?? null,
      discount: order.discount ?? 0,
      paymentMethod: order.paymentMethod ?? null,
      items,
      delivery,
    };
  });
}
```

- [x] **Step 3: Verify all tests pass**

```bash
cd apps/backend && bun test
```

Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add apps/backend/src/routes/manage.ts apps/backend/src/services/orderService.ts
git commit -m "perf: batch-load order items and delivery addresses to fix N+1 in orders"
```

---

## Phase 5: Security Hardening

**Why:** Add security HTTP headers and configure Better-Auth cookie security for production readiness.

### Task 5.1: Create security headers middleware

**Files:**
- Create: `apps/backend/src/middleware/securityHeaders.ts`
- Modify: `apps/backend/src/app.ts`

- [x] **Step 1: Create security headers plugin**

Create `apps/backend/src/middleware/securityHeaders.ts`:

```typescript
import { Elysia } from 'elysia';
import { config } from '../config';

export const securityHeaders = new Elysia().onRequest(({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  set.headers['X-DNS-Prefetch-Control'] = 'off';
  set.headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), interest-cohort=()';

  if (config.isProd) {
    set.headers['Strict-Transport-Security'] =
      'max-age=63072000; includeSubDomains; preload';
  }
});
```

- [x] **Step 2: Register securityHeaders as the first plugin in app.ts**

Open `apps/backend/src/app.ts`. Add import:

```typescript
import { securityHeaders } from './middleware/securityHeaders';
```

Add as the first plugin before `requestIdPlugin`:

```typescript
return new Elysia()
  .use(securityHeaders)      // FIRST — security before anything
  .use(requestIdPlugin)
  .use(cors({ ... }))
  // ... rest
```

- [x] **Step 3: Verify headers in response**

```bash
curl -sI http://localhost:4000/api/health | grep -E 'x-content-type|x-frame|referrer-policy|x-dns|permissions-policy'
```

Expected: Response includes `x-content-type-options: nosniff`, `x-frame-options: DENY`, etc.

- [x] **Step 4: Commit**

```bash
git add apps/backend/src/middleware/securityHeaders.ts apps/backend/src/app.ts
git commit -m "feat: add security headers middleware (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)"
```

### Task 5.2: Harden Better-Auth cookie configuration

**Files:**
- Modify: `apps/backend/src/auth/index.ts`

- [x] **Step 1: Add cookie security options**

Open `apps/backend/src/auth/index.ts`. Update the `betterAuth()` config to include explicit cookie options:

```typescript
export const auth = betterAuth({
  // ... existing config remains
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },
  // Add this block:
  advanced: {
    cookiePrefix: config.isProd ? '__Host-' : undefined,
  },
  // Ensure these are set (Better-Auth may have defaults, make them explicit):
  // Note: Better-Auth uses its own cookie config — verify the exact API
  // in the Better-Auth docs for your version.
  plugins: [
    admin(),
  ],
});
```

*Note: Better-Auth v1.x may not expose `cookieOptions` directly at the top level. Check the installed version's API. The session config with `cookieCache` may be the primary configuration surface. Verify by reading `node_modules/better-auth/dist` types if needed.*

- [x] **Step 2: Run backend tests**

```bash
cd apps/backend && bun test
```

Expected: All tests pass. Auth-related tests should still work with the session configuration.

- [x] **Step 3: Commit**

```bash
git add apps/backend/src/auth/index.ts
git commit -m "security: harden Better-Auth session cookie configuration"
```

---

## Phase 6: Manage Dashboard Redesign

**Why:** The current `/manage` page uses a dark-only theme inconsistent with the customer-facing warm/light design system. Rebuild it with the same TailwindCSS tokens, split the 800-line monolithic component into focused tab components, and add a proper admin login page.

### Task 6.1: Create admin store and admin API client

**Files:**
- Create: `apps/frontend/src/store/adminStore.ts`
- Create: `apps/frontend/src/api/admin.ts`

- [x] **Step 1: Create adminStore**

Create `apps/frontend/src/store/adminStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminState {
  token: string | null;
  adminUser: AdminUser | null;
  setAdminAuth: (token: string, adminUser: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      token: null,
      adminUser: null,
      setAdminAuth: (token, adminUser) => set({ token, adminUser }),
      logout: () => set({ token: null, adminUser: null }),
      isAuthenticated: () => Boolean(get().token && get().adminUser),
    }),
    { name: 'kgamay-admin-auth' },
  ),
);
```

- [x] **Step 2: Create admin API client**

Create `apps/frontend/src/api/admin.ts`:

```typescript
import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

export interface AdminLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const adminApi = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await adminApi.post('/api/admin/login', { email, password });
  return data;
}

export { adminApi };
```

- [x] **Step 3: Verify TypeScript compilation**

```bash
cd apps/frontend && bun run typecheck
```

Expected: No errors.

- [x] **Step 4: Commit**

```bash
git add apps/frontend/src/store/adminStore.ts apps/frontend/src/api/admin.ts
git commit -m "feat: add admin auth store and admin API client"
```

### Task 6.2: Create admin UI components — layout and sidebar

**Files:**
- Create: `apps/frontend/src/components/admin/AdminLayout.tsx`
- Create: `apps/frontend/src/components/admin/AdminSidebar.tsx`
- Create: `apps/frontend/src/components/admin/StatCard.tsx`
- Create: `apps/frontend/src/components/admin/TabLoading.tsx`

- [x] **Step 1: Create AdminLayout**

Create `apps/frontend/src/components/admin/AdminLayout.tsx`:

```typescript
import type { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';

type TabKey = 'dashboard' | 'users' | 'orders' | 'menu' | 'promos' | 'ratings';

interface AdminLayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  children: ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-accent-charcoal/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-4 md:px-8 h-16 max-w-[1600px]">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight text-accent-charcoal">
              K-Gamay{' '}
              <span className="text-brand-500">Admin</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto">
        <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create AdminSidebar**

Create `apps/frontend/src/components/admin/AdminSidebar.tsx`:

```typescript
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  UtensilsCrossed,
  TicketPercent,
  Star,
} from 'lucide-react';

const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users' as const, label: 'Users', icon: Users },
  { key: 'orders' as const, label: 'Orders', icon: ShoppingBag },
  { key: 'menu' as const, label: 'Menu', icon: UtensilsCrossed },
  { key: 'promos' as const, label: 'Promos', icon: TicketPercent },
  { key: 'ratings' as const, label: 'Ratings', icon: Star },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface AdminSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 border-r border-accent-charcoal/5 bg-white min-h-[calc(100vh-4rem)] sticky top-16 self-start">
        <div className="p-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-500/10 text-brand-600'
                    : 'text-accent-charcoal/50 hover:text-accent-charcoal hover:bg-surface-soft'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-accent-charcoal/5">
        <div className="flex justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-all ${
                  active
                    ? 'text-brand-500'
                    : 'text-accent-charcoal/40 hover:text-accent-charcoal/60'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
```

- [x] **Step 3: Create StatCard**

Create `apps/frontend/src/components/admin/StatCard.tsx`:

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = 'text-brand-500' }: StatCardProps) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-accent-charcoal/40 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
```

- [x] **Step 4: Create TabLoading**

Create `apps/frontend/src/components/admin/TabLoading.tsx`:

```typescript
import { Loader2 } from 'lucide-react';

export function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-accent-charcoal/40">Loading...</p>
      </div>
    </div>
  );
}
```

- [x] **Step 5: Commit**

```bash
git add apps/frontend/src/components/admin/
git commit -m "feat: create admin layout, sidebar, stat card, and loading components"
```

### Task 6.3: Create admin tab components — Dashboard and Users

**Files:**
- Create: `apps/frontend/src/components/admin/DashboardTab.tsx`
- Create: `apps/frontend/src/components/admin/UsersTab.tsx`
- Create: `apps/frontend/src/components/admin/UserRow.tsx`

- [x] **Step 1: Create DashboardTab**

Create `apps/frontend/src/components/admin/DashboardTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDashboard, type DashboardStats } from '@/api/manage';
import { StatCard } from './StatCard';
import { TabLoading } from './TabLoading';
import { formatMoney } from '@/lib/money';

const ORDER_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  in_progress: 'text-blue-500',
  delivered: 'text-emerald-500',
};

export function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { stats: s } = await getDashboard();
      setStats(s);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <TabLoading />;
  if (error) {
    return (
      <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
        <p className="font-semibold">{error}</p>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Dashboard</h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.users} color="text-blue-600" />
        <StatCard label="Total Orders" value={stats.orders} color="text-emerald-600" />
        <StatCard label="Menu Items" value={stats.menuItems} color="text-amber-600" />
        <StatCard label="Active Promos" value={stats.promos} color="text-purple-600" />
        <StatCard label="Ratings" value={stats.ratings} color="text-pink-600" />
        <StatCard label="Revenue" value={formatMoney(stats.revenueCents)} color="text-brand-500" />
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-accent-charcoal mb-3">Orders by Status</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'delivered'] as const).map((status) => (
            <div key={status} className="card p-4 border-accent-charcoal/5">
              <p className="text-xs font-medium text-accent-charcoal/40 uppercase tracking-wide">
                {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
              <p className={`mt-1 font-display text-3xl font-bold ${ORDER_COLORS[status]}`}>
                {stats.ordersByStatus[status]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create UsersTab**

Create `apps/frontend/src/components/admin/UsersTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { listUsers, deleteUser, getUser, type ManageUser, type ManageUserDetail } from '@/api/manage';
import { UserRow } from './UserRow';
import { TabLoading } from './TabLoading';
import toast from 'react-hot-toast';

export function UsersTab() {
  const [users, setUsers] = useState<ManageUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<ManageUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await listUsers());
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setUserDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      setUserDetail(await getUser(id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load user');
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}" and all their data?`)) return;
    try {
      await deleteUser(id);
      toast.success(`User "${name}" deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  }, []);

  if (loading) return <TabLoading />;
  if (error) {
    return (
      <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
        <p className="font-semibold">{error}</p>
        <button onClick={fetchUsers} className="btn btn-ghost btn-size-sm mt-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">
          Users <span className="text-accent-charcoal/30 text-base font-normal">({users.length})</span>
        </h2>
        <button onClick={fetchUsers} className="btn btn-ghost btn-size-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            expanded={expandedId === user.id}
            detail={expandedId === user.id ? userDetail : null}
            detailLoading={detailLoading && expandedId === user.id}
            onToggle={() => toggleExpand(user.id)}
            onDelete={() => handleDelete(user.id, user.name)}
          />
        ))}
        {users.length === 0 && (
          <p className="text-center text-accent-charcoal/40 py-12">No users found.</p>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Create UserRow**

Create `apps/frontend/src/components/admin/UserRow.tsx`:

```typescript
import { ChevronDown, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { type ManageUser, type ManageUserDetail } from '@/api/manage';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatMoney } from '@/lib/money';

interface UserRowProps {
  user: ManageUser;
  expanded: boolean;
  detail: ManageUserDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function UserRow({ user, expanded, detail, detailLoading, onToggle, onDelete }: UserRowProps) {
  return (
    <div>
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1 min-w-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-accent-charcoal truncate">{user.name}</p>
              <p className="text-sm text-accent-charcoal/40 truncate">{user.email}</p>
            </div>
          </button>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-accent-charcoal/40">{user.orderCount ?? 0} orders</span>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-8 card p-4 border-accent-charcoal/5">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-accent-charcoal/40 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
            </div>
          ) : detail?.orders.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-accent-charcoal/30 uppercase tracking-wide mb-3">
                Orders ({detail.orders.length})
              </p>
              {detail.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-accent-charcoal/40">#{order.id}</span>
                    <StatusBadge status={order.status} />
                    <span className="text-sm text-accent-charcoal/40">{formatDate(order.createdAt)}</span>
                  </div>
                  <span className="font-semibold text-accent-charcoal">{formatMoney(order.totalCents)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-accent-charcoal/40 py-4">No orders yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add apps/frontend/src/components/admin/
git commit -m "feat: create admin DashboardTab, UsersTab, and UserRow components"
```

### Task 6.4: Create OrdersTab and OrderRow components

**Files:**
- Create: `apps/frontend/src/components/admin/OrdersTab.tsx`
- Create: `apps/frontend/src/components/admin/OrderRow.tsx`

- [x] **Step 1: Create OrdersTab**

Create `apps/frontend/src/components/admin/OrdersTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listOrders, getOrder, updateOrderStatus, type ManageOrder } from '@/api/manage';
import { OrderRow } from './OrderRow';
import { TabLoading } from './TabLoading';

const ORDER_STATUSES = ['pending', 'in_progress', 'delivered'] as const;

export function OrdersTab() {
  const [orders, setOrders] = useState<ManageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<ManageOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await listOrders(statusFilter || undefined));
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setOrderDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      setOrderDetail(await getOrder(id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load order');
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const handleStatusChange = useCallback(async (id: number, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const updated = await updateOrderStatus(id, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)),
      );
      setOrderDetail((prev) => (prev?.id === id ? { ...prev, status: updated.status } : prev));
      toast.success(`Order #${id} → ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err?.message || 'Update failed');
    } finally {
      setUpdatingStatus(null);
    }
  }, []);

  if (loading) return <TabLoading />;
  if (error) {
    return (
      <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
        <p className="font-semibold">{error}</p>
        <button onClick={fetchOrders} className="btn btn-ghost btn-size-sm mt-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">
          Orders <span className="text-accent-charcoal/30 text-base font-normal">({orders.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto py-2"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button onClick={fetchOrders} className="btn btn-ghost btn-size-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            expanded={expandedId === order.id}
            detail={expandedId === order.id ? orderDetail : null}
            detailLoading={detailLoading && expandedId === order.id}
            updatingStatus={updatingStatus === order.id}
            onToggle={() => toggleExpand(order.id)}
            onStatusChange={(s) => handleStatusChange(order.id, s)}
          />
        ))}
        {orders.length === 0 && (
          <p className="text-center text-accent-charcoal/40 py-12">No orders found.</p>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create OrderRow**

Create `apps/frontend/src/components/admin/OrderRow.tsx`:

```typescript
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { type ManageOrder } from '@/api/manage';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/money';

const ORDER_STATUSES = ['pending', 'in_progress', 'delivered'] as const;

interface OrderRowProps {
  order: ManageOrder;
  expanded: boolean;
  detail: ManageOrder | null;
  detailLoading: boolean;
  updatingStatus: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
}

export function OrderRow({
  order, expanded, detail, detailLoading, updatingStatus,
  onToggle, onStatusChange,
}: OrderRowProps) {
  return (
    <div>
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1 min-w-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold text-accent-charcoal">#{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-accent-charcoal/40 mt-0.5">
                {order.userName ?? `User #${order.userId}`} · {formatDate(order.createdAt)}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-semibold text-accent-charcoal">{formatMoney(order.totalCents)}</span>
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`input w-auto py-1.5 text-xs ${updatingStatus ? 'opacity-50' : ''}`}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            {updatingStatus && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-8 card p-4 border-accent-charcoal/5">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-accent-charcoal/40 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading details...
            </div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-accent-charcoal/40">Customer</span><p className="font-medium text-accent-charcoal">{detail.userName}</p></div>
                <div><span className="text-accent-charcoal/40">Email</span><p className="font-medium text-accent-charcoal truncate">{detail.userEmail}</p></div>
                <div><span className="text-accent-charcoal/40">Promo</span><p className="font-medium text-accent-charcoal">{detail.promoCode || '—'}</p></div>
                <div><span className="text-accent-charcoal/40">Discount</span><p className="font-medium text-accent-charcoal">{formatMoney(detail.discount)}</p></div>
              </div>
              {detail.delivery && (
                <div className="p-3 rounded-xl bg-surface-muted text-sm">
                  <span className="text-accent-charcoal/40">Delivery</span>
                  <p className="font-medium text-accent-charcoal">
                    {detail.delivery.name} · {detail.delivery.address} · {detail.delivery.phone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-accent-charcoal/30 uppercase tracking-wide mb-2">Items ({detail.items.length})</p>
                {detail.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-accent-charcoal">{item.name}</span>
                      <span className="text-accent-charcoal/30">x{item.qty}</span>
                    </div>
                    <span className="text-accent-charcoal/50">{formatMoney(item.priceAtOrder * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-accent-charcoal/5 pt-3">
                <span className="font-display text-lg font-bold text-accent-charcoal">Total: {formatMoney(detail.totalCents)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-accent-charcoal/40 py-4">Could not load order details.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/components/admin/
git commit -m "feat: create admin OrdersTab and OrderRow components"
```

### Task 6.5: Create MenuTab, PromosTab, RatingsTab

**Files:**
- Create: `apps/frontend/src/components/admin/MenuTab.tsx`
- Create: `apps/frontend/src/components/admin/MenuForm.tsx`
- Create: `apps/frontend/src/components/admin/PromosTab.tsx`
- Create: `apps/frontend/src/components/admin/RatingsTab.tsx`

- [ ] **Step 1: Create MenuTab**

Create `apps/frontend/src/components/admin/MenuTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listMenu, createMenuItem, updateMenuItem, deleteMenuItem, type ManageMenuItem } from '@/api/manage';
import { TabLoading } from './TabLoading';
import { formatMoney } from '@/lib/money';

const CATEGORIES = ['Burgers', 'Pizza', 'Asian', 'Desserts', 'Drinks'];

export function MenuTab() {
  const [items, setItems] = useState<ManageMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setItems(await listMenu()); } catch (err: any) { setError(err?.message || 'Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => { setName(''); setDesc(''); setPrice(''); setImage(''); setCategory(CATEGORIES[0]); setEditId(null); setShowForm(false); };

  const openEdit = (item: ManageMenuItem) => {
    setName(item.name); setDesc(item.description); setPrice(String(item.price)); setImage(item.imageUrl); setCategory(item.category);
    setEditId(item.id); setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim() || !price.trim() || Number.isNaN(priceNum) || priceNum <= 0) { toast.error('Name and valid price required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: desc.trim(), price: priceNum, imageUrl: image.trim(), category };
      if (editId) {
        const updated = await updateMenuItem(editId, payload);
        setItems((prev) => prev.map((it) => (it.id === editId ? { ...it, ...updated } : it)));
        toast.success(`"${updated.name}" updated`);
      } else {
        const created = await createMenuItem(payload);
        setItems((prev) => [...prev, created]);
        toast.success(`"${created.name}" created`);
      }
      resetForm();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return;
    try { await deleteMenuItem(id); setItems((prev) => prev.filter((it) => it.id !== id)); toast.success(`"${itemName}" deleted`); }
    catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Menu <span className="text-accent-charcoal/30 text-base font-normal">({items.length})</span></h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary btn-size-sm"><Plus className="h-4 w-4" />Add item</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-accent-charcoal">{editId ? 'Edit menu item' : 'New menu item'}</h3>
            <button type="button" onClick={resetForm} className="text-accent-charcoal/30 hover:text-accent-charcoal">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Price (PHP)</label><input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Image URL</label><input className="input" value={image} onChange={(e) => setImage(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Category</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Description</label><textarea className="input resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editId ? 'Save' : 'Create'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="font-semibold text-accent-charcoal truncate">{item.name}</h3><p className="text-xs text-accent-charcoal/40 mt-0.5">{item.category}</p></div>
                <span className="font-display font-bold text-brand-500 shrink-0">{formatMoney(item.price * 100)}</span>
              </div>
              {item.description && <p className="text-sm text-accent-charcoal/50 mt-2 line-clamp-2">{item.description}</p>}
              {item.rating?.count ? <p className="text-xs text-accent-charcoal/30 mt-2"><Star className="h-3 w-3 inline fill-amber-400 text-amber-400 mr-0.5" />{item.rating.average.toFixed(1)} ({item.rating.count})</p> : null}
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(item)} className="flex-1 btn btn-ghost btn-size-sm text-xs">Edit</button>
                <button onClick={() => handleDelete(item.id, item.name)} className="flex-1 btn btn-ghost btn-size-sm text-xs text-red-500"><Trash2 className="h-3.5 w-3.5" />Delete</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-accent-charcoal/40 py-12 col-span-full">No menu items yet.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PromosTab**

Create `apps/frontend/src/components/admin/PromosTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listPromos, createPromo, deletePromo, type ManagePromo } from '@/api/manage';
import { TabLoading } from './TabLoading';

export function PromosTab() {
  const [promos, setPromos] = useState<ManagePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [desc, setDesc] = useState('');
  const [firstOrder, setFirstOrder] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try { setPromos(await listPromos()); } catch (err: any) { setError(err?.message || 'Failed'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => { setCode(''); setDiscount(''); setDesc(''); setFirstOrder(false); setShowForm(false); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const discNum = Number(discount);
    if (!code.trim() || Number.isNaN(discNum) || discNum <= 0 || discNum > 1) { toast.error('Valid code and discount (0-1) required'); return; }
    setSaving(true);
    try {
      const created = await createPromo({ code: code.trim(), discount: discNum, description: desc.trim(), firstOrderOnly: firstOrder });
      setPromos((prev) => [...prev, created]);
      toast.success(`Promo "${created.code}" created`);
      resetForm();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (promoCode: string) => {
    if (!confirm(`Delete promo "${promoCode}"?`)) return;
    try { await deletePromo(promoCode); setPromos((prev) => prev.filter((p) => p.code !== promoCode)); toast.success('Deleted'); }
    catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Promos <span className="text-accent-charcoal/30 text-base font-normal">({promos.length})</span></h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-size-sm"><Plus className="h-4 w-4" />New promo</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-accent-charcoal">New promo code</h3><button type="button" onClick={resetForm} className="text-accent-charcoal/30 hover:text-accent-charcoal">✕</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Code</label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Discount (0-1)</label><input className="input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} required /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Description</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={firstOrder} onChange={(e) => setFirstOrder(e.target.checked)} className="rounded" /><span className="text-accent-charcoal/60">First-order only</span></label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {promos.map((p) => (
          <div key={p.code} className="card p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-brand-500">{p.code}</span>
                <span className="badge bg-emerald-100 text-emerald-700">{(p.discount * 100).toFixed(0)}% off</span>
                {p.firstOrderOnly && <span className="badge bg-amber-100 text-amber-700">First order</span>}
              </div>
              {p.description && <p className="text-sm text-accent-charcoal/40 mt-0.5 truncate">{p.description}</p>}
              <p className="text-xs text-accent-charcoal/30 mt-1">Used {p.useCount} time{p.useCount !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => handleDelete(p.code)} className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {promos.length === 0 && <p className="text-center text-accent-charcoal/40 py-12">No promos yet.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create RatingsTab**

Create `apps/frontend/src/components/admin/RatingsTab.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { listRatings, deleteRating, type ManageRatingsResponse } from '@/api/manage';
import { TabLoading } from './TabLoading';
import { formatDate } from '@/lib/utils';

export function RatingsTab() {
  const [data, setData] = useState<ManageRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await listRatings(limit, offset)); } catch (err: any) { setError(err?.message || 'Failed'); } finally { setLoading(false); }
  }, [offset]);
  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this rating?')) return;
    try {
      await deleteRating(id);
      setData((prev) => prev ? { ...prev, ratings: prev.ratings.filter((r) => r.id !== id), total: prev.total - 1 } : prev);
      toast.success('Rating deleted');
    } catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Ratings <span className="text-accent-charcoal/30 text-base font-normal">({data?.total ?? 0})</span></h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {data?.ratings.length ? (
        <>
          <div className="space-y-2">
            {data.ratings.map((r) => (
              <div key={r.id} className="card p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-accent-charcoal">{r.userName}</span>
                    <span className="text-accent-charcoal/30 text-sm">{r.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-accent-charcoal/10'}`} />
                    ))}
                    <span className="text-xs text-accent-charcoal/40 ml-1.5">on {r.menuName}</span>
                  </div>
                  {r.review && <p className="text-sm text-accent-charcoal/50 mt-1 line-clamp-2">{r.review}</p>}
                  <p className="text-xs text-accent-charcoal/25 mt-1">{formatDate(r.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-accent-charcoal/40">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= data.total} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-accent-charcoal/40 py-12">No ratings yet.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/admin/
git commit -m "feat: create admin MenuTab, PromosTab, and RatingsTab components"
```

### Task 6.6: Create AdminLogin page and AdminGuard wrapper

**Files:**
- Create: `apps/frontend/src/pages/AdminLogin.tsx`
- Create: `apps/frontend/src/components/AdminGuard.tsx`

- [ ] **Step 1: Create AdminLogin page**

Create `apps/frontend/src/pages/AdminLogin.tsx`:

```typescript
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminLogin } from '@/api/admin';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function AdminLogin() {
  const navigate = useNavigate();
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token, user } = await adminLogin(email, password);
      setAdminAuth(token, user);
      toast.success(`Welcome, ${user.name}`);
      navigate('/admin', { replace: true });
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || 'Login failed';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white mb-4">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-accent-charcoal">Admin Sign In</h1>
          <p className="text-sm text-accent-charcoal/50 mt-1">K-Gamay Management Panel</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-5">
          {err && (
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-500/20 text-brand-700 text-sm">
              {err}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-accent-charcoal/50 uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-charcoal/30" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kgamay.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-accent-charcoal/50 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-charcoal/30" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full btn-size-lg">
            Sign In
          </Button>

          <p className="text-center text-xs text-accent-charcoal/30">
            This area is restricted to administrators only.
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AdminGuard wrapper**

Create `apps/frontend/src/components/AdminGuard.tsx`:

```typescript
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';

interface AdminGuardProps {
  children: ReactElement;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const isAuth = useAdminStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/AdminLogin.tsx apps/frontend/src/components/AdminGuard.tsx
git commit -m "feat: create AdminLogin page and AdminGuard wrapper"
```

### Task 6.7: Wire new admin components into App.tsx and refactor Manage.tsx

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/pages/Manage.tsx` (replace with new shell)

- [ ] **Step 1: Update App.tsx with admin routes**

Open `apps/frontend/src/App.tsx`. Add imports:

```typescript
import { AdminLogin } from '@/pages/AdminLogin';
import { AdminGuard } from '@/components/AdminGuard';
```

Replace the old route:
```typescript
// BEFORE:
<Route path="/manage" element={<Manage />} />

// AFTER:
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin" element={<AdminGuard><Manage /></AdminGuard>} />
```

Also add a redirect from `/manage` to `/admin` for backward compatibility:
```typescript
import { Navigate } from 'react-router-dom';
<Route path="/manage" element={<Navigate to="/admin" replace />} />
```

- [ ] **Step 2: Refactor Manage.tsx to use new components**

Replace the entire contents of `apps/frontend/src/pages/Manage.tsx` with the new shell:

```typescript
import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardTab } from '@/components/admin/DashboardTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { MenuTab } from '@/components/admin/MenuTab';
import { PromosTab } from '@/components/admin/PromosTab';
import { RatingsTab } from '@/components/admin/RatingsTab';

type TabKey = 'dashboard' | 'users' | 'orders' | 'menu' | 'promos' | 'ratings';

export function Manage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'menu' && <MenuTab />}
      {activeTab === 'promos' && <PromosTab />}
      {activeTab === 'ratings' && <RatingsTab />}
    </AdminLayout>
  );
}
```

- [ ] **Step 3: Update the manage API client to use the admin store's token**

Open `apps/frontend/src/api/manage.ts`. Update the `manageApi` interceptor to also check the admin store:

```typescript
import { useAdminStore } from '@/store/adminStore';

manageApi.interceptors.request.use((config) => {
  // Try admin store token first, fall back to customer auth token
  const adminToken = useAdminStore.getState().token;
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = uuidv4();
  }
  return config;
});
```

- [ ] **Step 4: Verify the frontend builds**

```bash
cd apps/frontend && bun run build
```

Expected: Build succeeds with no errors. All new imports resolve correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/pages/Manage.tsx apps/frontend/src/api/manage.ts
git commit -m "feat: wire admin components into App.tsx; refactor Manage.tsx as shell"
```

---

## Phase 7: Missing Features

**Why:** Address feature gaps identified in the audit — pagination on admin orders, email verification, shared types package.

### Task 7.1: Add pagination to manage orders list

**Files:**
- Modify: `apps/backend/src/routes/manage.ts` (GET /orders handler)
- Modify: `apps/frontend/src/components/admin/OrdersTab.tsx`
- Modify: `apps/frontend/src/api/manage.ts` (listOrders function)

- [ ] **Step 1: Add query params for pagination on backend**

In `apps/backend/src/routes/manage.ts`, update the `GET /orders` handler to accept `limit` and `offset` query params:

```typescript
.get('/orders', async ({ query }) => {
  const db = getDb();
  const status = query.status as string | undefined;
  const pageLimit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const pageOffset = Math.max(Number(query.offset) || 0, 0);

  // ... status filter logic unchanged ...

  // Add LIMIT and OFFSET, and fetch total count
  orderRows = await db
    .select({ ... })
    .from(schema.orders)
    .innerJoin(schema.user, ...)
    // ... where clause ...
    .orderBy(desc(schema.orders.createdAt))
    .limit(pageLimit)
    .offset(pageOffset);

  // Get total count for pagination
  const [totalRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    // ... same where clause ...

  // ... enrichment ...

  return {
    orders: enriched,
    total: Number(totalRow.n),
    limit: pageLimit,
    offset: pageOffset,
  };
})
```

- [ ] **Step 2: Update manage.ts API client**

Add `limit` and `offset` params to `listOrders`:

```typescript
export async function listOrders(
  status?: string,
  limit?: number,
  offset?: number,
): Promise<{ orders: ManageOrder[]; total: number; limit: number; offset: number }> {
  const params: Record<string, string | number> = {};
  if (status) params.status = status;
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  const { data } = await manageApi.get('/api/manage/orders', { params });
  return data;
}
```

- [ ] **Step 3: Update OrdersTab to use pagination**

In `OrdersTab.tsx`, add page state and use `data.orders` / `data.total` from the new response shape. Add prev/next buttons.

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/manage.ts apps/frontend/src/api/manage.ts apps/frontend/src/components/admin/OrdersTab.tsx
git commit -m "feat: add pagination to admin orders list"
```

### Task 7.2: Populate shared types package

**Files:**
- Overwrite: `packages/shared/src/index.ts`

- [ ] **Step 1: Write shared TypeScript types**

Replace `packages/shared/src/index.ts`:

```typescript
/** Shared types between backend and frontend */

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  rating?: {
    menuId: number;
    average: number;
    count: number;
  };
}

export interface OrderItem {
  id: number;
  menuId: number;
  qty: number;
  priceAtOrder: number;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}

export interface Order {
  id: number;
  userId: string;
  total: number;
  totalCents: number;
  status: 'pending' | 'in_progress' | 'delivered';
  createdAt: string;
  promoCode: string | null;
  discount: number;
  paymentMethod: string | null;
  items: OrderItem[];
  delivery: {
    name: string;
    address: string;
    phone: string;
  } | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Rating {
  id: number;
  userId: string;
  menuId: number;
  stars: number;
  review: string | null;
  createdAt: string;
}

export interface RatingSummary {
  menuId: number;
  average: number;
  count: number;
}

export interface Promo {
  code: string;
  discount: number;
  description: string;
  firstOrderOnly: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

- [ ] **Step 2: Verify the package exports**

```bash
cd packages/shared && bun --check src/index.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: populate shared TypeScript types package"
```

---

## Phase 8: Final Verification & Cleanup

**Why:** Comprehensive audit pass to confirm everything works end-to-end.

### Task 8.1: Full test suite run

- [ ] **Step 1: Backend tests**

```bash
cd apps/backend && bun test
```

Expected: All tests pass.

- [ ] **Step 2: Frontend tests**

```bash
cd apps/frontend && bun run test
```

Expected: All tests pass.

- [ ] **Step 3: Run type checking on frontend**

```bash
cd apps/frontend && bun run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 4: Production build**

```bash
cd apps/frontend && bun run build
```

Expected: Build succeeds.

### Task 8.2: Manual smoke test

- [ ] **Step 1: Start the full stack**

```bash
# Terminal 1: Backend
cd apps/backend && bun run dev

# Terminal 2: Frontend dev server
cd apps/frontend && bun run dev
```

- [ ] **Step 2: Test customer flow**

1. Visit `http://localhost:5173`
2. Browse menu → add items to cart
3. Sign up new account
4. Place order with delivery details
5. View orders list
6. Submit a rating (may need manual status change via admin)

- [ ] **Step 3: Test admin flow**

1. Visit `http://localhost:5173/admin/login`
2. Sign in with admin credentials (seeded admin)
3. Verify dashboard loads with stats
4. Browse Users tab → verify list and expand works
5. Browse Orders tab → verify list, filter, status change
6. Browse Menu tab → add, edit, delete items
7. Browse Promos tab → create, delete promos
8. Browse Ratings tab → verify list + pagination + delete
9. Logout → verify redirect to login

- [ ] **Step 4: Test production mode (backend serves frontend)**

```bash
# Build frontend
cd apps/frontend && bun run build

# Start backend in production
cd apps/backend && NODE_ENV=production bun run src/index.ts

# Visit http://localhost:4000 — should serve the frontend
# Visit http://localhost:4000/admin — should serve admin panel
```

### Task 8.3: Docker build verification

- [ ] **Step 1: Build Docker image**

```bash
docker build -t k-gamay-test .
```

Expected: Build completes successfully.

### Task 8.4: Update CHANGELOG.md

- [ ] **Step 1: Add entries to CHANGELOG**

Open `CHANGELOG.md`. Add under a new `## [Unreleased]` or date header:

```markdown
## [Unreleased] — 2026-05-12

### Security
- Applied admin guard to all `/api/manage/*` routes (was unprotected)
- Added security headers middleware (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- Hardened Better-Auth session cookie configuration
- Migrated admin auth from shared header password to role-based Better-Auth admin plugin

### Added
- Better-Auth admin plugin with role-based access control
- Admin login endpoint (`POST /api/admin/login`) with role verification
- Seeded initial admin user on startup
- Admin login page (`/admin/login`)
- Pagination on admin orders list
- Shared TypeScript types package (`packages/shared`)

### Changed
- Redesigned admin dashboard with warm/light theme matching project design system
- Decomposed 800-line Manage.tsx into focused tab components
- Admin routes moved from `/manage` to `/admin` with backward redirect
- Batch-loaded queries eliminate N+1 anti-patterns in manage users, orders, promos

### Removed
- All Express.js dead code (22 files): routes, middleware, services, lib
- `x-manage-key` shared password admin auth
- Backend `.env.example` (superseded by root `.env.example`)
```

- [ ] **Step 2: Commit CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for system completion and hardening"
```

---

## Dependency Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
 (fix)     (clean)    (admin)    (perf)    (security)  (redesign)  (features)  (verify)
```

Phases are sequential. Phase 1 must ship first because it fixes the unprotected manage routes. Phase 2 removes dead code so the codebase is clean for Phase 3 changes. Phase 4 depends on Phase 3's admin guard being in place for the manage routes it touches.

---

## Rollback Plan

If the Better-Auth admin plugin migration (Phase 3) fails:
1. Revert the schema migration (`drizzle-kit drop`)
2. Restore `manageAuth.ts` and `x-manage-key` logic from git
3. Re-apply the Phase 1 guard with the old approach

---



---

---

