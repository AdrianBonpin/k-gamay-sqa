# Fix: `/manage` Asks for Login Despite Valid Admin Session

**Date:** 2026-05-13
**Status:** Draft
**Context:** The admin dashboard (`/admin`, formerly `/manage`) prompts for email/password credentials even when the user already holds a valid Better-Auth admin session. The system fails to verify the existing session cookie before rendering the login gate.

---

## 1. Problem Statement

An administrator who has previously signed in and holds a valid Better-Auth session cookie navigates to `/admin`. Instead of being recognized and admitted to the dashboard, they are redirected to `/admin/login` and prompted to re-enter credentials.

**Expected behavior:** A valid admin session cookie is detected server-side on first page load, the admin identity is hydrated into the frontend store without user interaction, and the dashboard renders immediately.

**Actual behavior:** The login gate appears. The admin has no indication they already hold a valid session — they must re-enter email and password to proceed.

---

## 2. Root Cause Analysis

Five interconnected flaws produce the symptom. Each must be addressed; fixing only one will leave the bug latent under different conditions.

### RC1: AdminGuard Trusts localStorage Without Server Verification

**Location:** `apps/frontend/src/components/AdminGuard.tsx`

The guard's logic gates on `token && adminUser` from Zustand (persisted to `localStorage`). When both values exist, the effect short-circuits — `getAdminMe()` is never called, and the server is never consulted. The dashboard renders immediately on stale state.

**Failure mode:** If `localStorage` holds a token and user object from a previous session that has since expired or been revoked, the admin sees the dashboard UI but every `manageApi` call fails with 401. The admin is confused — the UI loaded, but data doesn't.

**Failure mode (inverse):** If `localStorage` is cleared (new device, incognito, cache wipe) but the HTTP-only session cookie is still valid, `checking` starts as `true`, the effect runs, and `getAdminMe()` is called. This is the correct path — but see RC2.

### RC2: adminGuard Middleware Ignores the Bearer Token — Cookie-Only Validation

**Location:** `apps/backend/src/middleware/adminGuard.ts`

The `adminGuard` derive function calls `auth.api.getSession({ headers: request.headers })`. Better-Auth's `getSession` reads the session **exclusively from the cookie header**. The `Authorization: Bearer ${adminToken}` header sent by both `manageApi` and `adminApi` interceptors is **never inspected or validated** by the guard.

The frontend stores and transmits a Bearer token that the backend never consumes for management route auth. This creates a false sense of security — the frontend believes it's authenticated because it has a token, but the backend is actually authenticating via the cookie. If the cookie expires but the Bearer token persists in `localStorage`, every API call gets 401.

**This is the architectural mismatch at the heart of the bug.**

### RC3: No 401/403 Response Interceptor on manageApi

**Location:** `apps/frontend/src/api/manage.ts`

While `manageApi` adds a Bearer token via request interceptor, it has **no response interceptor** to handle 401 or 403 errors. When the admin's session expires mid-use, API calls fail silently. The admin sees broken data or error toasts but receives no clear signal to re-authenticate. The AdminGuard only checks once on mount — not on subsequent API failures.

### RC4: `getAdminMe()` Depends on Cookie Transmission — Which Can Fail Silently

**Location:** `apps/backend/src/routes/admin-auth.ts` (endpoint) and `apps/frontend/src/api/admin.ts` (caller)

`GET /api/admin/me` validates the session via `auth.api.getSession({ headers })`. If the cookie is not transmitted (browser privacy settings, SameSite restrictions, cross-origin requests without proper CORS), `getSession` returns null → 401 → `getAdminMe()` throws → AdminGuard redirects to `/admin/login`.

The admin **has** a valid session — Better-Auth issued the cookie and the database row is unexpired — but the browser didn't send it. The admin has no way to know this; they just see the login form.

### RC5: Dual Auth Mechanism (Cookie + Bearer) Creates Inconsistency

The system maintains two parallel auth tokens:

| Token | Storage | Set By | Checked By | Security |
|-------|---------|--------|------------|----------|
| Session cookie | HTTP-only cookie (browser) | Better-Auth `set-cookie` on sign-in | `adminGuard`, `admin-auth` routes | High (HTTP-only, SameSite) |
| Session token | `localStorage` (Zustand persist) | `adminLogin()` / `getAdminMe()` response body | **NOTHING on the backend for management routes** | Low (XSS-readable) |

The Bearer token in `localStorage` is dead weight for the management auth flow. It is stored, transmitted on every request, but never validated by `adminGuard`. It serves only as a frontend gate condition — a condition that can become stale and misleading.

