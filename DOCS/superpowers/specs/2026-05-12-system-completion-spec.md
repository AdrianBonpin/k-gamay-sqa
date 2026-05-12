# System Completion & Hardening — Architectural Spec

**Date:** 2026-05-12
**Status:** Draft
**Context:** Comprehensive audit, cleanup, and enhancement of the K-Gamay food delivery system. Four objectives: (1) improve /manage styling to match project theme, (2) remove Express.js remnants and ensure full Elysia migration, (3) audit entire backend/frontend/manage system, (4) implement missing components and improvements.

---

## 1. Objectives Summary

| # | Objective | Priority |
|---|-----------|----------|
| A | **Manage Styling** — Restyle `/manage` admin dashboard to follow the project's warm/branded design system | P0 |
| B | **Express Removal** — Delete all Express.js dead code; ensure 100% Elysia coverage | P0 |
| C | **Comprehensive Audit** — Verify every route, service, middleware, and frontend page functions correctly | P1 |
| D | **Missing Components** — Add admin roles via Better-Auth admin plugin, security headers, fixes for N+1 queries, and missing features | P1 |

---

## 2. Pre-Audit Findings (Discovery)

### 2.1 CRITICAL — Manage Routes Are Unprotected

The `requireManageAuth` function exists in `src/middleware/manageAuth.ts` and is imported in `src/routes/manage.ts`, but **it is never applied**. No `.guard()`, no `.use()`, no `beforeHandle` hook is wired to the manage routes Elysia instance. All `/api/manage/*` endpoints are publicly accessible without any authentication.

**Severity:** BLOCKER. Must be fixed before any other work.

### 2.2 Express.js Dead Code Still Present

The following files are vestigial from the Express era and must be removed:

```
apps/backend/
├── app.js                          # Express createApp()
├── server.js                       # Express server entry
├── config.js                       # Express config loader
├── db.js                           # Express SQLite DB
├── routes/
│   ├── auth.js                     # Express auth routes
│   ├── manage.js                   # Express manage routes
│   ├── menu.js                     # Express menu routes
│   ├── orders.js                   # Express order routes
│   ├── promo.js                    # Express promo routes
│   └── ratings.js                  # Express rating routes
├── middleware/
│   ├── auth.js                     # Express auth middleware
│   ├── httpsOnly.js                # Express HTTPS redirect
│   ├── manageAuth.js               # Express manage auth
│   ├── rateLimit.js                # Express rate limit
│   └── tokenDenylist.js            # Express token denylist
├── services/
│   ├── authService.js              # Express auth service
│   ├── orderService.js             # Express order service
│   ├── promoService.js             # Express promo service
│   └── ratingService.js            # Express rating service
└── lib/
    ├── asyncHandler.js             # Express async handler
    ├── logger.js                   # Express/pino logger
    ├── metrics.js                  # Express prometheus metrics
    └── money.js                    # Express money utils
```

Also remove: `package-lock.json` (Express-era lockfile).

**Note:** `apps/backend/.env`, `apps/backend/.env.example` — the `.env.example` is superseded by the root `.env.example`. Keep the root `.env.example`, delete the backend-specific one. The `.env` in backend may be in .gitignore — remove if present.

### 2.3 N+1 Query Anti-Patterns

Multiple handlers in `src/routes/manage.ts` and `src/services/orderService.ts` execute sequential per-row database queries:

| Handler | N+1 Pattern | Impact |
|---------|-------------|--------|
| `GET /api/manage/users` | 1 query for users + N queries for orderCount | Linear degradation |
| `GET /api/manage/users/:id` | Per-order queries for items + delivery | Quadratic degradation |
| `GET /api/manage/orders` | Per-order queries for items + delivery | Quadratic degradation |
| `GET /api/manage/promos` | Per-promo query for usage count | Linear degradation |
| `GET /api/manage/menu` | Separate query for rating summaries (already batched) | Acceptable |
| `GET /api/orders` (customer) | Per-order queries for items + delivery | Linear degradation |

**Mitigation:** Use single batch queries with `IN` clauses or correlated subqueries, then join in application memory.

### 2.4 Missing Security Headers

