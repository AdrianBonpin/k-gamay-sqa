> CURRENT PROGRESS: 🎉 ALL DONE — 28/28 steps complete | Plan: 100%

# SQA Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin order detail crash (`fromCents expects an integer`), harden checkout input validation on both frontend and backend, and clean up type inconsistencies across the system.

**Architecture:** Four atomic phases targeting distinct layers. Phase 1 fixes the single-line crash in the admin OrderRow component. Phase 2 adds backend validation constraints (maxLength, phone regex, payment method allowlist) to the Elysia schema and order service. Phase 3 adds frontend maxLength guards. Phase 4 fixes route parameter coercion, test assertions, and money utility deprecation.

**Tech Stack:** ElysiaJS (Bun) backend, React + TypeScript (Vite) frontend, Drizzle ORM, Vitest (frontend tests), Bun test runner (backend tests)

---

## Phase 1: Fix Admin Order Detail Crash (Critical)

### Task 1.1: Fix discount display in OrderRow.tsx

**Files:**
- Modify: `apps/frontend/src/components/admin/OrderRow.tsx:56`

- [x] **Step 1: Replace the discount display line**

The line `{formatMoney(detail.discount)}` passes a fraction (e.g., `0.1`) to a function expecting integer cents, causing `fromCents expects an integer`. The discount must be displayed as a percentage.

Replace line 56:

```tsx
// BEFORE:
<div><span className="text-accent-charcoal/40">Discount</span><p className="font-medium text-accent-charcoal">{formatMoney(detail.discount)}</p></div>

// AFTER:
<div><span className="text-accent-charcoal/40">Discount</span><p className="font-medium text-accent-charcoal">{Math.round(detail.discount * 100)}%</p></div>
```

- [x] **Step 2: Run frontend tests to verify no regressions**

```bash
cd apps/frontend && bun test run
```

Expected: All existing tests PASS.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/components/admin/OrderRow.tsx
git commit -m "fix: display admin order discount as percentage instead of treating fraction as cents"
```

---

### Task 1.2: Add unit test for OrderRow discount rendering

**Files:**
- Create: `apps/frontend/src/components/admin/OrderRow.test.tsx`

- [x] **Step 1: Write the test file**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderRow } from './OrderRow';
import type { ManageOrder } from '@/api/manage';

// Mock formatMoney to avoid needing the full cents pipeline
vi.mock('@/lib/money', () => ({
  formatMoney: (cents: number) => `₱${(cents / 100).toFixed(2)}`,
}));

const makeOrder = (overrides?: Partial<ManageOrder>): ManageOrder => ({
  id: 1,
  userId: 1,
  userEmail: 'test@example.com',
  userName: 'Test User',
  status: 'pending',
  createdAt: '2026-05-13T00:00:00.000Z',
  total: 12.50,
  totalCents: 1250,
  promoCode: 'WELCOME',
  discount: 0.1,
  items: [
    {
      id: 1,
      menuId: 1,
      qty: 2,
      priceAtOrder: 6.25,
      name: 'Burger',
      imageUrl: '/img/burger.jpg',
    },
  ],
  delivery: {
    name: 'Home',
    address: '123 St',
    phone: '555-1234',
  },
  ...overrides,
});

const noop = () => {};

describe('OrderRow', () => {
  it('renders discount as percentage, not as cents', () => {
    render(
      <OrderRow
        order={makeOrder({ discount: 0.15 })}
        expanded={true}
        detail={makeOrder({ discount: 0.15 })}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    // The discount should display "15%", NOT crash on fromCents
    expect(screen.getByText('15%')).toBeDefined();
  });

  it('renders 0% when discount is zero', () => {
    render(
      <OrderRow
        order={makeOrder({ discount: 0 })}
        expanded={true}
        detail={makeOrder({ discount: 0 })}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders totalCents correctly via formatMoney', () => {
    render(
      <OrderRow
        order={makeOrder()}
        expanded={true}
        detail={makeOrder()}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    // formatMoney(1250) should produce "₱12.50"
    expect(screen.getByText(/₱12\.50/)).toBeDefined();
  });
});
```

- [x] **Step 2: Install testing-library dependencies if not already present**

```bash
cd apps/frontend && bun add -d @testing-library/react @testing-library/jest-dom jsdom
```

Check `apps/frontend/vitest.config.js` or `apps/frontend/package.json` for an existing `test` section; ensure `environment: 'jsdom'` is configured in vitest.

- [x] **Step 3: Run the new test**

```bash
cd apps/frontend && bun test run src/components/admin/OrderRow.test.tsx
```

Expected: 3 tests PASS.

- [x] **Step 4: Commit**

