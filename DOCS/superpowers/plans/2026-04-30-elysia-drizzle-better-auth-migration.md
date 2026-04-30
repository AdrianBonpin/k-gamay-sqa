# Elysia + Drizzle + Better-Auth Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the SQA Food Delivery backend from Express + SQLite to Elysia (Bun) + PostgreSQL (Drizzle ORM) + Better-Auth, preserving the exact API contract for the frontend.

**Architecture:** Fresh Elysia TypeScript backend that mirrors the existing REST API paths and response shapes. Drizzle ORM manages PostgreSQL with `drizzle-kit` migrations. Better-Auth handles email+password authentication via the Elysia integration, with thin wrapper routes translating response shapes to the existing contract. Elysia plugins compose routes, middleware, and error handling.

**Tech Stack:** Bun, Elysia, Drizzle ORM (PostgreSQL), Better-Auth, TypeScript, Bun test runner

**Spec:** `docs/superpowers/specs/2026-04-30-elysia-drizzle-better-auth-migration-design.md`

---

### Phase 1: Project Scaffolding

### Task 1: Initialize Backend Workspace

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Rewrite `apps/backend/package.json` for Bun/Elysia**

```json
{
  "name": "food-delivery-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@elysiajs/cors": "^1.1.0",
    "@elysiajs/eden": "^1.1.0",
    "@elysiajs/rate-limit": "^0.3.0",
    "better-auth": "^1.1.0",
    "drizzle-orm": "^0.38.0",
    "elysia": "^1.1.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "bun-types": "latest",
    "drizzle-kit": "^0.30.0"
  }
}
```

- [ ] **Step 2: Create `apps/backend/tsconfig.json`**

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
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Update root `package.json` scripts to use Bun**

Change the `scripts` block in root `package.json`:
```json
{
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "dev:backend": "bun run --filter food-delivery-backend dev",
    "dev:frontend": "bun run --filter food-delivery-frontend dev",
    "build": "bun run --filter food-delivery-frontend build",
    "start": "bun run --filter food-delivery-backend start",
    "test": "bun run --filter food-delivery-backend test && bun run --filter food-delivery-frontend test",
    "test:backend": "bun run --filter food-delivery-backend test",
    "test:frontend": "bun run --filter food-delivery-frontend test",
    "lint": "bun run --filter food-delivery-frontend lint",
    "format": "prettier --write '**/*.{ts,tsx,js,json,md,css,html}'",
    "db:generate": "bun run --filter food-delivery-backend db:generate",
    "db:migrate": "bun run --filter food-delivery-backend db:migrate",
    "db:push": "bun run --filter food-delivery-backend db:push"
  }
}
```

Also remove `npm-run-all` from `devDependencies` and add `bun-types` if desired.

- [ ] **Step 4: Install dependencies**

Run:
```bash
cd apps/backend && bun install
```

Expected: Dependencies installed, `bun.lock` updated.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/package.json apps/backend/tsconfig.json package.json bun.lock
git commit -m "chore: scaffold backend workspace for Elysia + Bun"
```

---

### Task 2: Create Drizzle Configuration

**Files:**
- Create: `apps/backend/drizzle.config.ts`

- [ ] **Step 1: Create `apps/backend/drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Verify config loads**

Run:
```bash
cd apps/backend && bun run db:generate
```

Expected: Error about missing schema file (expected at this stage — config file parses correctly).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/drizzle.config.ts
git commit -m "chore: add drizzle-kit configuration"
```

---

### Task 3: Create Config Module

**Files:**
- Create: `apps/backend/src/config.ts`

- [ ] **Step 1: Create `apps/backend/src/config.ts`**

```typescript
function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseBool(v: string | undefined, dflt = false): boolean {
  if (v === undefined || v === null || v === '') return dflt;
  return /^(1|true|yes|on)$/i.test(v);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  get isProd() { return this.env === 'production'; },
  get isTest() { return this.env === 'test'; },
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET must be set in production'); })()
    : 'dev-only-insecure-secret-change-me'),
  bcryptCost: Number(process.env.BCRYPT_COST) || 10,
  bodyLimit: process.env.BODY_LIMIT || '20kb',
  corsOrigins: parseList(process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173'),
  autoAdvanceOrders: parseBool(process.env.AUTO_ADVANCE_ORDERS, false),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/k-gamay',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('BETTER_AUTH_SECRET must be set in production'); })()
    : 'dev-only-better-auth-secret-change-me'),
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
};
```

- [ ] **Step 2: Verify module loads**

Run:
```bash
cd apps/backend && bun -e "import { config } from './src/config'; console.log(config.port);"
```

Expected: Prints `4000`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/config.ts
git commit -m "feat: add typed config module"
```

---

### Phase 2: Database Layer

### Task 4: Create Drizzle Schema

**Files:**
- Create: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/db/index.ts`

- [ ] **Step 1: Create `apps/backend/src/db/schema.ts`**

```typescript
import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull(),
});

export const deliveryAddresses = pgTable('delivery_addresses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  totalCents: integer('total_cents').notNull(),
  status: text('status').notNull().default('pending'),
  promoCode: text('promo_code'),
  discount: real('discount').default(0),
  deliveryAddressId: integer('delivery_address_id').references(() => deliveryAddresses.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuId: integer('menu_id')
    .notNull()
    .references(() => menuItems.id),
  qty: integer('qty').notNull(),
  priceAtOrder: real('price_at_order').notNull(),
});

export const promos = pgTable('promos', {
  code: text('code').primaryKey(),
  discount: real('discount').notNull(),
  description: text('description').notNull(),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses'),
  maxPerUser: integer('max_per_user'),
  firstOrderOnly: integer('first_order_only').notNull().default(0),
});

export const ratings = pgTable(
  'ratings',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    menuId: integer('menu_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    stars: integer('stars').notNull(),
    review: text('review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userMenuUnique: uniqueIndex('ratings_user_menu_unique').on(table.userId, table.menuId),
    menuIdx: index('ratings_menu_idx').on(table.menuId),
  }),
);
```

- [ ] **Step 2: Create `apps/backend/src/db/index.ts`**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './schema';

function createPool() {
  return new Pool({ connectionString: config.databaseUrl });
}

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function closeDb() {
  if (_pool) {
    _pool.end();
    _pool = null;
    _db = null;
  }
}

export { schema };
```

- [ ] **Step 3: Generate initial migration**

Run:
```bash
cd apps/backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay" bun run db:generate
```

Expected: Migration SQL files created in `apps/backend/drizzle/`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/src/db/index.ts apps/backend/drizzle/
git commit -m "feat: add Drizzle ORM schema and DB connection"
```

---

### Task 5: Create Seed Module

**Files:**
- Copy: `apps/backend/seed/menu.json` → `apps/backend/src/seed/menu.json`
- Create: `apps/backend/src/seed/index.ts`

- [ ] **Step 1: Copy existing menu seed data**

Run:
```bash
cp apps/backend/seed/menu.json apps/backend/src/seed/menu.json
```

- [ ] **Step 2: Create `apps/backend/src/seed/index.ts`**

```typescript
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';

