# SQA Food Delivery App

A Simple Food Delivery App built for **IT 3202N – Software Quality Assurance**. This is a monorepo containing an Elysia + PostgreSQL backend and a modern React + TypeScript frontend, wired together for end-to-end QA-focused development.

## Monorepo Layout

```
sqa-food-delivery/
├── apps/
│   ├── backend/       Elysia + Drizzle ORM + PostgreSQL REST API (Better-Auth, promo codes)
│   └── frontend/      React 18 + Vite + TypeScript + Tailwind UI
├── docs/              Product requirements, test cases, and QA artifacts
├── package.json       Bun workspaces root
└── README.md
```

## Tech Stack

### Backend (`apps/backend`)

- Bun + Elysia (Bun-native HTTP framework)
- Drizzle ORM + PostgreSQL
- Better-Auth (email + password authentication)
- In-memory rate limiting with request tracing

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
bun install
```

This installs dependencies for every workspace (backend and frontend) in one pass.

## Database Setup

The backend requires a running PostgreSQL instance. Configure the connection string in your environment:

```bash
# Generate migrations from schema
bun run db:generate

# Apply migrations to the database
bun run db:migrate
```

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
bun run start          # Starts backend server (serves API only)
```

## Testing

```bash
bun run test
```

Runs backend tests (`bun test`) and frontend tests (Vitest) sequentially.

## Environment

Copy the provided example file and fill in your values:

```bash
cp .env.example .env.local
```

Key environment variables:

| Variable           | Description                            | Default                        |
|--------------------|----------------------------------------|--------------------------------|
| `DATABASE_URL`     | PostgreSQL connection string           | `postgresql://postgres:postgres@localhost:5432/k-gamay` |
| `BETTER_AUTH_SECRET` | Secret key for Better-Auth tokens    | (required in production)       |
| `BETTER_AUTH_URL`  | Base URL for auth links/callbacks      | `http://localhost:4000`        |

Promo codes available for testing: `SAVE10` (10% off), `WELCOME` (15% off).

## QA Workflow

This project is QA-focused. See `docs/PRD.md` for the full requirements document, sprint plan, and QA strategy.

Recommended per-sprint workflow:

1. **Plan** – Map PRD user stories to tickets.
2. **Build** – Dev implements against acceptance criteria.
3. **Test** – QA writes test cases alongside dev work (functional, regression, negative, UI).
4. **Bug Triage** – Severity: High (blocks core flow) / Medium (misbehavior) / Low (cosmetic).
5. **Retest & Close** – Validate fixes, run regression.
6. **Demo** – Sprint review; retrospective feeds the next sprint.

## License

Coursework project. All rights reserved.
