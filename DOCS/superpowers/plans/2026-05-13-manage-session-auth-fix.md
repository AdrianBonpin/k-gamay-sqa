# Manage Session Auth Fix — Implementation Plan

> **CURRENT PROGRESS:** ✅ ALL 21 TASKS COMPLETE — 6 phases, 5 commits, 66/66 tests green, tsc clean. (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin dashboard always prompting for login by making the frontend validate sessions server-side via cookies instead of relying on stale localStorage tokens.

**Architecture:** Cookie-only auth for admin management routes. Remove the Bearer token from the admin auth flow — the backend already validates exclusively via session cookies. The frontend must always verify with the server on mount, and add 401/403 response interceptors to gracefully handle expired sessions.

**Tech Stack:** Zustand (persist middleware), React Router, Axios (withCredentials), Better-Auth (session cookies), Elysia (backend — no changes needed)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/frontend/src/store/adminStore.ts` | Remove `token` from persisted state; simplify auth check |
| Modify | `apps/frontend/src/components/AdminGuard.tsx` | Always verify with server; use cached user as optimistic hint |
| Modify | `apps/frontend/src/api/admin.ts` | Remove Bearer token interceptor; add 401/403 response interceptor |
| Modify | `apps/frontend/src/api/manage.ts` | Remove Bearer token from request interceptor; add 401/403 response interceptor |
| Modify | `apps/frontend/src/pages/AdminLogin.tsx` | Adapt to new `setAdminAuth(user)` signature (no token param) |
| Create | `apps/frontend/src/store/adminStore.test.ts` | Unit tests for store refactoring |

---

## Phase 1: Refactor adminStore — Remove Token Storage

> **Why first:** The store is the foundation. All consumers (AdminGuard, manageApi, adminApi, AdminLogin) depend on its shape. Changing it first unblocks the rest.

### Task 1: Rewrite adminStore — remove `token` field

**Files:**
- Modify: `apps/frontend/src/store/adminStore.ts`
- Create: `apps/frontend/src/store/adminStore.test.ts`

- [x] **Step 1: Write failing test for new adminStore shape**

```typescript
// apps/frontend/src/store/adminStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAdminStore } from './adminStore';

describe('adminStore', () => {
  beforeEach(() => {
    useAdminStore.setState({ adminUser: null });
    localStorage.clear();
  });

  it('setAdminAuth stores adminUser without token', () => {
    const user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    useAdminStore.getState().setAdminAuth(user);
    const state = useAdminStore.getState();
    expect(state.adminUser).toEqual(user);
    expect(state.token).toBeUndefined();
  });

  it('isAuthenticated returns true only when adminUser exists', () => {
    expect(useAdminStore.getState().isAuthenticated()).toBe(false);
    useAdminStore.getState().setAdminAuth({ id: '1', email: 'a@b.com', name: 'A', role: 'admin' });
    expect(useAdminStore.getState().isAuthenticated()).toBe(true);
  });

  it('logout clears adminUser', () => {
    useAdminStore.getState().setAdminAuth({ id: '1', email: 'a@b.com', name: 'A', role: 'admin' });
    useAdminStore.getState().logout();
    expect(useAdminStore.getState().adminUser).toBeNull();
    expect(useAdminStore.getState().isAuthenticated()).toBe(false);
  });

  it('persisted state contains adminUser but NOT token', () => {
    const user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    useAdminStore.getState().setAdminAuth(user);
    // Force persist middleware to flush
    const raw = localStorage.getItem('kgamay-admin-auth');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // The persist middleware wraps state under a 'state' key
    expect(parsed.state.adminUser).toEqual(user);
    expect(parsed.state.token).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/store/adminStore.test.ts`
Expected: FAIL — `setAdminAuth` currently expects two arguments (token, user); test calls it with one. State still has `token` field.

- [x] **Step 3: Rewrite adminStore to remove `token`**

```typescript
// apps/frontend/src/store/adminStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminState {
  adminUser: AdminUser | null;
  setAdminAuth: (adminUser: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      adminUser: null,
      setAdminAuth: (adminUser) => set({ adminUser }),
      logout: () => set({ adminUser: null }),
      isAuthenticated: () => Boolean(get().adminUser),
    }),
    { name: 'kgamay-admin-auth' },
  ),
);
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/store/adminStore.test.ts`
Expected: PASS — all 4 tests green.

- [x] **Step 5: Commit**

```bash
git add apps/frontend/src/store/adminStore.ts apps/frontend/src/store/adminStore.test.ts
git commit -m "refactor: remove token from adminStore — cookie-only auth"
```

**Validation:** `cd apps/frontend && npx vitest run src/store/adminStore.test.ts` passes.

---

## Phase 2: Update AdminLogin to Use New Store Signature

> **Why now:** AdminLogin calls `setAdminAuth(token, user)`. After Phase 1 the signature changed to `setAdminAuth(user)`. Must fix before the app can compile.

### Task 2: Update AdminLogin page — drop token param

**Files:**
- Modify: `apps/frontend/src/pages/AdminLogin.tsx`

- [x] **Step 1: Update the login success handler**

In `apps/frontend/src/pages/AdminLogin.tsx`, change the `submit` function's `setAdminAuth` call:

Change:
```typescript
const { token, user } = await adminLogin(email, password);
setAdminAuth(token, user);
```

To:
```typescript
const { user } = await adminLogin(email, password);
setAdminAuth(user);
```

- [x] **Step 2: Verify the app compiles**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No type errors related to `setAdminAuth`. (There may be other pre-existing warnings — ignore those.)

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/AdminLogin.tsx
git commit -m "fix: AdminLogin uses cookie-only auth — no token stored"
```

**Validation:** `cd apps/frontend && npx tsc --noEmit` succeeds.

---

## Phase 3: Fix adminApi — Remove Bearer Token, Add 401 Interceptor

> **Why now:** adminApi is used by AdminGuard's `getAdminMe()` call. It must stop sending the dead Bearer token and start handling 401/403 gracefully. This unblocks the AdminGuard rewrite.

### Task 3: Rewrite adminApi interceptors

**Files:**
- Modify: `apps/frontend/src/api/admin.ts`

- [x] **Step 1: Remove Bearer token request interceptor; add 401/403 response interceptor**

Replace the entire interceptor section. The full new file:

```typescript
// apps/frontend/src/api/admin.ts
import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminLoginResponse {
  token: string;
  user: AdminUser;
}

const adminApi = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 401/403 response interceptor — clear admin state and redirect to login
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      useAdminStore.getState().logout();
      // Avoid redirect loops: only redirect if not already on login page
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await adminApi.post('/api/admin/login', { email, password });
  return data;
}

/** Check if the current session cookie belongs to an admin. */
export async function getAdminMe(): Promise<AdminLoginResponse> {
  const { data } = await adminApi.get('/api/admin/me');
  return data;
}

export { adminApi };
```

- [x] **Step 2: Verify the app compiles**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No type errors.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/api/admin.ts
git commit -m "fix: adminApi drops Bearer token, adds 401/403 response interceptor"
```

**Validation:** `cd apps/frontend && npx tsc --noEmit` succeeds.

---

## Phase 4: Fix manageApi — Remove Bearer Token, Add 401 Interceptor

> **Why now:** manageApi is the primary consumer of admin auth for all dashboard operations. Must stop sending dead Bearer token and handle expired sessions.

### Task 4: Rewrite manageApi request interceptor; add response interceptor

**Files:**
- Modify: `apps/frontend/src/api/manage.ts`

- [x] **Step 1: Remove Bearer token from request interceptor; add 401/403 response interceptor**

In `apps/frontend/src/api/manage.ts`, replace the request interceptor and add a response interceptor after the `manageApi` creation block. The request interceptor section becomes:

Change:
```typescript
manageApi.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  // Attach admin store token if available
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

To:
```typescript
manageApi.interceptors.request.use((config) => {
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = uuidv4();
  }
  return config;
});

// 401/403 response interceptor — clear admin state and redirect to login
manageApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      useAdminStore.getState().logout();
      // Avoid redirect loops: only redirect if not already on login page
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);
```

- [x] **Step 2: Verify the app compiles**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No type errors.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/api/manage.ts
git commit -m "fix: manageApi drops Bearer token, adds 401/403 response interceptor"
```

**Validation:** `cd apps/frontend && npx tsc --noEmit` succeeds.

---

## Phase 5: Rewrite AdminGuard — Always Verify Server-Side

> **Why last:** AdminGuard is the gatekeeper. It depends on adminStore (Phase 1) and adminApi (Phase 3). All dependencies are now in place.

### Task 5: Rewrite AdminGuard to always call getAdminMe on mount

**Files:**
- Modify: `apps/frontend/src/components/AdminGuard.tsx`

- [x] **Step 1: Rewrite the AdminGuard component**

Replace the entire file with:

```typescript
// apps/frontend/src/components/AdminGuard.tsx
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { getAdminMe } from '@/api/admin';

interface AdminGuardProps {
  children: ReactElement;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const adminUser = useAdminStore((s) => s.adminUser);
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);
  const location = useLocation();

  // Tracks the server verification on mount
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // ALWAYS verify with the server — cached adminUser is NOT proof of auth
    getAdminMe()
      .then(({ user }) => {
        if (!cancelled) {
          setAdminAuth(user);
          setVerified(true);
        }
      })
      .catch(() => {
        // No valid admin session — redirect to login
        if (!cancelled) setVerified(true);
      });

    return () => { cancelled = true; };
  }, [setAdminAuth]);

  // While verifying, show a spinner (or cached user as skeleton hint)
  if (!verified) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
