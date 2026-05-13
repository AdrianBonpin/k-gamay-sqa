# SQA Audit — Architectural Spec

**Date:** 2026-05-13
**Scope:** System-wide quality assurance audit
**Status:** Approved for tactical planning

---

## 1. DISCOVERY SUMMARY

### 1.1 Admin → Order Detail Crash: `fromCents expects an integer`

**Location:** `apps/frontend/src/components/admin/OrderRow.tsx`

**Root Cause:** The admin order detail view calls `formatMoney(detail.discount)` on line 56. The `discount` field returned by the admin API (`/api/manage/orders/:id` and `/api/manage/orders`) is a **discount fraction** (e.g., `0.1` for 10%), not an integer cent value. The frontend `formatMoney` function from `@/lib/money` routes through `fromCents()` which asserts `Number.isInteger()`. Since `0.1` is not an integer, the assertion throws.

**Affected code paths:**
- `OrderRow.tsx` line 56: `{formatMoney(detail.discount)}` — discount rendered as if cents
- `OrderRow.tsx` line 86: `{formatMoney(detail.totalCents)}` — correct (totalCents IS cents)

**Data contract mismatch:** The backend `manage` route returns `discount` as the raw DB `real` value (0–1 fraction). The frontend incorrectly treats it as cents. This is a **semantic type error** — the same field name carries different meanings in different contexts.

---

### 1.2 Checkout — Input Sanitation Gaps

**Location:** `apps/frontend/src/pages/Checkout.tsx` + `apps/backend/src/routes/orders.ts`

**Gaps identified:**

| Field | Frontend Validation | Backend Validation | Risk |
|-------|-------------------|-------------------|------|
| `name` | `.trim()`, presence only | `minLength: 1`, no max | Unlimited-length strings |
| `address` | `.trim()`, presence only | `minLength: 1`, no max | Unlimited-length strings |
| `phone` | `type="tel"` (hint only), `.trim()` | `minLength: 1`, no format check | Arbitrary text stored as phone |
| `paymentMethod` | UI selection only (no enforcement) | **None** — any string accepted | Arbitrary/unvalidated payment strings |

**Specific issues:**
- Phone numbers accept any text (no regex validation for PH format or any format)
- No maximum length constraints on name/address/phone — risk of DB bloat
- `paymentMethod` is stored verbatim without server-side allowlisting
- No `minLength` / `maxLength` on `paymentMethod` string

---

### 1.3 System-Wide Issues Identified During Audit

#### A. `formatMoney` — Dual Semantic Contract (High)

Two competing implementations of `formatMoney` exist in the frontend:
- `@/lib/money` (new): `formatMoney(cents: number)` — expects **cents** (integer)
- `@/lib/utils` (legacy): `formatMoney(dollars: number)` — expects **dollars** (float), delegates to `@/lib/money.formatDollars`

Files import from different sources with different expectations. The admin components import from `@/lib/money` but some consumer-facing pages import from `@/lib/utils`. This creates a footgun where passing a dollar value to the cents-based `formatMoney` crashes.

#### B. Payment Method — Unvalidated Free-Text (Medium)

The `createOrder` service accepts `paymentMethod?: string` and stores it directly in the DB without validation against the three allowed values (`cod`, `card`, `gcash`). While the checkout UI presents only three options, a direct API call can inject arbitrary strings.

#### C. Phone Number — No Validation Chain (Medium)

Neither frontend nor backend validates phone number format. The `type="tel"` on the input element provides no programmatic constraint — it's a UI hint only.

#### D. Input Length — Unbounded (Medium)

All text inputs (name, address, phone, review) have no maximum length constraints in the Elysia validation schemas. DB columns are `text` (unbounded), but excessive input wastes resources and opens a trivial DoS vector.

#### E. `getOrder` Type Inconsistency (Low)

In `apps/backend/src/services/orderService.ts`, `getOrder(userId: string, orderId: string | number)` accepts a union type. The user-facing route (`/api/orders/:id`) passes `String(params.id)` while the admin route (`/api/manage/orders/:id`) correctly passes `Number(params.id)`. This inconsistency could mask future bugs.

#### F. Order ID Assertion in Tests (Low)