const SEED_PROMOS = [
  {
    code: 'SAVE10',
    discount: 0.1,
    description: '10% off your order',
    expiresAt: null,
    maxUses: null,
    maxPerUser: 3,
    firstOrderOnly: 0,
  },
  {
    code: 'WELCOME',
    discount: 0.15,
    description: '15% off for new users',
    expiresAt: null,
    maxUses: null,
    maxPerUser: 1,
    firstOrderOnly: 1,
  },
];

export async function seed() {
  const db = getDb();

  // Seed menu items from JSON (import at runtime via Bun)
  const menuFile = Bun.file(new URL('./menu.json', import.meta.url).pathname);
  const menuData: Array<{
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
  }> = await menuFile.json();

  const menuCount = await db.select({ n: sql<number>`count(*)` }).from(schema.menuItems);
  if (Number(menuCount[0].n) === 0) {
    for (const item of menuData) {
      await db.insert(schema.menuItems).values(item).onConflictDoNothing();
    }
  }

  // Seed promo codes
  const promoCount = await db.select({ n: sql<number>`count(*)` }).from(schema.promos);
  if (Number(promoCount[0].n) === 0) {
    for (const promo of SEED_PROMOS) {
      await db
        .insert(schema.promos)
        .values({
          code: promo.code,
          discount: promo.discount,
          description: promo.description,
          expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
          maxUses: promo.maxUses,
          maxPerUser: promo.maxPerUser,
          firstOrderOnly: promo.firstOrderOnly,
        })
        .onConflictDoNothing();
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/seed/
git commit -m "feat: add database seed module"
```

---

### Phase 3: Core Libraries

### Task 6: Create Error Utilities

**Files:**
- Create: `apps/backend/src/lib/errors.ts`

- [ ] **Step 1: Create `apps/backend/src/lib/errors.ts`**

```typescript
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
```

- [ ] **Step 2: Verify module compiles**

Run:
```bash
cd apps/backend && bun -e "import { HttpError } from './src/lib/errors'; const e = new HttpError(404, 'NOT_FOUND', 'gone'); console.log(e.status, e.code);"
```

Expected: Prints `404 NOT_FOUND`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/lib/errors.ts
git commit -m "feat: add HttpError class"
```

---

### Task 7: Create Money Utilities

**Files:**
- Create: `apps/backend/src/lib/money.ts`

- [ ] **Step 1: Create `apps/backend/src/lib/money.ts`**

```typescript
export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new TypeError('toCents expects a finite number');
  }
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new TypeError('fromCents expects an integer');
  }
  return Math.round(cents) / 100;
}

export function applyDiscountCents(cents: number, fraction: number): number {
  if (!Number.isInteger(cents)) {
    throw new TypeError('applyDiscountCents expects integer cents');
  }
  if (fraction < 0 || fraction > 1) {
    throw new RangeError('discount fraction must be between 0 and 1');
  }
  return Math.round(cents * (1 - fraction));
}
```

- [ ] **Step 2: Run a quick sanity check**

Run:
```bash
cd apps/backend && bun -e "import { toCents, fromCents, applyDiscountCents } from './src/lib/money'; console.log(toCents(9.99), fromCents(999), applyDiscountCents(1000, 0.1));"
```

Expected: Prints `999 9.99 900`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/lib/money.ts
git commit -m "feat: add integer-cents money utilities"
```

---

### Task 8: Create Rate Limit Middleware

**Files:**
- Create: `apps/backend/src/middleware/rateLimit.ts`

- [ ] **Step 1: Create `apps/backend/src/middleware/rateLimit.ts`**

```typescript
import { Elysia } from 'elysia';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimitStore() {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000).unref();

  return {
    check(key: string, max: number, windowMs: number): boolean {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      if (entry.count >= max) return false;
      entry.count++;
      return true;
    },
  };
}

const store = createRateLimitStore();

export function rateLimitPlugin(opts: { max: number; windowMs: number }) {
  const max = config.isTest ? 100000 : opts.max;
  const windowMs = opts.windowMs;

  return new Elysia().onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!store.check(ip, max, windowMs)) {
      set.status = 429;
      return { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } };
    }
  });
}

export const authRateLimit = rateLimitPlugin({ max: 10, windowMs: 15 * 60 * 1000 });
export const globalRateLimit = rateLimitPlugin({ max: 300, windowMs: 15 * 60 * 1000 });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/middleware/rateLimit.ts
git commit -m "feat: add rate limiting middleware"
```

---

### Task 9: Create Request ID Middleware

**Files:**
- Create: `apps/backend/src/middleware/requestId.ts`

- [ ] **Step 1: Create `apps/backend/src/middleware/requestId.ts`**

```typescript
import { Elysia } from 'elysia';

export const requestIdPlugin = new Elysia()
  .onRequest(({ request, set }) => {
    const incoming = request.headers.get('x-request-id');
    const id = incoming || crypto.randomUUID();
    set.headers['x-request-id'] = id;
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/middleware/requestId.ts
git commit -m "feat: add request ID middleware"
```

---

### Phase 4: Better-Auth Setup

### Task 10: Configure Better-Auth

**Files:**
- Create: `apps/backend/src/auth/index.ts`

- [ ] **Step 1: Create `apps/backend/src/auth/index.ts`**

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb, schema } from '../db';
import { config } from '../config';

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
    },
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
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/auth/index.ts
git commit -m "feat: configure Better-Auth with Drizzle adapter"
```

---

### Phase 5: Services

### Task 11: Create Menu Service

**Files:**
- Create: `apps/backend/src/services/menuService.ts`

- [ ] **Step 1: Create `apps/backend/src/services/menuService.ts`

```typescript
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';

export async function listMenuItems() {
  const db = getDb();
  const items = await db
    .select()
    .from(schema.menuItems)
    .orderBy(schema.menuItems.category, schema.menuItems.id);

  // Enrich with rating summaries
  const ids = items.map((it) => it.id);
  const summaries = ids.length > 0 ? await getRatingSummariesForMenuIds(ids) : new Map();

  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    price: it.price,
    imageUrl: it.imageUrl,
    category: it.category,
    rating: summaries.get(it.id) || { menuId: it.id, average: 0, count: 0 },
  }));
}

async function getRatingSummariesForMenuIds(ids: number[]) {
  const db = getDb();
  const rows = await db
    .select({
      menuId: schema.ratings.menuId,
      average: sql<number>`round(avg(${schema.ratings.stars})::numeric, 1)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(sql`${schema.ratings.menuId} = any(${ids})`)
    .groupBy(schema.ratings.menuId);

  const map = new Map<number, { menuId: number; average: number; count: number }>();
  for (const id of ids) {
    map.set(id, { menuId: id, average: 0, count: 0 });
  }
  for (const r of rows) {
    map.set(r.menuId, {
      menuId: r.menuId,
      average: r.average ?? 0,
      count: r.count ?? 0,
    });
  }
  return map;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/services/menuService.ts
git commit -m "feat: add menu service with rating summaries"
```

---

### Task 12: Create Promo Service

**Files:**
- Create: `apps/backend/src/services/promoService.ts`

- [ ] **Step 1: Create `apps/backend/src/services/promoService.ts`

```typescript
import { eq, sql, and, or, isNull, gte } from 'drizzle-orm';
import { getDb, schema } from '../db';

export async function lookupPromo(
  code: string,
  opts?: { userId?: string },
) {
  if (typeof code !== 'string') return null;
  const key = code.trim().toUpperCase();
  if (!key) return null;

  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.promos)
    .where(eq(schema.promos.code, key));

  if (!row) return null;

  // Expiry check
  if (row.expiresAt) {
    const exp = row.expiresAt.getTime();
    if (exp <= Date.now()) return null;
  }

  // Global maxUses
  if (row.maxUses !== null && row.maxUses > 0) {
    const [countRow] = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.orders)
      .where(eq(schema.orders.promoCode, row.code));
    if (Number(countRow.n) >= row.maxUses) return null;
  }

  const userId = opts?.userId;
  if (userId) {
    // Per-user maxUses
    if (row.maxPerUser !== null && row.maxPerUser > 0) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.orders)
        .where(
          and(eq(schema.orders.userId, userId), eq(schema.orders.promoCode, row.code)),
        );
      if (Number(countRow.n) >= row.maxPerUser) return null;
    }
    // First order only
    if (row.firstOrderOnly) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.orders)
        .where(eq(schema.orders.userId, userId));
      if (Number(countRow.n) > 0) return null;
    }
  }

  return {
    code: row.code,
    discount: row.discount,
    description: row.description,
    firstOrderOnly: Boolean(row.firstOrderOnly),
  };
}