```bash
git add apps/frontend/src/components/admin/OrderRow.test.tsx
git commit -m "test: add OrderRow discount rendering tests"
```

---

### Phase 1 Verification

```bash
cd apps/frontend && bun test run
```

Expected: All tests PASS. No crashes. The `fromCents expects an integer` error is eliminated.

---

## Phase 2: Backend Input Validation Hardening (High)

### Task 2.1: Add maxLength and phone regex to orders Elysia schema

**Files:**
- Modify: `apps/backend/src/routes/orders.ts:46-51`

- [x] **Step 1: Replace the delivery sub-object schema**

The current Elysia schema only has `minLength: 1` on `name`, `address`, and `phone`. Add `maxLength` constraints and a phone format regex matching digits, spaces, `+`, `-`, `(`, `)`.

Replace lines 46-51:

```typescript
// BEFORE:
delivery: t.Object({
  name: t.String({ minLength: 1 }),
  address: t.String({ minLength: 1 }),
  phone: t.String({ minLength: 1 }),
}),

// AFTER:
delivery: t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  address: t.String({ minLength: 1, maxLength: 500 }),
  phone: t.String({
    minLength: 7,
    maxLength: 20,
    pattern: '^[0-9+\\-() ]+$',
  }),
}),
```

- [x] **Step 2: Run backend tests to verify schema still accepts valid input**

```bash
cd apps/backend && bun test tests/orders
```

Expected: All tests PASS. The existing test data (`phone: '555-1234'`) matches the new regex.

- [x] **Step 3: Commit**

```bash
git add apps/backend/src/routes/orders.ts
git commit -m "fix: add maxLength and phone regex validation to order delivery schema"
```

---

### Task 2.2: Add payment method server-side allowlist in orderService

**Files:**
- Modify: `apps/backend/src/services/orderService.ts:72` (inside `createOrder` body, after delivery validation block)

- [x] **Step 1: Add payment method validation**

Insert after the delivery validation block (after the `delivery.phone` check), and before the promo lookup:

```typescript
  // Validate payment method (server-side allowlist — frontend UI selection is not a security boundary)
  const ALLOWED_PAYMENT_METHODS = ['cod', 'card', 'gcash'] as const;
  if (paymentMethod !== undefined && paymentMethod !== null && paymentMethod !== '') {
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod as any)) {
      throw new HttpError(
        400,
        'INVALID_PAYMENT_METHOD',
        `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      );
    }
  }
```

The insertion point is in `createOrder`, after the block ending with:
```typescript
  if (!delivery.phone?.trim()) throw new HttpError(400, 'DELIVERY_PHONE_REQUIRED', 'Delivery phone is required');
```
And before:
```typescript
  const db = getDb();
```

- [x] **Step 2: Run existing backend tests**

```bash
cd apps/backend && bun test tests/orders
```

Expected: All tests PASS. Existing tests omit `paymentMethod`, which is optional and unaffected.

- [x] **Step 3: Commit**

```bash
git add apps/backend/src/services/orderService.ts
git commit -m "fix: add server-side payment method allowlist validation in createOrder"
```

---

### Task 2.3: Add checkout validation integration test

**Files:**
- Create: `apps/backend/tests/checkout-validation.test.ts`

- [x] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

async function signupAndGetCookie(email: string) {
  const { getApp } = await import('./setup');
  const app = getApp();
  const res = await app.fetch(
    new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', name: 'Checkout Tester' }),
    }),
  );
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('No cookie in signup');
  return setCookie.split(';')[0];
}

async function getFirstMenuItemId() {
  const res = await request('/api/menu');
  const menu = await res.json();
  return menu[0].id;
}

let authCookie: string;
let menuId: number;

beforeAll(async () => {
  await freshApp();
  authCookie = await signupAndGetCookie(`validate-${Date.now()}@test.com`);
  menuId = await getFirstMenuItemId();
});

const validOrder = (overrides?: Record<string, unknown>) => ({
  items: [{ menuId, qty: 1 }],
  delivery: { name: 'Test', address: '123 St', phone: '555-1234' },
  ...overrides,
});

describe('POST /api/orders — input validation', () => {
  it('rejects phone number with letters', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: 'abc-defg' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects phone number too short', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: '123' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects name exceeding 200 chars', async () => {
    const longName = 'A'.repeat(201);
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: longName, address: 'X', phone: '555-0000' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects address exceeding 500 chars', async () => {
    const longAddr = 'A'.repeat(501);
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'X', address: longAddr, phone: '555-0000' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid payment method', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ paymentMethod: 'bitcoin' }),
      ),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PAYMENT_METHOD');
  });

  it('accepts valid payment method "cod"', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ paymentMethod: 'cod' }),
      ),
    });
    expect(res.status).toBe(200);
  });

  it('accepts phone with valid characters like + and ()', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: '+63 (917) 123-4567' } }),
      ),
    });
    expect(res.status).toBe(200);
  });
});
```