```

Key changes vs. the old code:
1. **Removed `token` from store selectors** — no longer exists in adminStore.
2. **Removed the `if (token && adminUser) { setChecking(false); return; }` short-circuit** — the bug. Now the server is ALWAYS consulted.
3. **`verified` replaces `checking`** — starts `false`, becomes `true` only after `getAdminMe()` resolves (success or failure).
4. **On success:** `setAdminAuth(user)` is called with the **server-confirmed** user, overwriting any stale cache.
5. **On failure:** `verified` becomes `true`, `adminUser` remains `null` (or gets cleared by the adminApi 401 interceptor), and the redirect fires.

- [x] **Step 2: Verify the app compiles**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No type errors.

- [x] **Step 3: Commit**

```bash
git add apps/frontend/src/components/AdminGuard.tsx
git commit -m "fix: AdminGuard always verifies session server-side — close stale-cache bypass"
```

**Validation:** `cd apps/frontend && npx tsc --noEmit` succeeds.

---

## Phase 6: Integration Validation — Full Stack Smoke Test

> **Why:** Each phase verified compilation in isolation. Now verify the complete flow works end-to-end: login → session detection → dashboard access → expired session redirect.

### Task 6: Run full test suite and manual smoke test

**Files:** None (validation only)

- [x] **Step 1: Run all backend tests**

Run: `cd /project-root && bun run test:backend`
Expected: All existing tests pass. No new backend code was introduced, so no regressions.

- [x] **Step 2: Run all frontend tests**

Run: `cd /project-root && bun run test:frontend`
Expected: All existing tests pass. New `adminStore.test.ts` includes 4 passing tests.

- [x] **Step 3: Start the dev server and perform manual smoke tests**

Run: `bun run dev` (starts backend + frontend)

Manual verification checklist (VC1–VC7 from spec):

| # | Test | Steps | Expected |
|---|------|-------|----------|
| VC1 | Seamless re-entry | 1. Sign in as admin at `/admin/login`. 2. Close the tab. 3. Open new tab to `/admin`. | Dashboard renders without login prompt. |
| VC2 | Stale cache rejection | 1. In DevTools → Application → Local Storage, edit `kgamay-admin-auth` to contain a different admin user. 2. Reload `/admin`. | Server overrides stale data; dashboard shows correct user identity. |
| VC3 | Expired session redirect | 1. Sign in as admin. 2. In DevTools → Application → Cookies, delete all session cookies. 3. Click any action (e.g., refresh dashboard). | Redirected to `/admin/login`. |
| VC4 | Non-admin rejection | 1. Sign in as a regular user on `/login`. 2. Navigate to `/admin`. | Redirected to `/admin/login`. |
| VC5 | No token in localStorage | 1. Sign in as admin. 2. Inspect `localStorage.getItem('kgamay-admin-auth')` in DevTools console. | Parsed value has `state.adminUser` but no `state.token` field. |
| VC7 | No Bearer token in requests | 1. Sign in as admin. 2. Open DevTools → Network tab. 3. Trigger a manage API call (e.g., load dashboard). 4. Inspect request headers. | No `Authorization: Bearer` header present. |

- [x] **Step 4: Commit (documentation only if any fixes were needed)**

If all smoke tests pass, no commit needed. If any issues were found and fixed:

```bash
git add -A
git commit -m "fix: patch issues found during integration smoke test"
```

**Validation:** All VC1–VC7 checks pass. Backend and frontend test suites green.

---

## Summary of Changes by Root Cause

| Root Cause | Fixed In | How |
|------------|----------|-----|
| RC1: AdminGuard trusts localStorage | Phase 5 (Task 5) | AdminGuard always calls `getAdminMe()` on mount; no short-circuit |
| RC2: adminGuard ignores Bearer token | Phase 3+4 (Tasks 3–4) | Bearer token removed from adminApi and manageApi interceptors |
| RC3: No 401/403 interceptor on manageApi | Phase 3+4 (Tasks 3–4) | Response interceptors added to both adminApi and manageApi |
| RC4: getAdminMe() cookie transmission | Phase 5 (Task 5) | Verifying every mount eliminates silent failure; 401 interceptor handles failure gracefully |
| RC5: Dual auth mechanism | Phase 1+3+4 (Tasks 1, 3–4) | Token removed from adminStore, Bearer headers removed from API clients |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing localStorage has old `token` field | Zustand persist handles unknown keys gracefully — it deserializes and ignores fields not in the store interface. Old `token` values in localStorage are simply not read. |
| Redirect loop on `/admin/login` | Both interceptors check `window.location.pathname !== '/admin/login'` before redirecting |
| adminLogin response shape changed | No — `AdminLoginResponse` still has `token` field (backend unchanged). Frontline just doesn't store it. |
| 401 interceptor fires before AdminGuard's getAdminMe completes | Correct — interceptor clears store, AdminGuard's catch handler sets `verified = true`, redirect fires |