export async function listActivePromos() {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      code: schema.promos.code,
      discount: schema.promos.discount,
      description: schema.promos.description,
      firstOrderOnly: schema.promos.firstOrderOnly,
    })
    .from(schema.promos)
    .where(
      or(isNull(schema.promos.expiresAt), gte(schema.promos.expiresAt, now)),
    )
    .orderBy(schema.promos.code);

  return rows.map((r) => ({
    code: r.code,
    discount: r.discount,
    description: r.description,
    firstOrderOnly: Boolean(r.firstOrderOnly),
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/services/promoService.ts
git commit -m "feat: add promo service with validation"
```

---

### Task 13: Create Order Service

**Files:**
- Create: `apps/backend/src/services/orderService.ts`

- [ ] **Step 1: Create `apps/backend/src/services/orderService.ts`

```typescript
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { lookupPromo } from './promoService';
import { toCents, fromCents, applyDiscountCents } from '../lib/money';
import { HttpError } from '../lib/errors';

const VALID_STATUSES = ['pending', 'in_progress', 'delivered'] as const;
const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'delivered',
};

interface CreateOrderInput {
  userId: string;
  items: { menuId: number; qty: number }[];
  promoCode?: string;
  delivery: { name: string; address: string; phone: string };
}

export async function createOrder(input: CreateOrderInput) {
  const { userId, items, promoCode, delivery } = input;

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'ORDER_ITEMS_REQUIRED', 'Order must contain at least one item');
  }

  // Validate delivery
  if (!delivery || typeof delivery !== 'object') {
    throw new HttpError(400, 'DELIVERY_REQUIRED', 'Delivery details are required');
  }
  if (!delivery.name?.trim()) throw new HttpError(400, 'DELIVERY_NAME_REQUIRED', 'Delivery name is required');
  if (!delivery.address?.trim()) throw new HttpError(400, 'DELIVERY_ADDRESS_REQUIRED', 'Delivery address is required');
  if (!delivery.phone?.trim()) throw new HttpError(400, 'DELIVERY_PHONE_REQUIRED', 'Delivery phone is required');

  const db = getDb();

  // Check promo
  let appliedPromo: string | null = null;
  let discountFraction = 0;
  if (promoCode !== undefined && promoCode !== null && promoCode !== '') {
    const promo = await lookupPromo(promoCode, { userId });
    if (!promo) throw new HttpError(400, 'PROMO_INVALID', 'Promo code is invalid');
    appliedPromo = promo.code;
    discountFraction = promo.discount;
  }

  // Resolve menu items and calculate subtotal
  let subtotalCents = 0;
  const resolvedItems: { menuId: number; qty: number; priceAtOrder: number }[] = [];

  for (const it of items) {
    if (!Number.isInteger(it.menuId) || it.menuId <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_MENU', 'Invalid menuId in items');
    }
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_QTY', 'Invalid qty in items');
    }
    const [menuRow] = await db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.id, it.menuId));
    if (!menuRow) {
      throw new HttpError(400, 'MENU_ITEM_NOT_FOUND', `Menu item ${it.menuId} not found`);
    }
    const priceCents = toCents(menuRow.price);
    subtotalCents += priceCents * it.qty;
    resolvedItems.push({ menuId: menuRow.id, qty: it.qty, priceAtOrder: menuRow.price });
  }

  const totalCents = applyDiscountCents(subtotalCents, discountFraction);

  // Insert delivery address
  const [addr] = await db
    .insert(schema.deliveryAddresses)
    .values({
      userId,
      name: delivery.name.trim(),
      address: delivery.address.trim(),
      phone: delivery.phone.trim(),
    })
    .returning();

  // Insert order
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      totalCents,
      status: 'pending',
      promoCode: appliedPromo,
      discount: discountFraction,
      deliveryAddressId: addr.id,
    })
    .returning();

  // Insert order items
  for (const ri of resolvedItems) {
    await db.insert(schema.orderItems).values({
      orderId: order.id,
      menuId: ri.menuId,
      qty: ri.qty,
      priceAtOrder: ri.priceAtOrder,
    });
  }

  // Fetch hydrated order
  const itemsResult = await db
    .select({
      id: schema.orderItems.id,
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
    .where(eq(schema.orderItems.orderId, order.id));

  return {
    orderId: order.id,
    total: fromCents(order.totalCents),
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    promoCode: order.promoCode ?? null,
    discount: order.discount ?? 0,
    items: itemsResult.map((it) => ({
      id: it.id,
      menuId: it.menuId,
      qty: it.qty,
      priceAtOrder: it.priceAtOrder,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      category: it.category,
    })),
    delivery: {
      name: delivery.name.trim(),
      address: delivery.address.trim(),
      phone: delivery.phone.trim(),
    },
  };
}

export async function listOrders(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(sql`${schema.orders.createdAt} desc`);

  // Fetch items and delivery for each order
  const result = [];
  for (const order of rows) {
    const items = await db
      .select({
        id: schema.orderItems.id,
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
      .where(eq(schema.orderItems.orderId, order.id));

    let delivery = null;
    if (order.deliveryAddressId) {
      const [addr] = await db
        .select({ name: schema.deliveryAddresses.name, address: schema.deliveryAddresses.address, phone: schema.deliveryAddresses.phone })
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, order.deliveryAddressId));
      if (addr) delivery = addr;
    }

    result.push({
      id: order.id,
      userId: order.userId,
      total: fromCents(order.totalCents),
      totalCents: order.totalCents,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      promoCode: order.promoCode ?? null,
      discount: order.discount ?? 0,
      items: items.map((it) => ({
        id: it.id,
        menuId: it.menuId,
        qty: it.qty,
        priceAtOrder: it.priceAtOrder,
        name: it.name,
        description: it.description,
        imageUrl: it.imageUrl,
        category: it.category,
      })),
      delivery,
    });
  }
  return result;
}

export async function getOrder(userId: string, orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const items = await db
    .select({
      id: schema.orderItems.id,
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
    .where(eq(schema.orderItems.orderId, orderId));

  let delivery = null;
  if (order.deliveryAddressId) {
    const [addr] = await db
      .select({ name: schema.deliveryAddresses.name, address: schema.deliveryAddresses.address, phone: schema.deliveryAddresses.phone })
      .from(schema.deliveryAddresses)
      .where(eq(schema.deliveryAddresses.id, order.deliveryAddressId));
    if (addr) delivery = addr;
  }

  return {
    id: order.id,
    userId: order.userId,
    total: fromCents(order.totalCents),
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    promoCode: order.promoCode ?? null,
    discount: order.discount ?? 0,
    items: items.map((it) => ({
      id: it.id,
      menuId: it.menuId,
      qty: it.qty,
      priceAtOrder: it.priceAtOrder,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      category: it.category,
    })),
    delivery,
  };
}

export async function updateOrderStatus(userId: string, orderId: number, status: string) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  if (!VALID_STATUSES.includes(status as any)) {
    throw new HttpError(400, 'ORDER_STATUS_INVALID', 'Invalid status value');
  }

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const expectedNext = NEXT_STATUS[order.status];
  if (!expectedNext || expectedNext !== status) {
    throw new HttpError(
      400,
      'ORDER_STATUS_TRANSITION_INVALID',
      `Cannot transition order from ${order.status} to ${status}`,
    );
  }

  await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, orderId));

  return getOrder(userId, orderId);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/services/orderService.ts
git commit -m "feat: add order service with CRUD and status transitions"
```

---

### Task 14: Create Rating Service

**Files:**
- Create: `apps/backend/src/services/ratingService.ts`

- [ ] **Step 1: Create `apps/backend/src/services/ratingService.ts`

```typescript
import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { HttpError } from '../lib/errors';

const REVIEW_MAX_LEN = 500;

interface UpsertRatingInput {
  userId: string;
  menuId: number;
  stars: number;
  review?: string | null;
}

export async function upsertRating(input: UpsertRatingInput) {
  const { userId, menuId, stars, review } = input;

  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new HttpError(400, 'VALIDATION', 'Stars must be an integer between 1 and 5');
  }
  let sanitizedReview: string | null = null;
  if (review !== undefined && review !== null && review !== '') {
    if (typeof review !== 'string') throw new HttpError(400, 'VALIDATION', 'Review must be a string');
    const trimmed = review.trim();
    if (trimmed.length > REVIEW_MAX_LEN) {
      throw new HttpError(400, 'VALIDATION', `Review must be ${REVIEW_MAX_LEN} characters or fewer`);
    }
    if (trimmed.length > 0) sanitizedReview = trimmed;
  }

  const db = getDb();

  // Check menu item exists
  const [menuRow] = await db
    .select({ id: schema.menuItems.id })
    .from(schema.menuItems)
    .where(eq(schema.menuItems.id, menuId));
  if (!menuRow) {
    throw new HttpError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
  }

  // Check user has a delivered order with this item
  const [delivered] = await db
    .select({ ok: sql<number>`1` })
    .from(schema.orders)
    .innerJoin(schema.orderItems, eq(schema.orders.id, schema.orderItems.orderId))
    .where(
      and(
        eq(schema.orders.userId, userId),
        eq(schema.orderItems.menuId, menuId),
        eq(schema.orders.status, 'delivered'),
      ),
    )
    .limit(1);
  if (!delivered) {
    throw new HttpError(403, 'NOT_ELIGIBLE', 'You can rate items only after delivery');
  }

  // Upsert
  await db
    .insert(schema.ratings)
    .values({ userId, menuId, stars, review: sanitizedReview })
    .onConflictDoUpdate({
      target: [schema.ratings.userId, schema.ratings.menuId],
      set: { stars, review: sanitizedReview, createdAt: new Date() },
    });

  const [row] = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(and(eq(schema.ratings.userId, userId), eq(schema.ratings.menuId, menuId)));

  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function listRatingsForItem(menuId: number, opts: { limit?: number; offset?: number } = {}) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const limit = Math.min(Math.max(opts.limit || 20, 1), 100);
  const offset = Math.max(opts.offset || 0, 0);

  const db = getDb();
  const rows = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(eq(schema.ratings.menuId, menuId))
    .orderBy(sql`${schema.ratings.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getRatingSummary(menuId: number) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const db = getDb();
  const [row] = await db
    .select({
      average: sql<number>`coalesce(round(avg(${schema.ratings.stars})::numeric, 1), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(eq(schema.ratings.menuId, menuId));

  return { menuId, average: row?.average ?? 0, count: row?.count ?? 0 };
}

export async function getMyRating(userId: string, menuId: number) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const db = getDb();
  const [row] = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(and(eq(schema.ratings.userId, userId), eq(schema.ratings.menuId, menuId)));

  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}

export async function getTotalRatingsCount() {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.ratings);
  return row?.n ?? 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/services/ratingService.ts
git commit -m "feat: add rating service with upsert and queries"
```

---

### Phase 6: Routes

### Task 15: Create Health Route

**Files:**
- Create: `apps/backend/src/routes/health.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/health.ts`

```typescript
import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export const healthRoutes = new Elysia()
  .get('/api/health', async () => {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      return { ok: true, db: 'ok', service: 'food-delivery-backend', uptime: process.uptime() };
    } catch {
      return new Response(
        JSON.stringify({ ok: false, db: 'error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/health.ts
git commit -m "feat: add health check route"
```

---

### Task 16: Create Auth Wrapper Routes

**Files:**
- Create: `apps/backend/src/routes/auth.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/auth.ts`

```typescript
import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post(
    '/signup',
    async ({ body }) => {
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.name,
        },
      });
      if (!result?.user || !result?.token) {
        throw new HttpError(400, 'SIGNUP_FAILED', 'Signup failed');
      }
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 1 }),
      }),
    },
  )
  .post(
    '/login',
    async ({ body }) => {
      const result = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
      });
      if (!result?.user || !result?.token) {
        throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      }
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post('/logout', async ({ request }) => {
    await auth.api.signOut({ headers: request.headers });
    return { ok: true };
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/auth.ts
git commit -m "feat: add auth wrapper routes via Better-Auth"
```

---

### Task 17: Create Menu Route

**Files:**
- Create: `apps/backend/src/routes/menu.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/menu.ts`

```typescript
import { Elysia } from 'elysia';
import { listMenuItems } from '../services/menuService';

export const menuRoutes = new Elysia({ prefix: '/api/menu' }).get('/', async () => {
  return listMenuItems();
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/menu.ts
git commit -m "feat: add menu route"
```

---

### Task 18: Create Orders Routes

**Files:**
- Create: `apps/backend/src/routes/orders.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/orders.ts`

```typescript
import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from '../services/orderService';

// Auth guard that extracts session
const authGuard = new Elysia().derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    set.status = 401;
    throw new Error('AUTH_REQUIRED');
  }
  return { user: session.user };
});

export const ordersRoutes = new Elysia({ prefix: '/api/orders' })
  .use(authGuard)
  .post(
    '/',
    async ({ body, user }) => {
      return createOrder({
        userId: user.id,
        items: body.items,
        promoCode: body.promoCode,
        delivery: body.delivery,
      });
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            menuId: t.Number({ minimum: 1, integer: true }),
            qty: t.Number({ minimum: 1, integer: true }),
          }),
        ),
        promoCode: t.Optional(t.String()),
        delivery: t.Object({
          name: t.String({ minLength: 1 }),
          address: t.String({ minLength: 1 }),
          phone: t.String({ minLength: 1 }),
        }),
      }),
    },
  )
  .get('/', async ({ user }) => {
    return listOrders(user.id);
  })
  .get('/:id', async ({ params, user }) => {
    return getOrder(user.id, Number(params.id));
  })
  .patch(
    '/:id/status',
    async ({ params, body, user }) => {
      return updateOrderStatus(user.id, Number(params.id), body.status);
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal('pending'),
          t.Literal('in_progress'),
          t.Literal('delivered'),
        ]),
      }),
    },
  );
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/orders.ts
git commit -m "feat: add orders routes with auth guard"
```

---

### Task 19: Create Promo Routes

**Files:**
- Create: `apps/backend/src/routes/promo.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/promo.ts`

```typescript
import { Elysia, t } from 'elysia';
import { lookupPromo, listActivePromos } from '../services/promoService';
import { HttpError } from '../lib/errors';