The original migration spec (2026-04-30) noted the absence of a Helmet equivalent. Security headers were never implemented:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (production only)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 0` (deprecated; CSP preferred)

### 2.5 Missing Features (Gap Analysis)

| Feature | Status | Priority |
|---------|--------|----------|
| Admin roles (Better-Auth admin plugin) | Not implemented | P0 |
| Admin login page (no x-manage-key manual header) | Not implemented | P0 |
| Security headers middleware | Not implemented | P0 |
| User ban/unban | Not implemented | P1 |
| User role management (admin/user) | Not implemented | P1 |
| Admin impersonation | Not implemented | P2 |
| Email verification | Available in Better-Auth, not configured | P2 |
| Password reset flow | Not implemented | P2 |
| Order cancellation endpoint | Not implemented | P2 |
| Order search/filter (customer side) | Not implemented | P2 |
| Pagination on manage orders | Not implemented | P1 |
| Profile update (customer side) | Not implemented | P2 |
| Real-time order status (WebSocket/SSE) | Not implemented | P3 |
| Shared TypeScript types package | Empty; unused | P2 |

---

## 3. Architecture Boundaries (Source of Truth)

### 3.1 Inviolable Constraints

1. **Bun runtime only.** All server-side code runs on Bun. No Node.js fallback. Commands in package.json must use `bun run`.
2. **Elysia exclusively.** No Express, no Fastify, no Hono. `src/app.ts` is the single HTTP framework entry point.
3. **PostgreSQL + Drizzle ORM.** No raw SQLite, no raw SQL strings. All queries through Drizzle's typed API (exceptions: seed SQL for startup migration).
4. **Better-Auth for authentication.** No custom JWT/bcrypt/auth. All auth routes delegate to Better-Auth API calls.
5. **TypeScript for all backend code.** No `.js` files in `apps/backend/src/`. Zero legacy JavaScript.
6. **Monorepo structure preserved.** `apps/backend`, `apps/frontend`, `packages/shared`. No new top-level packages.
7. **API contract preservation.** Existing frontend API calls must continue to work — route paths, request shapes, and response shapes are the contract.

### 3.2 File Structure After Completion

```
apps/backend/
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Elysia app composition
│   ├── config.ts                   # Typed environment config
│   ├── auth/
│   │   ├── index.ts                # Better-Auth instance + admin plugin
│   │   └── permissions.ts          # Access control + role definitions
│   ├── db/
│   │   ├── schema.ts               # All Drizzle tables
│   │   └── index.ts                # DB singleton
│   ├── routes/
│   │   ├── health.ts
│   │   ├── auth.ts                 # Auth wrapper routes
│   │   ├── admin-auth.ts           # Admin-specific auth (login as admin)
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── promo.ts
│   │   ├── ratings.ts
│   │   └── manage.ts              # Admin CRUD (users, orders, menu, promos, ratings)
│   ├── services/
│   │   ├── menuService.ts
│   │   ├── orderService.ts
│   │   ├── promoService.ts
│   │   └── ratingService.ts
│   ├── middleware/
│   │   ├── rateLimit.ts
│   │   ├── requestId.ts
│   │   ├── securityHeaders.ts     # NEW — security headers middleware
│   │   ├── adminGuard.ts          # NEW — admin role guard (Better-Auth session + admin role check)
│   │   └── staticFiles.ts
│   ├── lib/
│   │   ├── money.ts
│   │   └── errors.ts
│   └── seed/
│       ├── menu.json
│       └── index.ts
├── drizzle/                        # Drizzle migration files
├── drizzle.config.ts
├── package.json
└── tsconfig.json

apps/frontend/
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── admin.ts               # NEW — admin API client
│   │   ├── manage.ts
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── promo.ts
│   │   └── ratings.ts
│   ├── components/
│   │   ├── ui/                     # Reusable primitives
│   │   ├── admin/                  # NEW — admin-specific components
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── DashboardCards.tsx
│   │   │   ├── OrderTable.tsx
│   │   │   ├── UserTable.tsx
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── PromoList.tsx
│   │   │   ├── RatingList.tsx
│   │   │   └── StatCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ... (existing components)
│   ├── pages/
│   │   ├── Manage.tsx              # REFACTORED — split per-tab logic into admin/ components
│   │   ├── AdminLogin.tsx          # NEW — admin login page
│   │   └── ... (existing pages)
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── adminStore.ts           # NEW — admin auth state
│   │   └── cartStore.ts
│   └── ... (existing files)
├── package.json
└── tailwind.config.js