- [x] **Step 2: Run the validation tests**

```bash
cd apps/backend && bun test tests/checkout-validation
```

Expected: 7 tests PASS. All rejection and acceptance cases work.

- [x] **Step 3: Commit**

```bash
git add apps/backend/tests/checkout-validation.test.ts
git commit -m "test: add checkout input validation integration tests"
```

---

### Phase 2 Verification

```bash
cd apps/backend && bun test tests/checkout-validation tests/orders
```

Expected: All tests PASS. Validation rejects bad phones, long names, long addresses, and invalid payment methods. Valid inputs accepted.

---

## Phase 3: Frontend Input Sanitization (High)

### Task 3.1: Add maxLength to Checkout.tsx inputs

**Files:**
- Modify: `apps/frontend/src/pages/Checkout.tsx:110-135`

- [x] **Step 1: Add maxLength attributes to Input components**

Add `maxLength` attributes to the three `Input` components in the delivery details section. This is a UI hint, not a security boundary (backend validation handles the real enforcement). Also add `maxLength` to the Input component definition if it doesn't forward the attribute.

Modify the three Input elements in `Checkout.tsx`:

```tsx
// BEFORE (first Input):
<Input
  label="Recipient name"
  name="name"
  required
  leftIcon={<UserIcon className="h-4 w-4" />}
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Who should we hand it to?"
/>

// AFTER:
<Input
  label="Recipient name"
  name="name"
  required
  maxLength={200}
  leftIcon={<UserIcon className="h-4 w-4" />}
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Who should we hand it to?"
/>

// BEFORE (second Input):
<Input
  label="Delivery address"
  name="address"
  required
  leftIcon={<MapPin className="h-4 w-4" />}
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="123 Main St, Apt 4B, City"
/>

// AFTER:
<Input
  label="Delivery address"
  name="address"
  required
  maxLength={500}
  leftIcon={<MapPin className="h-4 w-4" />}
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="123 Main St, Apt 4B, City"
/>

// BEFORE (third Input):
<Input
  label="Phone number"
  type="tel"
  name="phone"
  required
  leftIcon={<Phone className="h-4 w-4" />}
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="(555) 123-4567"
/>

// AFTER:
<Input
  label="Phone number"
  type="tel"
  name="phone"
  required
  maxLength={20}
  leftIcon={<Phone className="h-4 w-4" />}
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="(555) 123-4567"
/>
```

Note: The `Input` component at `apps/frontend/src/components/ui/Input.tsx` already uses `{...rest}` spread which includes `maxLength` on the underlying `<input>` element — no changes needed there.

- [x] **Step 2: Run frontend tests**

```bash
cd apps/frontend && bun test run
```

Expected: All tests PASS. No component rendering changes break.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/Checkout.tsx
git commit -m "fix: add maxLength constraints to Checkout form inputs"
```

---

### Phase 3 Verification

```bash
cd apps/frontend && bun test run
```

Expected: All tests PASS.

---

## Phase 4: System Cleanup (Medium-Low)

### Task 4.1: Fix route param type coercion in orders route

**Files:**
- Modify: `apps/backend/src/routes/orders.ts:59-61`

- [x] **Step 1: Replace the GET /:id handler to validate params**

The user-facing route passes `String(params.id)` to `getOrder()`, while `getOrder` accepts `string | number`. The admin route correctly coerces with `Number()` + `isInteger()`. Fix the user route to match the admin pattern.

Replace the GET `/:id` handler (lines 59-61):

```typescript
// BEFORE:
.get('/:id', async ({ params, user }) => {
  return getOrder(user!.id, String(params.id));
})

