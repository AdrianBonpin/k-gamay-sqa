# Product Requirements Document (PRD)

## Simple Food Delivery App

**Course:** IT 3202N – Software Quality Assurance
**Instructor:** Kirstine Mae Enriquez, LPT
**Customer/Stakeholder:** Instructor
**Team Size:** 8 members (Product Owner/Scrum Master, Dev, QA)
**Methodology:** Agile Scrum (QA-Focused, Build + Test)
**Date:** 2026-04-14

---

## 1. Overview

### 1.1 Product Vision

A simple Food Delivery App that allows users to browse a menu, create accounts, place orders, and receive order summaries — with QA-validated quality at every sprint.

### 1.2 Goals

- Deliver a working food delivery system through iterative sprints.
- Demonstrate Agile Scrum practices (planning, build, test, review).
- Produce full QA artifacts (test cases, bug reports, regression validation).
- Determine release-readiness by the Final Presentation.

### 1.3 Target Users

End customers who want to order food online quickly and easily.

---

## 2. Scope

### 2.1 In Scope (Core Requirements)

#### 2.1.1 Browse Menu

- Display list of food items.
- Each item includes: **name**, **description**, **price**.
- Menu must be easy to read and navigate.

#### 2.1.2 Login / Account

- Users can log in and log out.
- Users can create a new account.
- Security prevents invalid/wrong logins (e.g., lockout, validation).

#### 2.1.3 Checkout / Place Order

- Users can confirm their order.
- Users receive an order summary containing items and total.
- Orders must be saved (persistence).

### 2.2 Optional / Good-to-Have

- Promo codes / discounts
- Delivery tracking (pending, in progress, delivered)
- Order history / past orders

### 2.3 Out of Scope

- Real payment gateway integration
- Live courier dispatch / GPS tracking
- Multi-language, multi-currency support
- Native mobile app builds (unless team chooses)

---

## 3. User Stories

### Authentication

- As a user, I want to **create an account** so I can save my orders.
- As a user, I want to **log in** so I can access my account.
- As a user, I want to **log out** so my account stays secure.
- As a user, I want **wrong login attempts blocked** so my account is protected.

### Menu

- As a user, I want to **browse the menu** so I can see available food.
- As a user, I want to **see item name, description, and price** so I can make informed choices.

### Cart & Checkout

- As a user, I want to **add items to my cart** so I can order multiple items.
- As a user, I want to **confirm my order** so it gets placed.
- As a user, I want to **see an order summary with total** so I know what I'm paying for.
- As a user, I want my **order saved** so it's not lost.

### Optional

- As a user, I want to **apply a promo code** to get a discount.
- As a user, I want to **track my delivery** (pending → in progress → delivered).
- As a user, I want to **view past orders** so I can reorder easily.

---

## 4. Functional Requirements

| ID    | Requirement                                                             | Priority |
| ----- | ----------------------------------------------------------------------- | -------- |
| FR-01 | System shall display a menu of food items with name, description, price | Must     |
| FR-02 | System shall allow new user account creation                            | Must     |
| FR-03 | System shall authenticate users on login                                | Must     |
| FR-04 | System shall reject invalid credentials                                 | Must     |
| FR-05 | System shall allow users to log out                                     | Must     |
| FR-06 | System shall allow adding items to cart                                 | Must     |
| FR-07 | System shall allow order confirmation                                   | Must     |
| FR-08 | System shall display order summary with items and total                 | Must     |
| FR-09 | System shall persist placed orders                                      | Must     |
| FR-10 | System may support promo/discount codes                                 | Should   |
| FR-11 | System may track delivery status                                        | Could    |
| FR-12 | System may display order history                                        | Could    |

---

## 5. Non-Functional Requirements

- **Usability:** Menu readable; flows intuitive for first-time users.
- **Security:** Passwords not stored in plaintext; login attempts validated.
- **Reliability:** Orders must not be lost once confirmed.
- **Performance:** Menu loads within reasonable time on standard hardware.
- **Maintainability:** Code organized to support iterative sprint additions.

---

## 6. Scrum Plan

### 6.1 Roles

- **Product Owner / Scrum Master:** Translates requirements into backlog; facilitates ceremonies.
- **Dev Team:** Implements features per sprint.
- **QA Team:** Writes test cases, executes tests, reports bugs, validates fixes.

### 6.2 Proposed Sprint Breakdown

| Sprint              | Focus           | Deliverables                                           |
| ------------------- | --------------- | ------------------------------------------------------ |
| Sprint 1            | Account & Menu  | Login, Signup, Logout, Browse Menu                     |
| Sprint 2            | Cart & Checkout | Add to Cart, Confirm Order, Order Summary, Persistence |
| Sprint 3 (optional) | Extras          | Promo codes, Delivery tracking, Order history          |

### 6.3 Ceremonies

- **Sprint Planning:** Team decides what to build & test; assigns tasks.
- **Daily Progress:** Dev builds; QA writes test cases immediately and tests.
- **Sprint Review (Demo Day / Prefinal):** Present completed system & features.
- **Retrospective:** Lessons learned feed next sprint.

---

## 7. QA Strategy

### 7.1 Testing Types

- **Functional Testing** — verify each feature works per spec
- **Regression Testing** — verify fixes don't break prior features
- **Negative Testing** — wrong logins, invalid inputs
- **UI/Usability Testing** — menu readability, flow clarity

### 7.2 Per-Sprint QA Artifacts

1. **Test Cases** — one set per feature (steps, expected results, actual results, status)
2. **Bug Reports** — title, severity (High/Medium/Low), steps to reproduce, expected vs actual
3. **Retesting / Fix Validation** — confirm bugs closed after dev fixes

### 7.3 Sample Test Cases

**TC-01: Valid Login**

- Steps: Enter valid username/password → click Login
- Expected: User redirected to menu page

**TC-02: Invalid Login**

- Steps: Enter wrong password → click Login
- Expected: Error message shown; user not logged in

**TC-03: Place Order**

- Steps: Add item to cart → Checkout → Confirm
- Expected: Order summary shown with correct items & total; order saved

### 7.4 Bug Severity Definitions

- **High:** Blocks core flow (login fails, order not saved)
- **Medium:** Feature works but misbehaves (wrong total, UI glitch)
- **Low:** Cosmetic (typo, alignment)

---

## 8. Deliverables

### 8.1 Prefinal Presentation (Sprint Review / Demo Day)

- Working system demo
- Features completed so far

### 8.2 Final Presentation

1. **Project Overview** — system built, key features
2. **Scrum Journey** — sprints completed, work per sprint, challenges
3. **Testing Strategy** — what was tested, testing types used
4. **Test Cases** — 2–3 strong examples with steps & expected results
5. **Bug Reports** — top bugs with severity
6. **Regression Testing** — fixes made, side effects found
7. **QA Summary Report** — total cases executed, total bugs found, critical issues remaining
8. **Release Readiness** — is the system ready to ship?

---

## 9. Success Criteria

- All Must-have functional requirements pass QA.
- Zero critical/high-severity bugs open at Final Presentation.
- Complete QA documentation (test cases, bug reports, regression results).
- Team can justify a release-readiness decision with evidence.

---

## 10. Risks & Mitigation

| Risk                               | Mitigation                              |
| ---------------------------------- | --------------------------------------- |
| Feature creep from "optional" list | Lock scope at Sprint Planning           |
| Late bug discovery                 | QA writes test cases alongside dev work |
| Persistence failures               | Prioritize order-save tests early       |
| Team coordination (8 members)      | Clear role assignment; daily syncs      |