packages/shared/
└── src/
    └── index.ts                    # POPULATED — shared TypeScript types
```

---

## 4. Admin Authentication & Authorization (Better-Auth Admin Plugin)

### 4.1 Strategy

Replace the current `x-manage-key` shared-password approach with Better-Auth's admin plugin. This provides:

- **Role-based access control** — `admin` and `user` roles, extensible via `createAccessControl`
- **Per-user authentication** — admins sign in with their own email/password (marked as admin role)
- **Session-based admin auth** — no manual header; the session cookie identifies admin status
- **Built-in admin endpoints** — user creation, role assignment, banning, impersonation, session management
- **Permission checking** — `hasPermission()` on client, `userHasPermission()` on server

### 4.2 Migration Path

**Phase A — Apply admin plugin to existing Better-Auth config:**

```typescript
// src/auth/index.ts
import { admin } from 'better-auth/plugins';

export const auth = betterAuth({
  // ... existing config
  plugins: [admin()],
});
```

**Phase B — Add `role` column to schema:**
Run `bunx @better-auth/cli migrate` or add manually to Drizzle schema:

```typescript
// In src/db/schema.ts — add to user table
role: text('role').default('user').notNull(),
banned: boolean('banned').default(false).notNull(),
banReason: text('ban_reason'),
banExpires: timestamp('ban_expires'),
```

And to session table:
```typescript
impersonatedBy: text('impersonated_by'),
```

**Phase C — Create admin guard middleware (replaces requireManageAuth):**

```typescript
// src/middleware/adminGuard.ts
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

export const adminGuard = new Elysia()
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required');
    
    const roles = (session.user as any).role?.split(',').map((r: string) => r.trim()) ?? [];
    if (!roles.includes('admin')) {
      throw new HttpError(403, 'ADMIN_REQUIRED', 'Admin access required');
    }
    return { adminUser: session.user };
  });
```

**Phase D — Wire admin guard to manage routes:**
Apply `.use(adminGuard)` to the `manageRoutes` Elysia instance.

**Phase E — Admin login flow:**

Create a dedicated admin sign-in experience:
1. New route `POST /api/admin/login` — authenticates user AND verifies admin role
2. New frontend page `AdminLogin.tsx` at `/admin/login` — styled admin login form
3. Redirect non-admin users to `/menu`; redirect unauthenticated users to `/admin/login`
4. Store admin session state separately in `adminStore.ts` (Zustand)

**Phase F — Frontend admin client plugin:**

```typescript
// src/api/admin.ts
import { adminClient } from 'better-auth/client/plugins';

// Use Better-Auth's admin client for admin operations
export const adminApi = createAuthClient({
  plugins: [adminClient()],
});
```

### 4.3 Permission Model

Default Better-Auth admin permissions:

| Resource | Permissions |
|----------|-------------|
| user | create, list, set-role, ban, impersonate, delete, set-password |
| session | list, revoke, delete |

For this project, use default permissions. Future custom roles can extend with `createAccessControl`.

### 4.4 Seeding an Initial Admin

Seed script must create at least one admin user:

```typescript
// In src/seed/index.ts — add
const adminEmail = process.env.ADMIN_EMAIL || 'admin@kgamay.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

// Create admin user via Better-Auth's internal API
await auth.api.signUpEmail({
  body: { email: adminEmail, password: adminPassword, name: 'Admin' },
});
// Then set role to 'admin'
await db.update(schema.user)
  .set({ role: 'admin' })
  .where(eq(schema.user.email, adminEmail));