`apps/backend/tests/orders.test.ts` asserts `typeof body.orderId` to be `'string'`, but `orderId` comes from a `serial` primary key and is always a number. The test should check `'number'`.

#### G. DB Float Precision for Prices (Low/Observation)

The schema uses PostgreSQL `real` (float4/32-bit) for `menu_items.price`, `order_items.priceAtOrder`, and `promos.discount`. While the application layer mitigates float drift via `toCents`/`fromCents`, the DB storage itself has inherent precision limits. Consider `numeric(10,2)` for future iterations.

#### H. Rate Limit Store — Single Instance Only (Observation)

The rate limiter uses an in-memory `Map` tied to the process. In a multi-instance deployment, rate limits are per-instance rather than global. Acceptable for the current single-instance deployment model.

#### I. No CSRF Protection (Observation)

State-changing endpoints (POST, PATCH, DELETE) rely on session cookies without CSRF tokens. Acceptable for a coursework demo but documented as a known boundary.

---

## 2. SOURCE OF TRUTH — DATA CONTRACTS

### 2.1 Money Representation

```
┌──────────────────────────────────────────────────────────────┐
│  HARD RULE: All monetary values in API responses MUST be     │
│  dual-represented: total (dollars) AND totalCents (integer). │
│  Discounts MUST be represented as a fraction (0..1), NEVER   │
│  as cents. The field name 'discount' = fraction, ALWAYS.     │
│                                                              │
│  Frontend formatMoney() from @/lib/money expects CENTS only. │
│  Frontend formatMoney() from @/lib/utils expects DOLLARS.    │
│  Consumers must know which they are importing.               │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Field Type Contract

| Field | Backend Type | Frontend Expected Type | Notes |
|-------|-------------|----------------------|-------|
| `total` | `number` (dollars) | `number` (dollars) | Computed via `fromCents(totalCents)` |
| `totalCents` | `integer` (cents) | `integer` (cents) | Pass directly to `formatMoney` from `@/lib/money` |
| `discount` | `real` (0..1 fraction) | `real` (0..1 fraction) | **NOT** cents. Multiply by `totalCents` to get discount amount. |
| `price` | `real` (dollars) | `number` (dollars) | Raw menu price. Convert via `toCents` for arithmetic. |
| `priceAtOrder` | `real` (dollars) | `number` (dollars) | Snapshot price at order time. Same handling as `price`. |

### 2.3 Payment Method Enum

```
Allowed values (closed set):
  - "cod"   (Cash on Delivery)
  - "card"  (Credit Card — mock)
  - "gcash" (GCash — mock)

Any other value MUST be rejected with 400 INVALID_PAYMENT_METHOD.
This validation MUST happen server-side in createOrder.
```

---

## 3. SECURITY REQUIREMENTS

### 3.1 Input Validation — Defense in Depth

All user-supplied text fields MUST be validated at both layers:

| Layer | Requirement |
|-------|------------|
| **Frontend** | UI-level constraints (maxLength, type hints). Not a security boundary. |
| **Backend (Elysia schema)** | `minLength`, `maxLength`, `pattern` (regex) for fields that have format contracts. |
| **Backend (service layer)** | Additional business-logic validation (payment method allowlist, promo logic). |

### 3.2 Field-Level Constraints

| Field | Min Length | Max Length | Pattern / Format | Required |
|-------|-----------|-----------|-----------------|----------|
| `delivery.name` | 1 | 200 | N/A (free text) | Yes |
| `delivery.address` | 1 | 500 | N/A (free text) | Yes |
| `delivery.phone` | 7 | 20 | Must contain only digits, spaces, `+`, `-`, `(`, `)` | Yes |
| `paymentMethod` | — | — | Must be one of: `cod`, `card`, `gcash` | At checkout |
| `review` (rating) | 0 | 500 | N/A (free text) | No |

### 3.3 Session & Auth Boundaries

- Admin routes protected by `adminGuard` (session + role check) — **confirmed valid**
- User routes protected by `beforeHandle` session check — **confirmed valid**
- Admin login correctly verifies role post-authentication and signs out non-admins — **confirmed valid**
- No CSRF tokens — **accepted for this iteration** (coursework demo context)

### 3.4 Rate Limiting

- Auth endpoints: 10 req / 15 min per IP — **confirmed valid**
- General API: 300 req / 15 min per IP — **confirmed valid**
- Single-instance in-memory store — **accepted for deployment model**

---

## 4. ARCHITECTURAL BOUNDARIES

### 4.1 Money Utility Boundary

```
┌──────────────────────────────────────────────────────┐
│  @/lib/money (frontend)                              │
│  ─────────────────                                   │
│  Input: CENTS (integers)                             │
│  Functions: formatMoney, toCents, fromCents,         │
│             applyDiscountCents                       │
│                                                      │
│  USE THIS for: admin pages, direct API consumption   │
│  where totalCents field is available.                │
├──────────────────────────────────────────────────────┤
│  @/lib/utils.formatMoney (frontend) — LEGACY         │
│  ─────────────────────────────                       │
│  Input: DOLLARS (floats)                             │
│  Delegates to: formatDollars → toCents → formatMoney │
│                                                      │
│  USE THIS for: consumer-facing display where only    │
│  dollar values (price, total) are available.         │
├──────────────────────────────────────────────────────┤
│  apps/backend/src/lib/money (backend)                │
│  ──────────────────────────────                      │
│  Functions: toCents, fromCents, applyDiscountCents   │
│  Internal only. API responses provide both dollars   │
│  and cents so the frontend never needs to convert.   │
└──────────────────────────────────────────────────────┘
```

### 4.2 Discount Display Rule

```
DISCOUNT FIELD IS A FRACTION (0..1), NOT A MONETARY AMOUNT.