---

## 3. Architecture Boundaries (Source of Truth)

### 3.1 Inviolable Constraints

1. **Better-Auth is the sole session authority.** No custom token validation. The session cookie issued by Better-Auth is the only proof of authentication for `adminGuard`. Any other auth mechanism is prohibited.

2. **adminGuard remains cookie-only.** The guard must not grow a secondary validation path (no Bearer token parsing). Single-path auth is simpler to audit and harder to bypass.

3. **The frontend must not bypass server verification.** The AdminGuard component must always confirm the session with the server (via `GET /api/admin/me`) on mount, regardless of what is cached in `localStorage`. Cached state is a UX hint only — never a security gate.

4. **401 on any manageApi call must trigger re-authentication.** A single global response interceptor on `manageApi` must clear admin state and redirect to `/admin/login` when the server returns 401 or 403.

5. **The admin user object may be cached in `localStorage`.** The user profile (`id`, `email`, `name`, `role`) is non-sensitive display data and may persist across page loads for instant UI rendering. It must be cleared on logout or 401.

6. **The session token must NOT be cached in `localStorage`.** The `token` field returned by `POST /api/admin/login` and `GET /api/admin/me` is a Better-Auth session token. It must not be persisted to `localStorage` because: (a) it is never validated by `adminGuard`, (b) it is an XSS vector, and (c) its presence creates the false impression of an authenticated state.

7. **Existing API contracts preserved.** Route paths (`/api/manage/*`, `/api/admin/*`), request shapes, response shapes, and HTTP methods must not change. The fix is internal to the auth flow, not the API surface.

### 3.2 Permitted Changes