```

Environment variables for admin seeding:
```env
ADMIN_EMAIL=admin@kgamay.com
ADMIN_PASSWORD=secure-admin-password
```

### 4.5 Backward Compatibility

During transition, keep the `x-manage-key` check active alongside the new admin guard (OR logic — either session has admin role OR header key matches). Remove after testing.

---

## 5. N+1 Query Remediation Plan

### 5.1 Strategy: Batch-Fetch Pattern

For every handler that iterates over a list and queries per-item:

1. Collect all foreign key IDs from the parent result set.
2. Execute a single query with `inArray(ids)` or a correlated subquery.
3. Build an in-memory `Map<parentId, child[]>` for O(1) lookup.
4. Merge children into parent objects during serialization.

### 5.2 Specific Fixes

**`GET /api/manage/users` — order counts:**
```typescript
// Replace per-user count queries with:
const counts = await db
  .select({ userId: schema.orders.userId, n: sql<number>`count(*)::int` })
  .from(schema.orders)
  .where(inArray(schema.orders.userId, userIds))
  .groupBy(schema.orders.userId);
```

**`GET /api/manage/orders` — items + delivery:**
```typescript
// Batch-load all order items in one query
const allItems = await db.select(...)
  .from(schema.orderItems)
  .innerJoin(schema.menuItems, ...)
  .where(inArray(schema.orderItems.orderId, orderIds));
// Group by orderId in memory

// Batch-load all delivery addresses in one query
const allAddresses = await db.select(...)
  .from(schema.deliveryAddresses)
  .where(inArray(schema.deliveryAddresses.id, deliveryIds));
```

**`GET /api/manage/promos` — usage counts:**
```typescript
// Single GROUP BY query
const usageCounts = await db
  .select({ promoCode: schema.orders.promoCode, n: sql<number>`count(*)::int` })
  .from(schema.orders)
  .where(inArray(schema.orders.promoCode, promoCodes))
  .groupBy(schema.orders.promoCode);
```

**Customer `listOrders` — same batch pattern.**

### 5.3 Utility Helper

Create `src/lib/batchLoader.ts` with a generic helper:

```typescript
/** Groups an array of objects by a key extracted from each element. */
export function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Map<string | number, T[]> {
  const map = new Map<string | number, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}
```

---

## 6. Security Hardening

### 6.1 Security Headers Middleware

Implement `src/middleware/securityHeaders.ts`:

```typescript
import { Elysia } from 'elysia';
import { config } from '../config';

export const securityHeaders = new Elysia()
  .onRequest(({ set }) => {
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.headers['X-Frame-Options'] = 'DENY';
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    set.headers['X-DNS-Prefetch-Control'] = 'off';
    
    if (config.isProd) {
      set.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
    }
  });
```

Wire in `app.ts` as the first plugin (before CORS):
```typescript
const app = new Elysia()
  .use(securityHeaders)    // FIRST — security before anything
  .use(requestIdPlugin)
  .use(cors(...))
  // ... rest
```

### 6.2 Better-Auth Cookie Security

Verify/configure Better-Auth session cookie attributes:

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24,    // 1 day
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,           // 5 min
  },
},
cookieOptions: {
  secure: config.isProd,      // HTTPS only in production
  sameSite: 'lax',
  httpOnly: true,
  path: '/',
},
```

### 6.3 Remove Rate Limit Bypass for MANAGE_PASSWORD in Tests

The current `x-manage-key` check reads `process.env.MANAGE_PASSWORD`. After migration to admin plugin, the old `requireManageAuth` is replaced. Ensure the admin guard is properly tested with mock sessions.

---

## 7. Manage Dashboard Styling

### 7.1 Problem Statement

The `/manage` admin dashboard currently uses a dark-only theme (`bg-accent-charcoal`, white text) that is inconsistent with the customer-facing frontend, which uses a warm/light design system (cream backgrounds, brand-500 accent, display serif fonts, `shadow-soft`). The admin should feel like an extension of the same product, not a separate system.

### 7.2 Design System Constraints

Project design tokens (from `tailwind.config.js`):