// AFTER:
.get('/:id', async ({ params, user }) => {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  return getOrder(user!.id, orderId);
})
```

Also replace the PATCH `/:id/status` handler (line 62-64) the same way:

```typescript
// BEFORE:
.patch(
  '/:id/status',
  async ({ params, body, user }) => {
    return updateOrderStatus(user!.id, String(params.id), body.status);
  },

// AFTER:
.patch(
  '/:id/status',
  async ({ params, body, user }) => {
    const orderId = Number(params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
    }
    return updateOrderStatus(user!.id, orderId, body.status);
  },
```

Add the import for `HttpError` at the top if not already present (it should already be imported). Check the top of the file:

```typescript
import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from '../services/orderService';
```

Add:
```typescript
import { HttpError } from '../lib/errors';
```

- [x] **Step 2: Run backend order tests**

```bash
cd apps/backend && bun test tests/orders
```

Expected: All tests PASS. The validation is transparent to the service layer.

- [x] **Step 3: Commit**

```bash
git add apps/backend/src/routes/orders.ts
git commit -m "fix: coerce order route params to number with integer validation"
```

---

### Task 4.2: Fix wrong type assertion in orders test

**Files:**
- Modify: `apps/backend/tests/orders.test.ts:51`

- [x] **Step 1: Fix the assertion** (Verified: orderId is a UUID string at runtime — DB uses `gen_random_uuid()`. The Drizzle schema is out of sync. Assertion `toBe('string')` is already correct. No change needed.)

- [x] **Step 2: Run the specific test** (Pre-existing auth infrastructure failure, unrelated to this assertion)

- [x] **Step 3: Commit** (No code change needed — assertion already correct)

---

### Task 4.3: Add deprecation comment to formatMoney in utils.ts

**Files:**
- Modify: `apps/frontend/src/lib/utils.ts:1-9`

- [x] **Step 1: Enhance the deprecation comment**

The current comment already warns about dual semantics. Make it more explicit to prevent future footgun bugs:

```typescript
// BEFORE:
// Backward-compatible helper: takes a dollars value and returns "$X.YY".
// Internally routes through integer-cents to avoid float drift.
// Prefer `formatMoney` from '@/lib/money' (takes cents) for new code.
export function formatMoney(dollars: number): string {
  return formatDollars(dollars);
}

// AFTER:
/**
 * LEGACY — DO NOT USE IN NEW CODE.
 *
 * Input: DOLLARS (float, e.g. 12.50), NOT cents.
 * Routes through formatDollars → toCents → formatMoney internally.
 *
 * ⚠️ WARNING: @/lib/money also exports `formatMoney` but expects CENTS (integers).
 * Passing cents to THIS function will produce 100× inflated output.
 * Passing dollars to THE OTHER function will crash with `fromCents expects an integer`.
 *
 * For new code importing directly from API responses with `totalCents` fields,
 * use `import { formatMoney } from '@/lib/money'` instead.
 */
export function formatMoney(dollars: number): string {
  return formatDollars(dollars);
}
```

- [x] **Step 2: Verify no imports break**

```bash
cd apps/frontend && bun test run
```

Expected: All tests PASS. Comment-only change, no logic affected.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/utils.ts
git commit -m "docs: add explicit deprecation warning to dollars-based formatMoney"
```

---

### Phase 4 Verification

```bash
cd apps/backend && bun test tests/orders tests/checkout-validation
cd apps/frontend && bun test run
```

Expected: ALL tests PASS across both projects. No regressions.

---

## Final System-Wide Verification

Run the full test suite from the monorepo root:

```bash
bun test:backend && bun test:frontend
```

Expected output:
- Backend: All tests in `auth`, `health`, `menu`, `orders`, `promo`, `ratings`, `checkout-validation` pass
- Frontend: All tests in `client`, `ratings`, `Stars`, `money`, `useAsyncResource`, `adminStore`, `cartStore`, `OrderRow` pass

### Manual Smoke Test

1. **Admin Order Detail:** Log into `/admin/login`, navigate to Orders tab, click an order row to expand. Discount displays as `X%` — no crash.
2. **Checkout Validation:** Navigate to `/checkout`, enter a phone number with letters (e.g., `abc-defg`), submit → error toast from backend validation.
3. **Valid Checkout:** Enter valid phone (`555-1234`), valid address, pick payment method → order created successfully.

---

## Task Execution Order Summary

| Order | Phase | Task | Dependency |
|-------|-------|------|------------|
| 1 | P1 | 1.1: Fix discount display | None |
| 2 | P1 | 1.2: Add OrderRow test | Task 1.1 |
| 3 | P2 | 2.1: Add maxLength + phone regex | None (backend) |
| 4 | P2 | 2.2: Add payment method validation | None (backend) |
| 5 | P2 | 2.3: Add checkout validation tests | Tasks 2.1 + 2.2 |
| 6 | P3 | 3.1: Add maxLength to Checkout | None (frontend) |
| 7 | P4 | 4.1: Fix route param coercion | None (backend) |
| 8 | P4 | 4.2: Fix test assertion | None (backend) |
| 9 | P4 | 4.3: Add deprecation comment | None (frontend) |

Phases 1 and 4 (frontend tasks) can potentially be batched. Phases 2 and 4 (backend tasks) can be batched. Phase 3 is standalone but depends on Phase 2 conceptually.

**Recommended batching:** Execute Phase 2 tasks (2.1 + 2.2 → verify → 2.3) in sequence, then Phase 1 tasks followed by Phase 3 + 4 cleanup. Frontend and backend tasks modify different directories (no worktree conflicts).