| Layer | File | Change | Reason |
|-------|------|--------|--------|
| Frontend store | `adminStore.ts` | Remove `token` from persisted state; keep `adminUser` only | RC5 — eliminate dual-token confusion |
| Frontend guard | `AdminGuard.tsx` | Always call `getAdminMe()` on mount; use cached `adminUser` as optimistic render hint, redirect on failure | RC1 — close the stale-state bypass |
| Frontend API | `manage.ts` | Add 401/403 response interceptor → clear admin store → redirect to `/admin/login` | RC3 — handle expired sessions gracefully |
| Frontend API | `admin.ts` | Remove Bearer token from request interceptor (cookie is sufficient); add 401 interceptor | RC2, RC5 — eliminate dead auth header |
| Backend guard | `adminGuard.ts` | **No changes.** Already correct (cookie-only validation) | RC2 — confirmed correct |
| Backend endpoint | `admin-auth.ts` (`GET /api/admin/me`) | **No changes required.** Already validates session correctly | RC4 — confirmed correct |
| Backend endpoint | `admin-auth.ts` (`POST /api/admin/login`) | Optionally stop returning `token` in response body (keep for backward compat, but frontend won't store it) | RC5 — de-emphasize token |

---

## 4. Approaches Considered

### Approach A: Cookie-Only, Frontend Hardening (RECOMMENDED)

**Strategy:** Remove the Bearer token from the admin auth flow entirely. The session cookie is the sole auth mechanism. The frontend always verifies with the server. Add defensive response interceptors.

**Changes:**
- `adminStore`: Remove `token` field. Keep `adminUser`. Rename `isAuthenticated()` to check `adminUser` only.
- `AdminGuard`: Always call `getAdminMe()` on mount. If local cache has `adminUser`, show dashboard optimistically while the request is in flight. If request fails, redirect to login.
- `manageApi` interceptor: Remove Bearer token injection. Add response interceptor for 401/403 → clear store → redirect.
- `adminApi` interceptor: Same — remove Bearer token injection. Add response interceptor.

**Pros:**
- Single auth mechanism (cookie). No dual-path confusion.
- HTTP-only cookies are XSS-resistant. Removing token from `localStorage` eliminates an XSS attack vector.
- Minimal backend changes (none required).
- Fixes all five root causes.

**Cons:**
- Loses the ability to manually pass auth tokens (e.g., for curl/API client testing). Mitigation: use cookie jar in API clients.
- Admin must have cookies enabled. (Already required — `withCredentials: true` on all axios instances.)

### Approach B: Dual Validation — Cookie + Bearer Token

**Strategy:** Make `adminGuard` accept either a valid session cookie OR a valid Bearer token (Better-Auth session token). The frontend continues to store and send the token.

**Changes:**
- `adminGuard`: Add fallback — if cookie session is null, extract Bearer token from Authorization header and call `auth.api.getSession` with it.
- Frontend: Keep existing token flow but fix AdminGuard and add response interceptors.

**Pros:**
- Backward compatible with current frontend token storage.
- Supports both browser (cookie) and API client (Bearer) auth.

**Cons:**
- Two auth paths to audit and maintain.
- Token in `localStorage` remains an XSS vector.
- More complex — two code paths for the same guard.
- Over-engineered for a single-frontend application.

### Approach C: Token-Primary — Server-Issued Admin Token

**Strategy:** Create a dedicated admin JWT or opaque token issued on admin login. `adminGuard` validates this token. The session cookie is not used for admin auth.

**Changes:**
- New admin token issuance at `POST /api/admin/login`.
- `adminGuard` validates admin token (new validation logic).
- Frontend stores and sends admin token.

**Pros:**
- Clean separation between customer auth and admin auth.
- Token can be short-lived (e.g., 15 minutes) for better security.

**Cons:**
- Major architectural change. Introduces a second token system alongside Better-Auth.
- Violates constraint 3.1.1 (Better-Auth is sole session authority).
- High implementation risk for a bug fix.
- Rejected on architectural grounds.

### Recommendation

**Approach A** is the clear winner. It fixes all five root causes with the smallest surface area change, eliminates an XSS vector (token in `localStorage`), requires zero backend changes, and simplifies the auth flow to a single mechanism. The loss of Bearer token support for API clients is acceptable — the management API is not a public API, and developers can use cookie jars for testing.

---

## 5. Data Flow — Before vs. After

### 5.1 Current (Broken) Flow

```
Admin navigates to /admin
        │
        ▼
┌─────────────────────────────────────┐
│ AdminGuard mounts                    │
│ Checks localStorage for token+user   │
│                                      │
│  FOUND → skip server check → render  │  ← BUG: stale data bypasses auth
│  NOT FOUND → getAdminMe() → ???      │  ← BUG: cookie may not transmit
│                                      │
│  If getAdminMe() fails → redirect    │
│  to /admin/login                     │
└─────────────────────────────────────┘
        │ (if rendered)
        ▼
┌─────────────────────────────────────┐
│ Manage page mounts                   │
│ Calls manageApi (e.g., getDashboard) │
│                                      │
│ Request includes:                    │
│  - Cookie (withCredentials: true)    │ ← adminGuard checks THIS
│  - Authorization: Bearer <token>     │ ← adminGuard IGNORES this
│                                      │
│ If cookie valid → 200 OK             │
│ If cookie expired → 401              │ ← BUG: no interceptor handles this
│                                      │
│ Admin sees broken dashboard or        │
│ error toast. No redirect to login.   │
└─────────────────────────────────────┘
```

### 5.2 Fixed Flow

```
Admin navigates to /admin
        │
        ▼
┌──────────────────────────────────────────┐
│ AdminGuard mounts                         │
│                                           │
│ 1. Read adminUser from localStorage       │
│    (cache hint ONLY — not a security gate)│
│                                           │
│ 2. ALWAYS call getAdminMe()               │
│    (sends session cookie via              │
│     withCredentials: true)                │
│                                           │
│ 3. While in flight:                       │
│    - If cached adminUser exists → show    │
│      dashboard optimistically (skeleton)  │
│    - If no cache → show loading spinner   │
│                                           │
│ 4. On success:                            │
│    - setAdminAuth(user) in store          │
│    - Render dashboard                     │
│                                           │
│ 5. On failure (401/403):                  │
│    - Clear adminStore                     │
│    - Redirect to /admin/login             │
└──────────────────────────────────────────┘
        │ (authenticated)
        ▼
┌──────────────────────────────────────────┐
│ Manage page mounts                        │
│ Calls manageApi (e.g., getDashboard)      │
│                                           │
│ Request includes ONLY:                    │
│  - Cookie (withCredentials: true)         │ ← adminGuard validates this
│  - x-request-id (telemetry)               │
│                                           │
│ NO Bearer token sent                      │ ← removed
│                                           │
│ Response interceptor:                     │
│  - 200 → return data                      │
│  - 401/403 → clear adminStore → redirect  │
│    to /admin/login                        │
└──────────────────────────────────────────┘
```

---

## 6. Security Requirements

### 6.1 Session Validation

- **SR1:** The admin dashboard must never render without a server-confirmed valid admin session. Client-side state (localStorage, memory) is insufficient proof.
- **SR2:** The session token (Better-Auth session token) must not be stored in `localStorage` or any JavaScript-accessible storage. The token flows only through the HTTP-only session cookie.
- **SR3:** Session validation must be re-checked on every management API call (`adminGuard` on every request). No "remember me" bypass.

### 6.2 Token Cleanup

- **SR4:** On logout, the adminStore must be cleared of all user data. The session cookie is cleared by Better-Auth's sign-out endpoint.
- **SR5:** On any 401 or 403 response from `manageApi` or `adminApi`, the adminStore must be cleared immediately — no optimistic retry.

### 6.3 Redirect Safety

- **SR6:** Redirect to `/admin/login` must not create redirect loops. The `/admin/login` page must not itself trigger auth checks that redirect back.
- **SR7:** After login, navigate to the originally requested path (preserved in `location.state.from`) or `/admin` as default.

### 6.4 Cookie Security (Existing — Verified)

- **SR8:** Session cookies must remain HTTP-only, SameSite=Lax, Secure in production. (Already configured in `auth/index.ts`.)
- **SR9:** The `__Host-` cookie prefix must be used in production to bind cookies to the exact origin. (Already configured.)

---

## 7. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC1 | Admin has valid session cookie but `localStorage` is empty (new device, incognito) | `getAdminMe()` succeeds → adminStore hydrated → dashboard renders |
| EC2 | Admin has valid session cookie but `localStorage` has stale admin data from a different user | `getAdminMe()` returns current user → adminStore overwrites stale data → dashboard renders with correct identity |
| EC3 | Admin has expired session cookie, `localStorage` has stale admin data | `getAdminMe()` returns 401 → adminStore cleared → redirect to `/admin/login` |
| EC4 | Admin is on dashboard, session expires mid-use (7 days since login) | Next manageApi call returns 401 → response interceptor fires → adminStore cleared → redirect to `/admin/login` |
| EC5 | Regular (non-admin) user somehow obtains a valid session cookie and navigates to `/admin` | `getAdminMe()` returns 403 (role check fails) → redirect to `/admin/login` → login attempt with non-admin credentials gets 403 with message "This account does not have admin access" |
| EC6 | Admin opens `/admin` in two tabs, logs out in one | Other tab's next API call gets 401 → interceptor clears store → redirect to `/admin/login` |
| EC7 | Network error during `getAdminMe()` (server down, DNS failure) | Request fails with network error → catch block → `checking` becomes false → `!token && !adminUser` is true → redirect to `/admin/login` with generic error. Admin can retry when server recovers. |
| EC8 | Browser has cookies disabled | `getAdminMe()` returns 401 (no session cookie) → redirect to login. Login attempt also fails (can't set cookie) → error message. This is expected — the app requires cookies. |
| EC9 | Admin closes tab, reopens within session expiry window | `getAdminMe()` succeeds → seamless re-entry. No login prompt. |

---

## 8. Verification Criteria

The fix is complete when all of the following pass:

1. **VC1 — Seamless re-entry:** Admin signs in, closes the tab, opens a new tab to `/admin` → dashboard renders without login prompt.
2. **VC2 — Stale cache rejection:** Manually set `localStorage` to contain stale admin data, then navigate to `/admin` with a valid session → server overrides stale data, dashboard renders with correct info.
3. **VC3 — Expired session redirect:** Wait for session to expire (or manually delete the session cookie), then attempt any action on the dashboard → redirected to `/admin/login`.
4. **VC4 — Non-admin rejection:** Sign in as a regular user, navigate to `/admin` → redirected to `/admin/login` with appropriate error.
5. **VC5 — No token in localStorage:** After sign-in, inspect `localStorage` → `kgamay-admin-auth` key contains `adminUser` but NOT `token`.
6. **VC6 — Existing tests pass:** All backend tests (`bun run test:backend`) and frontend tests (`bun run test:frontend`) pass without modification.
7. **VC7 — No Bearer token in manageApi requests:** Inspect network tab → requests to `/api/manage/*` have no `Authorization` header.

---

## 9. Out of Scope

- Changes to customer-facing auth flow (`ProtectedRoute`, `authStore`, login/signup pages).
- Better-Auth configuration changes (session duration, cookie attributes).
- Admin role management (promoting/demoting users). Already handled by Better-Auth admin plugin.
- Adding refresh token logic. Session cookies handle this natively.
- Adding CSRF protection. Better-Auth handles this internally.
- Changes to `/api/admin/login` response shape.
- Adding 2FA/MFA for admin login.
- Admin audit logging.