| Token | Value | Usage |
|-------|-------|-------|
| `surface` / `surface-soft` / `surface-muted` | `#FAF7F2` / `#F4EFE7` / `#EDE6DA` | Page backgrounds |
| `accent-charcoal` | `#1A1A1A` | Primary text, dark accents |
| `brand-500` | `#FF4B3A` | CTAs, active states, links |
| `font-display` | `"Playfair Display", Georgia, serif` | Headings |
| `font-sans` | `Inter, system-ui` | Body text |
| `card` | White bg, rounded-3xl, shadow-soft | Container components |
| `btn-primary` / `btn-ghost` / `btn-secondary` | Brand colors | Buttons |

### 7.3 Admin Theme Strategy: "Elevated Professional"

Apply the same design tokens but with subtle elevation cues to distinguish admin:

- **Background:** `surface-soft` (slightly deeper than customer's `surface`)
- **Sidebar:** `accent-charcoal` background with warm contrast — dark navigation bar against light content
- **Cards:** Use existing `card` class (white, shadow-soft, rounded-3xl)
- **Typography:** Same font stack — `font-display` for headings, `font-sans` for body
- **Accents:** `brand-500` for primary actions, `accent-forest` (#1F6B4A) for success/positive states, `accent-mustard` (#E8A317) for warnings
- **Data tables:** Light background with subtle zebra striping using `surface-muted`
- **Status badges:** Reuse existing `StatusBadge` component
- **Mobile:** Bottom tab bar instead of horizontal scroll for tab navigation

### 7.4 Component Architecture

Split the monolithic `Manage.tsx` (currently ~800 lines) into:

```
src/components/admin/
├── AdminLayout.tsx          # Sidebar + content area shell
├── AdminSidebar.tsx         # Navigation sidebar
├── StatCard.tsx             # Dashboard metric card
├── DashboardTab.tsx         # Dashboard overview
├── UsersTab.tsx             # User management
├── UserRow.tsx              # User list item with expand
├── OrdersTab.tsx            # Order management
├── OrderRow.tsx             # Order list item with expand + status change
├── MenuTab.tsx              # Menu CRUD
├── MenuForm.tsx             # Add/edit menu item form
├── MenuCard.tsx             # Menu item card in grid
├── PromosTab.tsx            # Promo management
├── PromoForm.tsx            # Add promo form
├── RatingsTab.tsx           # Rating management with pagination
└── TabLoading.tsx           # Loading skeleton for tabs
```

### 7.5 Route Architecture

```typescript
// App.tsx
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin/*" element={<AdminGuard><Manage /></AdminGuard>} />
```

`AdminGuard` reads `adminStore` — if no admin session, redirects to `/admin/login`.

### 7.6 No UI Framework Dependency

The existing project uses TailwindCSS + custom component classes (`.btn`, `.card`, `.input`, `.chip`, `.badge`). Continue using pure TailwindCSS — no external UI library (no shadcn/ui, no MUI, no Chakra). The existing `src/components/ui/` primitives (Button, Card, Input, LoadingSpinner, Skeleton) are sufficient.

---

## 8. Comprehensive Audit Checklist

### 8.1 Backend Routes

| Route | Method | File | Status |
|-------|--------|------|--------|
| `/api/health` | GET | `routes/health.ts` | Verify DB ping, uptime, correct response shape |
| `/api/auth/signup` | POST | `routes/auth.ts` | Verify 400 on invalid email/password/name, 201 on success, cookie forwarding |
| `/api/auth/login` | POST | `routes/auth.ts` | Verify 401 on wrong creds, 200 on success, cookie + token in response |
| `/api/auth/logout` | POST | `routes/auth.ts` | Verify session invalidation |
| `/api/menu` | GET | `routes/menu.ts` | Verify all items returned with rating summaries |
| `/api/orders` | POST | `routes/orders.ts` | Verify auth required, items validation, promo application, delivery creation, response shape |
| `/api/orders` | GET | `routes/orders.ts` | Verify auth required, user-scoped results, items + delivery hydration |
| `/api/orders/:id` | GET | `routes/orders.ts` | Verify auth + ownership, 404 for wrong user |
| `/api/orders/:id/status` | PATCH | `routes/orders.ts` | Verify transition rules (pending→in_progress→delivered only), 400 on invalid transition |
| `/api/promo/validate` | POST | `routes/promo.ts` | Verify valid/invalid response, expiry, maxUses, firstOrderOnly |
| `/api/promo/codes` | GET | `routes/promo.ts` | Verify active promos only, shape matches |
| `/api/ratings/summary` | GET | `routes/ratings.ts` | Verify total count |
| `/api/ratings/:menuId` | GET | `routes/ratings.ts` | Verify summary + ratings list |
| `/api/ratings` | POST | `routes/ratings.ts` | Verify auth, validation (1-5), eligibility (delivered order), upsert behavior |
| `/api/ratings/:menuId/mine` | GET | `routes/ratings.ts` | Verify auth, returns null if none |
| `/api/manage` | GET | `routes/manage.ts` | **CRITICAL: Verify admin guard is APPLIED** |
| `/api/manage/users` | GET | `routes/manage.ts` | Verify auth + admin role, all users returned, orderCount correct |
| `/api/manage/users/:id` | GET/DELETE | `routes/manage.ts` | Verify auth + admin, cascading deletes work |
| `/api/manage/orders` | GET/PATCH | `routes/manage.ts` | Verify auth + admin, status transitions unrestricted but valid values enforced |
| `/api/manage/menu` | GET/POST/PATCH/DELETE | `routes/manage.ts` | Verify auth + admin, usage-check on delete (409 if referenced) |
| `/api/manage/promos` | GET/POST/DELETE | `routes/manage.ts` | Verify auth + admin, duplicate code detection |
| `/api/manage/ratings` | GET/DELETE | `routes/manage.ts` | Verify auth + admin, pagination works |

### 8.2 Frontend Pages

| Page | Route | Expected Behavior |
|------|-------|-------------------|
| Home | `/` | Hero, category cards, trending items, CTA to menu |
| Menu | `/menu` | Category filtering, item cards, add-to-cart, rating display |
| MenuItemDetail | `/menu/:id` | Full item detail, rating summary, add-to-cart, reviews list |
| Login | `/login` | Email/password form, redirect to menu after login, error display |
| Signup | `/signup` | Name/email/password form, redirect after signup, validation errors |
| Cart | `/cart` | Item list, qty adjustment, subtotal, promo input, checkout link |
| Checkout | `/checkout` | Delivery form, payment method, order summary, place order |
| Orders | `/orders` | Order history with status badges, links to detail |
| OrderDetail | `/orders/:id` | Full order detail, status tracker, rating CTA for delivered items |
| About | `/about` | Static content |
| Help | `/help` | Static content |
| Privacy | `/privacy` | Static content |
| Manage | `/manage` | Admin dashboard — all 6 tabs functional |
| AdminLogin | `/admin/login` | NEW — admin credential login |

### 8.3 Data Integrity Checks

- [ ] Verify `order_items.priceAtOrder` matches `menu_items.price` at time of order creation
- [ ] Verify `orders.totalCents` equals sum of `(priceAtOrder × qty)` × (1 − discount)
- [ ] Verify `ratings` unique constraint on (userId, menuId) is enforced
- [ ] Verify `ratings` FK cascade on menu item deletion
- [ ] Verify `orders` FK cascade on order_items
- [ ] Verify session cleanup: expired sessions are not valid

### 8.4 Environment & Config

- [ ] Verify root `.env.example` contains all required variables
- [ ] Remove `apps/backend/.env.example` (superseded)
- [ ] Verify `MANAGE_PASSWORD` env var is no longer required after admin plugin migration
- [ ] Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to `.env.example`
- [ ] Verify `BETTER_AUTH_SECRET` length requirement (32+ chars)
- [ ] Verify `CORS_ORIGIN` includes production frontend URL(s)

---

## 9. Testing Strategy

### 9.1 Backend Tests (Bun Native)

For each route, test:

1. **Success path** — valid input, expected output shape
2. **Auth failure** — missing/invalid auth → 401
3. **Validation failure** — bad input → 400 with correct error code
4. **Not found** — non-existent resource → 404
5. **Business logic guards** — e.g., rating without delivered order → 403

Admin-specific tests:
- Non-admin user accessing `/api/manage/*` → 403
- Admin user accessing `/api/manage/*` → 200
- User CRUD via admin endpoints
- Role assignment and permission checks

### 9.2 Frontend Tests (Vitest + MSW)

- Update MSW handlers to match new backend response shapes
- Add MSW handlers for new admin endpoints
- Test `AdminGuard` redirect behavior
- Test `adminStore` auth state management
- Component tests for admin UI components

### 9.3 Integration Test: Admin Flow

1. Create admin user via seed
2. Sign in as admin
3. Access dashboard — verify stats
4. List users — verify all users returned
5. Create a new user via admin
6. Set user role
7. Ban/unban user
8. View admin user's own orders vs. other users' orders
9. Logout as admin — verify redirect to login

---

## 10. Implementation Phasing

### Phase 1: Critical Security Fix (BLOCKER)
- [ ] Apply admin guard to manage routes immediately (temporary: wire `requireManageAuth` as `beforeHandle`)
- [ ] This must ship before any other work

### Phase 2: Express Removal
- [ ] Delete all files listed in Section 2.2
- [ ] Update Dockerfile to remove any Express references (if any remain)
- [ ] Verify `bun run dev` still works
- [ ] Verify `docker build` still works

### Phase 3: Admin Plugin Integration
- [ ] Add `admin()` plugin to Better-Auth config
- [ ] Add `role`, `banned`, `banReason`, `banExpires` to Drizzle schema
- [ ] Run migration
- [ ] Create `adminGuard` middleware
- [ ] Wire admin guard to manage routes
- [ ] Create `POST /api/admin/login` route
- [ ] Update seed to create initial admin user
- [ ] Remove old `requireManageAuth` and `x-manage-key` support

### Phase 4: Query Optimization
- [ ] Implement batch-loading pattern for all N+1 handlers
- [ ] Add `src/lib/batchLoader.ts` helper
- [ ] Test with 100+ orders to verify performance improvement

### Phase 5: Security Hardening
- [ ] Add `securityHeaders` middleware
- [ ] Configure Better-Auth cookie security options
- [ ] Verify all security headers in browser DevTools

### Phase 6: Manage Dashboard Redesign
- [ ] Create `AdminLayout` with sidebar
- [ ] Extract each tab into separate components
- [ ] Apply warm/light theme (surface-soft background, white cards)
- [ ] Create `AdminLogin` page
- [ ] Add `adminStore` for admin session state
- [ ] Move admin routes to `/admin/*`

### Phase 7: Missing Features (Priority-Ordered)
- [ ] Pagination on manage orders list
- [ ] Order search/filter on admin side
- [ ] Email verification configuration
- [ ] Password reset flow
- [ ] Profile update page (customer)
- [ ] Order cancellation endpoint
- [ ] Shared types package population

### Phase 8: Final Verification
- [ ] Full audit pass against Section 8 checklist
- [ ] Run all backend tests (`bun test`)
- [ ] Run all frontend tests (`bun run test:frontend`)
- [ ] Manual smoke test of all pages
- [ ] Docker build verification
- [ ] Update `CHANGELOG.md`

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Better-Auth admin plugin schema migration fails | Medium | High | Test migration on staging DB first; have rollback SQL ready |
| Existing user sessions break after schema change | Low | High | Deploy during low traffic; Better-Auth handles session schema migration |
| Admin login UX gap — no way to create first admin | Medium | High | Seed script creates initial admin; document procedure in README |
| N+1 batch refactor introduces bugs | Medium | Medium | Integration tests cover each handler before/after |
| Frontend theme inconsistency during transition | Low | Low | New admin components are additive; old Manage.tsx stays until new ones are complete |
| Docker build size increase from Better-Auth admin plugin | Low | Low | Bundle size increase is minimal (~10KB gzipped) |

---

## 12. Out of Scope

- Real-time order tracking (WebSocket/SSE) — separate feature
- Multi-tenancy or store management
- Payment gateway integration (mock payment only)
- Social login providers (Google, GitHub, etc.)
- Email sending infrastructure (Resend/SES/SendGrid)
- CI/CD pipeline
- Kubernetes or multi-replica deployment
- shadcn/ui or any external component library (stick with TailwindCSS + custom classes)
