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
| A8 | POST /api/auth/login timing attack resistance | 🔲 |
| A9 | POST /api/auth/logout revokes session | 🔲 |

### Menu
| # | Test Case | Status |
|---|----------|--------|
| M1 | GET /api/menu returns array with items and rating summaries | ✅ |
| M2 | GET /api/menu items have correct shape | ✅ |
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
| O7 | POST /api/orders enforces promo maxUses | 🔲 |
| O8 | POST /api/orders enforces promo maxPerUser | 🔲 |
| O9 | POST /api/orders rejects firstOrderOnly promo for returning users | 🔲 |
| O10 | POST /api/orders rejects missing delivery info | 🔲 |
| O11 | GET /api/orders lists user's orders | ✅ |
| O12 | GET /api/orders/:id returns single order | 🔲 |
| O13 | GET /api/orders/:id returns 404 for non-existent | 🔲 |
| O14 | GET /api/orders/:id respects user isolation | 🔲 |
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
| R4 | POST /api/ratings rejects invalid stars | 🔲 |
| R5 | POST /api/ratings upserts existing rating | 🔲 |
| R6 | POST /api/ratings enforces review max length | 🔲 |
| R7 | GET /api/ratings/:menuId returns summary + ratings | ✅ |
| R8 | GET /api/ratings/:menuId handles non-existent menuId | 🔲 |
| R9 | GET /api/ratings/:menuId/mine returns user's rating | 🔲 |
| R10 | GET /api/ratings/:menuId/mine returns null for no rating | 🔲 |
| R11 | GET /api/ratings/summary returns total count | ✅ |

### Rate Limiting
| # | Test Case | Status |
|---|----------|--------|
| RL1 | Auth rate limit blocks after 10 requests | 🔲 |
| RL2 | Global rate limit blocks after 300 requests | 🔲 |
| RL3 | Rate limit returns proper 429 response | 🔲 |

---

## Frontend Test Cases (Manual / Vitest)

### Authentication UI
| # | Test Case | Status |
|---|----------|--------|
| FA1 | Signup form validates email format | 👁️ |
| FA2 | Signup form validates password length | 👁️ |
| FA3 | Signup form validates name not empty | 👁️ |
| FA4 | Successful signup redirects to home | 👁️ |
| FA5 | Login form validates both fields required | 👁️ |
| FA6 | Successful login redirects to home | 👁️ |
| FA7 | Failed login shows error toast | 👁️ |
| FA8 | Logout clears auth state and cart | 👁️ |
| FA9 | Protected routes redirect to login | 👁️ |

### Menu UI
| # | Test Case | Status |
|---|----------|--------|
| FM1 | Menu page loads and displays all items | 👁️ |
| FM2 | Menu items show rating stars | 👁️ |
| FM3 | Add to cart works with quantity selection | 👁️ |
| FM4 | Cart badge updates | 👁️ |

### Orders UI
| # | Test Case | Status |
|---|----------|--------|
| FO1 | Checkout collects delivery info | 👁️ |
| FO2 | Promo code input validates and applies discount | 👁️ |
| FO3 | Order confirmation shows details | 👁️ |
| FO4 | Orders page lists history | 👁️ |
| FO5 | Order detail shows items, delivery, status | 👁️ |
| FO6 | Order tracking shows current status | 👁️ |

### Ratings UI
| # | Test Case | Status |
|---|----------|--------|
| FR1 | Rating form opens for delivered items | 👁️ |
| FR2 | Star selector works (1-5) | 👁️ |
| FR3 | Review text respects max length | 👁️ |
| FR4 | Submitted rating shows in list | 👁️ |
| FR5 | Rating summary updates after submission | 👁️ |
