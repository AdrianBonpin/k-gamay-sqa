# SQA Food Delivery App

A Simple Food Delivery App built for **IT 3202N – Software Quality Assurance**. This is a monorepo containing a fully-built Express + SQLite backend and a modern React + TypeScript frontend, wired together for end-to-end QA-focused development.

## Monorepo Layout

```
sqa-food-delivery/
├── apps/
│   ├── backend/       Express + SQLite REST API (JWT auth, menu, orders, promo codes)
│   └── frontend/      React 18 + Vite + TypeScript + Tailwind UI
├── DOCS/              Product requirements and QA artifacts
├── package.json       npm workspaces root
└── README.md
```

## Tech Stack

### Backend (`apps/backend`)

- Node.js + Express 4
- better-sqlite3 (embedded SQLite, WAL mode)
- JWT auth with bcrypt password hashing
- Seeded menu data on first run

### Frontend (`apps/frontend`)

- Vite + React 18 + TypeScript (strict)
- TailwindCSS v3 with a warm, appetizing theme
- React Router v6 for client-side routing
- Zustand (persisted) for auth and cart state
- Axios with Bearer-token auth interceptor
- Framer Motion for micro-interactions
- React Hot Toast for notifications
- Lucide-react iconography

## Installation

From the repository root:

```bash
npm install
```

This installs dependencies for every workspace (backend and frontend) in one pass.

## Running in Development

Run both apps in parallel:

```bash
npm run dev
```

- Backend API: http://localhost:3001
- Frontend UI: http://localhost:5173

You can also run them individually:

```bash
npm run dev:backend
npm run dev:frontend
```

Vite is configured to proxy `/api/*` requests to the backend, so the frontend works seamlessly during development.

## Production Build

```bash
npm run build          # Builds apps/frontend to apps/frontend/dist
npm run start          # Starts backend server (serves API only)
```

## Environment

Create `apps/backend/.env` (optional; a dev default is provided):

```
JWT_SECRET=replace-me-with-a-long-random-string
PORT=3001
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