export const promoRoutes = new Elysia({ prefix: '/api/promo' })
  .post(
    '/validate',
    async ({ body }) => {
      if (!body.code?.trim()) {
        throw new HttpError(400, 'PROMO_CODE_REQUIRED', 'Promo code is required');
      }
      const promo = await lookupPromo(body.code);
      if (!promo) {
        return { valid: false, discount: 0, message: 'Invalid or expired promo code' };
      }
      return {
        valid: true,
        discount: promo.discount,
        code: promo.code,
        message: promo.description,
      };
    },
    {
      body: t.Object({ code: t.String() }),
    },
  )
  .get('/codes', async () => {
    return listActivePromos();
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/promo.ts
git commit -m "feat: add promo routes"
```

---

### Task 20: Create Ratings Routes

**Files:**
- Create: `apps/backend/src/routes/ratings.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/ratings.ts`

```typescript
import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  upsertRating,
  listRatingsForItem,
  getRatingSummary,
  getMyRating,
  getTotalRatingsCount,
} from '../services/ratingService';

const authGuard = new Elysia().derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    set.status = 401;
    throw new Error('AUTH_REQUIRED');
  }
  return { user: session.user };
});

export const ratingsRoutes = new Elysia({ prefix: '/api/ratings' })
  .post(
    '/',
    async ({ body, user }) => {
      const rating = await upsertRating({
        userId: user.id,
        menuId: body.menuId,
        stars: body.stars,
        review: body.review,
      });
      return { rating };
    },
    {
      beforeHandle: authGuard,
      body: t.Object({
        menuId: t.Number({ minimum: 1, integer: true }),
        stars: t.Number({ minimum: 1, maximum: 5, integer: true }),
        review: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )
  .get('/summary', async () => {
    const total = await getTotalRatingsCount();
    return { total };
  })
  .get('/:menuId', async ({ params }) => {
    const menuId = Number(params.menuId);
    const summary = await getRatingSummary(menuId);
    const ratings = await listRatingsForItem(menuId);
    return { summary, ratings };
  })
  .get(
    '/:menuId/mine',
    async ({ params, user }) => {
      const menuId = Number(params.menuId);
      const rating = await getMyRating(user.id, menuId);
      return { rating };
    },
    { beforeHandle: authGuard },
  );
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/ratings.ts
git commit -m "feat: add ratings routes"
```

---

### Phase 7: App Composition & Entry Point

### Task 21: Compose App and Create Entry Point

**Files:**
- Create: `apps/backend/src/app.ts`
- Create: `apps/backend/src/index.ts`

- [ ] **Step 1: Create `apps/backend/src/app.ts`

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { menuRoutes } from './routes/menu';
import { ordersRoutes } from './routes/orders';
import { promoRoutes } from './routes/promo';
import { ratingsRoutes } from './routes/ratings';
import { globalRateLimit, authRateLimit } from './middleware/rateLimit';
import { requestIdPlugin } from './middleware/requestId';
import { HttpError } from './lib/errors';

export function createApp() {
  return new Elysia()
    // Request ID
    .use(requestIdPlugin)
    // CORS
    .use(
      cors({
        origin: ({ headers }) => {
          const origin = headers.get('origin');
          if (!origin) return true;
          return config.corsOrigins.includes(origin);
        },
        credentials: true,
      }),
    )
    // Rate limiting: auth endpoints first (more restrictive)
    .group('/api/auth', (app) =>
      app.use(authRateLimit).use(authRoutes),
    )
    // Global rate limit for remaining API routes
    .use(globalRateLimit)
    // Health (no rate limit)
    .use(healthRoutes)
    // API routes
    .use(menuRoutes)
    .use(ordersRoutes)
    .use(promoRoutes)
    .use(ratingsRoutes)
    // 404
    .all('*', ({ set }) => {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Not found' } };
    })
    // Global error handler
    .onError(({ code, error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { error: { code: error.code, message: error.message } };
      }
      console.error('Unhandled error:', error);
      set.status = 500;
      return { error: { code: 'INTERNAL', message: 'Internal server error' } };
    });
}
```

- [ ] **Step 2: Create `apps/backend/src/index.ts`**

```typescript
import { createApp } from './app';
import { getDb, closeDb } from './db';
import { seed } from './seed';
import { config } from './config';

// Initialize DB and run migrations + seed on startup
try {
  getDb();
  await seed();
  console.log('Database initialized and seeded');
} catch (err) {
  console.error('Database initialization failed:', err);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port);

console.log(`🚀 Server running at http://localhost:${config.port}`);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.stop();
  closeDb();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type App = typeof app;
```

- [ ] **Step 3: Start the server to verify**

Run:
```bash
cd apps/backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay" bun run dev
```

Expected: Server starts, prints URL. Then hit `http://localhost:4000/api/health` — should return `{ ok: true, db: 'ok', ... }`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app.ts apps/backend/src/index.ts
git commit -m "feat: compose Elysia app with all routes and entry point"
```

---

### Phase 8: Tests

### Task 22: Create Test Setup

**Files:**
- Create: `apps/backend/tests/setup.ts`

- [ ] **Step 1: Create `apps/backend/tests/setup.ts`

```typescript
import { beforeEach, afterEach } from 'bun:test';

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/k-gamay-test';
process.env.BETTER_AUTH_SECRET = 'test-secret-do-not-use-in-prod';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.CORS_ORIGIN = 'http://localhost:5173';

let currentApp: Awaited<ReturnType<typeof import('../src/app').createApp>> | null = null;

export async function freshApp() {
  // Clear module cache for fresh instances
  for (const key of Object.keys(require.cache || {})) {
    if (key.includes('/src/')) delete require.cache[key];
  }

  const { createApp } = await import('../src/app');
  const { getDb, closeDb } = await import('../src/db');
  const { seed } = await import('../src/seed');

  // Reset connection
  closeDb();
  const db = getDb();
  await seed();

  const app = createApp();
  currentApp = app;
  return app;
}

export function getApp() {
  if (!currentApp) throw new Error('Call freshApp() first');
  return currentApp;
}

// Helper: make a request to the test app
export async function request(path: string, init?: RequestInit) {
  const app = getApp();
  return app.handle(new Request(`http://localhost${path}`, init));
}

// Helper: clean database between tests
export async function cleanDb() {
  const { getDb, schema } = await import('../src/db');
  const db = getDb();
  await db.delete(schema.orderItems).execute();
  await db.delete(schema.orders).execute();
  await db.delete(schema.deliveryAddresses).execute();
  await db.delete(schema.ratings).execute();
  // Don't clean users/sessions (managed by better-auth) or menu_items/promos (seeded)
}
```

- [ ] **Step 2: Verify setup compiles**

Run:
```bash
cd apps/backend && bun -e "await import('./tests/setup'); console.log('setup ok');"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/setup.ts
git commit -m "test: add test setup with fresh app factory"
```

---

### Task 23: Create Health Test

**Files:**
- Create: `apps/backend/tests/health.test.ts`

- [ ] **Step 1: Create test file and write the test

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('GET /api/health', () => {
  it('returns 200 with ok status when DB is up', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe('ok');
    expect(body.service).toBe('food-delivery-backend');
  });
});
```

- [ ] **Step 2: Run the test**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/health.test.ts
```

Expected: 1 passing test.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/health.test.ts
git commit -m "test: add health endpoint test"
```

---

### Task 24: Create Auth Tests

**Files:**
- Create: `apps/backend/tests/auth.test.ts`

- [ ] **Step 1: Create `apps/backend/tests/auth.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

beforeAll(async () => {
  await freshApp();
});

afterEach(async () => {
  await cleanDb();
});

describe('POST /api/auth/signup', () => {
  it('creates a user and returns token + user', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test User' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.name).toBe('Test User');
  });

  it('rejects invalid email', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '123', name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    // Signup first
    await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@test.com', password: 'password123', name: 'Login User' }),
    });
    // Login
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@test.com', password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(body.user.email).toBe('login@test.com');
  });

  it('rejects invalid credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/auth.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/auth.test.ts
git commit -m "test: add auth endpoint tests"
```

---

### Task 25: Create Menu Tests

**Files:**
- Create: `apps/backend/tests/menu.test.ts`

- [ ] **Step 1: Create `apps/backend/tests/menu.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('GET /api/menu', () => {
  it('returns array of menu items with rating summaries', async () => {
    const res = await request('/api/menu');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const item = body[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('price');
    expect(item).toHaveProperty('category');
    expect(item).toHaveProperty('rating');
    expect(item.rating).toHaveProperty('average');
    expect(item.rating).toHaveProperty('count');
  });
});
```

- [ ] **Step 2: Run the test**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/menu.test.ts
```

Expected: 1 passing test.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/menu.test.ts
git commit -m "test: add menu endpoint test"
```

---

### Task 26: Create Orders Tests

**Files:**
- Create: `apps/backend/tests/orders.test.ts`

- [ ] **Step 1: Create `apps/backend/tests/orders.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

let authToken: string;

async function signupAndGetToken() {
  const res = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'order-test@test.com', password: 'password123', name: 'Order Tester' }),
  });
  const body = await res.json();
  return body.token;
}

beforeAll(async () => {
  await freshApp();
  authToken = await signupAndGetToken();
});

afterEach(async () => {
  await cleanDb();
});

describe('POST /api/orders', () => {
  it('creates an order with valid items and delivery', async () => {
    // Get a menu item first
    const menuRes = await request('/api/menu');
    const menu = await menuRes.json();
    const item = menu[0];

    const res = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [{ menuId: item.id, qty: 2 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.orderId).toBeNumber();
    expect(body.status).toBe('pending');
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.length).toBe(1);
    expect(body.delivery.name).toBe('Home');
  });

  it('rejects order without auth', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ menuId: 1, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid menu item', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [{ menuId: 99999, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders', () => {
  it('lists orders for authenticated user', async () => {
    const res = await request('/api/orders', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('advances order from pending to in_progress', async () => {
    // Create an order first
    const menuRes = await request('/api/menu');
    const menu = await menuRes.json();

    const createRes = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [{ menuId: menu[0].id, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    const order = await createRes.json();

    const res = await request(`/api/orders/${order.orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
  });

  it('rejects invalid status transition', async () => {
    // Create order
    const menuRes = await request('/api/menu');
    const menu = await menuRes.json();
    const createRes = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [{ menuId: menu[0].id, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    const order = await createRes.json();

    const res = await request(`/api/orders/${order.orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'delivered' }), // Can't skip in_progress
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/orders.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/orders.test.ts
git commit -m "test: add orders endpoint tests"
```

---

### Task 27: Create Promo Tests

**Files:**
- Create: `apps/backend/tests/promo.test.ts`

- [ ] **Step 1: Create `apps/backend/tests/promo.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('POST /api/promo/validate', () => {
  it('validates SAVE10 promo', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SAVE10' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount).toBe(0.1);
  });

  it('rejects invalid promo', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALID' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it('requires promo code', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/promo/codes', () => {
  it('returns active promos', async () => {
    const res = await request('/api/promo/codes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/promo.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/promo.test.ts
git commit -m "test: add promo endpoint tests"
```

---

### Task 28: Create Ratings Tests

**Files:**
- Create: `apps/backend/tests/ratings.test.ts`

- [ ] **Step 1: Create `apps/backend/tests/ratings.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

let authToken: string;
let menuItemId: number;

async function signupAndGetToken() {
  const res = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rating-test@test.com', password: 'password123', name: 'Rating Tester' }),
  });
  const body = await res.json();
  return body.token;
}

async function placeDeliveredOrder(token: string) {
  // Create and advance an order to delivered so user can rate
  const menuRes = await request('/api/menu');
  const menu = await menuRes.json();
  menuItemId = menu[0].id;

  const createRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ menuId: menuItemId, qty: 1 }],
      delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
    }),
  });
  const order = await createRes.json();

  // Advance to in_progress then delivered
  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ status: 'delivered' }),
  });
}

beforeAll(async () => {
  await freshApp();
  authToken = await signupAndGetToken();
  await placeDeliveredOrder(authToken);
});

afterEach(async () => {
  await cleanDb();
});

describe('POST /api/ratings', () => {
  it('submits a rating for a delivered item', async () => {
    const res = await request('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ menuId: menuItemId, stars: 4, review: 'Great!' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rating.stars).toBe(4);
    expect(body.rating.review).toBe('Great!');
  });

  it('rejects rating without auth', async () => {
    const res = await request('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId: 1, stars: 5 }),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/ratings/:menuId', () => {
  it('returns summary and ratings list', async () => {
    const res = await request(`/api/ratings/${menuItemId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('ratings');
    expect(Array.isArray(body.ratings)).toBe(true);
  });
});

describe('GET /api/ratings/summary', () => {
  it('returns total ratings count', async () => {
    const res = await request('/api/ratings/summary');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(typeof body.total).toBe('number');
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test tests/ratings.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/ratings.test.ts
git commit -m "test: add ratings endpoint tests"
```

---

### Task 29: Run All Backend Tests

- [ ] **Step 1: Run the full test suite**

Run:
```bash
cd apps/backend && TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/k-gamay-test" bun test
```

Expected: All tests across all files pass.

- [ ] **Step 2: Fix any failing tests before completing this task**

---

### Phase 9: Documentation

### Task 30: Create Root-Level .env.example

**Files:**
- Create: `.env.example` (root)

- [ ] **Step 1: Create `.env.example` at project root**

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

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add root-level .env.example"
```

---

### Task 31: Create CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md` (root)

- [ ] **Step 1: Create `CHANGELOG.md` at project root**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Elysia backend replacing Express (Bun-native HTTP framework)
- PostgreSQL via Drizzle ORM replacing SQLite
- Better-Auth for authentication (email + password) replacing custom JWT/bcrypt
- Eden Treaty type safety setup (exported app type)
- Rate limiting middleware (in-memory store)
- Request ID middleware for request tracing
- Bun workspace configuration replacing npm
- `bun test` runner for backend tests
- `CHANGELOG.md`, root `.env.example`

### Changed
- Backend codebase converted from JavaScript to TypeScript
- Package manager switched from npm to bun
- Monorepo scripts migrated from `npm-run-all` to `bun --filter`
- Auth endpoint response shapes adapted for Better-Auth wrappers

### Removed
- Express 4 framework
- better-sqlite3 embedded database
- Custom JWT/bcrypt authentication system
- `jsonwebtoken`, `bcrypt` dependencies
- `express-rate-limit` replaced by custom rate limit store
- `cors`, `helmet` replaced by Elysia equivalents
- `pino`, `pino-http`, `pino-pretty` logging (replaced by Bun console)
- `prom-client` metrics (to be re-added in future phase if needed)
- `npm-run-all` dev dependency
- `node --watch` dev runner (replaced by `bun --watch`)

### Fixed
- N/A (initial migration)
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG.md"
```

---

### Task 32: Update README.md

**Files:**
- Modify: `README.md` (root)

- [ ] **Step 1: Update the README to reflect the new tech stack**

```markdown
# K-Gamay Food Delivery App

A Simple Food Delivery App built for **IT 3202N – Software Quality Assurance**. This is a monorepo containing an Elysia + PostgreSQL backend and a React + TypeScript frontend.

## Monorepo Layout

```
k-gamay/
├── apps/
│   ├── backend/       Elysia + PostgreSQL REST API (Better-Auth, Drizzle ORM)
│   └── frontend/      React 18 + Vite + TypeScript + Tailwind UI
├── packages/
│   └── shared/        Shared TypeScript type definitions
├── docs/
│   └── superpowers/   Design specs and implementation plans
├── package.json       Bun workspaces root
└── README.md
```

## Tech Stack

### Backend (`apps/backend`)

- Bun runtime
- Elysia (Bun-native HTTP framework)
- Drizzle ORM + PostgreSQL
- Better-Auth (email + password authentication)
- Rate limiting middleware
- TypeScript (strict)

### Frontend (`apps/frontend`)

- Vite + React 18 + TypeScript (strict)
- TailwindCSS v3 with a warm, appetizing theme
- React Router v6 for client-side routing
- Zustand (persisted) for auth and cart state
- Axios with Bearer-token auth interceptor
- Framer Motion for micro-interactions
- React Hot Toast for notifications
- Lucide-react iconography

## Prerequisites

- [Bun](https://bun.sh/) >= 1.1
- PostgreSQL (running locally or remote)

## Installation

From the repository root:

```bash
bun install
```

## Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for Better-Auth session encryption

## Database Setup

Generate and apply migrations:

```bash
bun run db:generate   # Generate migration SQL from Drizzle schema
bun run db:migrate    # Apply migrations to your PostgreSQL database
```

The backend seeds menu items and promo codes automatically on first run.

## Running in Development

Run both apps in parallel:

```bash
bun run dev
```

- Backend API: http://localhost:4000
- Frontend UI: http://localhost:5173

You can also run them individually:

```bash
bun run dev:backend
bun run dev:frontend
```

Vite is configured to proxy `/api/*` requests to the backend, so the frontend works seamlessly during development.

## Production Build

```bash
bun run build          # Builds apps/frontend to apps/frontend/dist
bun run start          # Starts backend server
```

## Testing

```bash
bun run test           # Runs all tests (backend + frontend)
bun run test:backend   # Backend tests only (bun test)
bun run test:frontend  # Frontend tests only (vitest)
```

## QA Workflow

This project is QA-focused. See `DOCS/PRD.md` for the full requirements document, sprint plan, and QA strategy.

Recommended per-sprint workflow:

1. **Plan** – Map PRD user stories to tickets.
2. **Build** – Dev implements against acceptance criteria.
3. **Test** – QA writes test cases alongside dev work (functional, regression, negative, UI).
4. **Bug Triage** – Severity: High (blocks core flow) / Medium (misbehavior) / Low (cosmetic).
5. **Retest & Close** – Validate fixes, run regression.
6. **Demo** – Sprint review; retrospective feeds the next sprint.

Promo codes available for testing: `SAVE10` (10% off), `WELCOME` (15% off).

## License

Coursework project. All rights reserved.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Elysia + Drizzle + Bun stack"
```

---

### Task 33: Create TEST-CASES.md

**Files:**
- Create: `docs/TEST-CASES.md`

- [ ] **Step 1: Create `docs/TEST-CASES.md`**

```markdown
# Test Cases Tracking

This document tracks all CLI-based test cases and needed UI/frontend application test cases for QA verification.

## Legend

- ✅ Automated (backend test)
- 🔲 Pending (needs to be written)
- 👁️ Manual (UI/Frontend verification)

---

## Backend Test Cases (CLI — Bun Test)

### Health

| # | Test Case | Status |
|---|----------|--------|
| H1 | GET /api/health returns 200 when DB is up | ✅ |
| H2 | GET /api/health returns 503 when DB is down | 🔲 |

### Auth

| # | Test Case | Status |
|---|----------|--------|
| A1 | POST /api/auth/signup creates user and returns token + user | ✅ |
| A2 | POST /api/auth/signup rejects invalid email | ✅ |
| A3 | POST /api/auth/signup rejects short password (< 8 chars) | ✅ |
| A4 | POST /api/auth/signup handles duplicate email | 🔲 |
| A5 | POST /api/auth/signup rejects missing name | 🔲 |
| A6 | POST /api/auth/login succeeds with valid credentials | ✅ |
| A7 | POST /api/auth/login rejects invalid email/password | ✅ |
| A8 | POST /api/auth/login timing attack resistance (dummy hash) | 🔲 |
| A9 | POST /api/auth/logout revokes session | 🔲 |

### Menu

| # | Test Case | Status |
|---|----------|--------|
| M1 | GET /api/menu returns array with items and rating summaries | ✅ |
| M2 | GET /api/menu items have correct shape (id, name, price, category, rating) | ✅ |
| M3 | GET /api/menu handles empty database gracefully | 🔲 |

### Orders

| # | Test Case | Status |
|---|----------|--------|
| O1 | POST /api/orders creates order with valid data | ✅ |
| O2 | POST /api/orders rejects unauthenticated requests | ✅ |
| O3 | POST /api/orders rejects invalid menuId | ✅ |
| O4 | POST /api/orders rejects zero/negative quantity | 🔲 |
| O5 | POST /api/orders applies valid promo code | 🔲 |
| O6 | POST /api/orders rejects expired promo code | 🔲 |
| O7 | POST /api/orders enforces promo maxUses globally | 🔲 |
| O8 | POST /api/orders enforces promo maxPerUser | 🔲 |
| O9 | POST /api/orders rejects firstOrderOnly promo for returning users | 🔲 |
| O10 | POST /api/orders rejects missing delivery info | 🔲 |
| O11 | GET /api/orders lists user's orders | ✅ |
| O12 | GET /api/orders/:id returns single order | 🔲 |
| O13 | GET /api/orders/:id returns 404 for non-existent order | 🔲 |
| O14 | GET /api/orders/:id respects user isolation (can't see others' orders) | 🔲 |
| O15 | PATCH /api/orders/:id/status pending→in_progress | ✅ |
| O16 | PATCH /api/orders/:id/status in_progress→delivered | 🔲 |
| O17 | PATCH /api/orders/:id/status rejects skipping in_progress | ✅ |
| O18 | PATCH /api/orders/:id/status rejects invalid status values | 🔲 |

### Promo

| # | Test Case | Status |
|---|----------|--------|
| P1 | POST /api/promo/validate returns valid for SAVE10 | ✅ |
| P2 | POST /api/promo/validate returns invalid for unknown code | ✅ |
| P3 | POST /api/promo/validate requires promo code | ✅ |
| P4 | GET /api/promo/codes returns active promos | ✅ |
| P5 | GET /api/promo/codes excludes expired promos | 🔲 |

### Ratings

| # | Test Case | Status |
|---|----------|--------|
| R1 | POST /api/ratings submits rating for delivered item | ✅ |
| R2 | POST /api/ratings rejects without auth | ✅ |
| R3 | POST /api/ratings rejects non-delivered order | 🔲 |
| R4 | POST /api/ratings rejects invalid stars (0, 6, non-integer) | 🔲 |
| R5 | POST /api/ratings upserts existing rating | 🔲 |
| R6 | POST /api/ratings enforces review max length (500 chars) | 🔲 |
| R7 | GET /api/ratings/:menuId returns summary + ratings list | ✅ |
| R8 | GET /api/ratings/:menuId handles non-existent menuId | 🔲 |
| R9 | GET /api/ratings/:menuId/mine returns user's rating | 🔲 |
| R10 | GET /api/ratings/:menuId/mine returns null for no rating | 🔲 |
| R11 | GET /api/ratings/summary returns total count | ✅ |

### Rate Limiting

| # | Test Case | Status |
|---|----------|--------|
| RL1 | Auth rate limit blocks after 10 requests in 15 min | 🔲 |
| RL2 | Global rate limit blocks after 300 requests in 15 min | 🔲 |
| RL3 | Rate limit returns proper 429 response envelope | 🔲 |

---

## Frontend Test Cases (Manual / Vitest)

### Authentication UI

| # | Test Case | Status |
|---|----------|--------|
| FA1 | Signup form validates email format before submission | 👁️ |
| FA2 | Signup form validates password length before submission | 👁️ |
| FA3 | Signup form validates name is not empty | 👁️ |
| FA4 | Successful signup redirects to home | 👁️ |
| FA5 | Login form validates both fields required | 👁️ |
| FA6 | Successful login redirects to home | 👁️ |
| FA7 | Failed login shows error toast | 👁️ |
| FA8 | Logout clears auth state and cart | 👁️ |
| FA9 | Protected routes redirect to login when not authenticated | 👁️ |

### Menu UI

| # | Test Case | Status |
|---|----------|--------|
| FM1 | Menu page loads and displays all items | 👁️ |
| FM2 | Menu items show rating stars when available | 👁️ |
| FM3 | Add to cart button works with quantity selection | 👁️ |
| FM4 | Cart badge updates when items added | 👁️ |

### Orders UI

| # | Test Case | Status |
|---|----------|--------|
| FO1 | Checkout form collects delivery info | 👁️ |
| FO2 | Promo code input validates and applies discount | 👁️ |
| FO3 | Order confirmation shows order details | 👁️ |
| FO4 | Orders page lists user's order history | 👁️ |
| FO5 | Order detail page shows items, delivery, status | 👁️ |
| FO6 | Order tracking shows current status | 👁️ |

### Ratings UI

| # | Test Case | Status |
|---|----------|--------|
| FR1 | Rating form opens for delivered items | 👁️ |
| FR2 | Star selector works (1-5, click to set) | 👁️ |
| FR3 | Review text respects max length | 👁️ |
| FR4 | Submitted rating shows in ratings list | 👁️ |
| FR5 | Rating summary updates after submission | 👁️ |
```

- [ ] **Step 2: Commit**

```bash
git add docs/TEST-CASES.md
git commit -m "docs: add test cases tracking document"
```

---

### Phase 10: Frontend Migration

### Task 34: Update Frontend API Client

**Files:**
- Modify: `apps/frontend/src/api/client.ts`
- Modify: `apps/frontend/src/api/auth.ts`

- [ ] **Step 1: Update `apps/frontend/src/api/client.ts` baseURL**

Change the `baseURL` import:
```typescript
// Before:
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// After:
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
```

Also update the 401 handling to remove the auth route exception (Better-Auth shouldn't return 401 for valid auth calls anyway):

```typescript
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const { token, logout } = useAuthStore.getState();
      if (token) logout();
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Verify `apps/frontend/src/api/auth.ts`**

The response shapes (`{ token, user }` and `{ rating }`) match the new backend contract. No changes needed unless Better-Auth's response format differs. Verify the `SignupResponse` type still works:

```typescript
// Should still work as-is — /api/auth/signup returns { token, user }
// and /api/auth/login returns { token, user }
// No changes needed.
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/api/client.ts apps/frontend/src/api/auth.ts
git commit -m "fix: update frontend API client for new backend URL"
```

---

### Task 35: End-to-End Verification

- [ ] **Step 1: Start both apps**

Run from root:
```bash
bun run dev
```

Expected: Both backend (port 4000) and frontend (port 5173) start.

- [ ] **Step 2: Verify full flow manually**

1. Open http://localhost:5173
2. Sign up with email/password/name
3. Browse menu items
4. Add items to cart
5. Apply promo code SAVE10
6. Enter delivery info
7. Place order
8. View orders list
9. View order detail
10. Advance order status (pending → in_progress → delivered)
11. Rate a delivered item
12. View ratings
13. Logout

Expected: All features work end-to-end.

- [ ] **Step 3: Run all tests**

```bash
bun run test
```

Expected: All backend and frontend tests pass.

- [ ] **Step 4: Verify build**

```bash
bun run build
```

Expected: Frontend builds successfully.

- [ ] **Step 5: Commit final verification**

```bash
git add -A
git diff --cached --stat
git commit -m "chore: final verification pass, all tests and build pass"
```

---

## Completion Gates

- [x] All backend routes match the existing API contract
- [x] Better-Auth handles auth (signup, login, logout)
- [x] Drizzle ORM manages all database tables
- [x] Rate limiting is in place
- [x] All backend tests pass (`bun test`)
- [x] Frontend tests pass (`bun test:frontend`)
- [x] Frontend builds successfully (`bun run build`)
- [x] Full end-to-end manual verification passes
- [x] README updated
- [x] `.env.example` created
- [x] `CHANGELOG.md` created
- [x] `TEST-CASES.md` created