To display discount as currency:
  discountAmountCents = Math.round(order.totalCents * order.discount)
  display = formatMoney(discountAmountCents)  // from @/lib/money

To display discount as percentage:
  display = `${Math.round(order.discount * 100)}%`

NEVER: formatMoney(order.discount)  ← CRASHES (fraction ≠ integer cents)
```

### 4.3 Route Validation Boundary

| Route | Parameter Coercion | Validation |
|-------|-------------------|-----------|
| `/api/orders/:id` | `String(params.id)` → passes to `getOrder` | Service validates with `HttpError` |
| `/api/manage/orders/:id` | `Number(params.id)` + `isInteger` check | Route-level guard before service |
| `/api/manage/users/:id` | Direct string (UUID) | No integer coercion needed |
| `/api/manage/menu/:id` | `Number(params.id)` + `isInteger` check | Route-level guard |

**Rule:** All numeric route params MUST be coerced with `Number()` and validated with `Number.isInteger()` at the route level BEFORE reaching the service layer.

---

## 5. TEST COVERAGE NOTES

| Test File | Issues Found |
|-----------|-------------|
| `apps/backend/tests/orders.test.ts` | Line ~60: `expect(typeof body.orderId).toBe('string')` — should be `'number'` |
| `apps/frontend/src/lib/money.test.ts` | No test for `formatMoney` being called with a non-integer (should have a guard test) |
| `apps/backend/tests/manage.test.ts` | **MISSING** — no admin-specific integration tests exist |
| `apps/frontend/src/components/admin/OrdersTab.test.tsx` | **MISSING** — no tests for admin order detail rendering |

---

## 6. IMPLEMENTATION CONSTRAINTS

### 6.1 Non-Negotiable

- The `discount` field in all API responses is a fraction (0–1). This semantic must NOT change — it is correct per the promo system design.
- `paymentMethod` validation must happen server-side; frontend UI selection is not a security boundary.
- `formatMoney` from `@/lib/money` expects cents. Callers must ensure input is an integer cent value.

### 6.2 Recommended

- Deprecate `@/lib/utils.formatMoney` in favor of explicit `formatDollars` / `formatCents` naming to eliminate the dual-contract footgun.
- Add `maxLength` constraints to all Elysia schemas for text fields.
- Add phone format validation using a permissive regex that accepts common PH formats.
- Create a `docs/superpowers/specs/` entry for each resolved bug with root cause and fix verification criteria.

---

## 7. REVISION HISTORY

| Date | Revision | Author |
|------|----------|--------|
| 2026-05-13 | Initial audit spec | SQA Agent |
