# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security
- Applied admin guard to all `/api/manage/*` routes (was unprotected)
- Added security headers middleware (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- Hardened Better-Auth session cookie configuration (cookieCache, __Host- prefix)
- Migrated admin auth from shared header password to role-based Better-Auth admin plugin

### Added
- Elysia backend replacing Express (Bun-native HTTP framework)
- PostgreSQL via Drizzle ORM replacing SQLite
- Better-Auth for authentication (email + password) replacing custom JWT/bcrypt
- Better-Auth admin plugin with role-based access control
- Admin login endpoint (`POST /api/admin/login`) with role verification
- Seeded initial admin user on startup
- Admin login page (`/admin/login`) with warm/light theme
- Pagination on admin orders list
- Batch-loader utility (`groupBy`) for fixing N+1 queries
- Shared TypeScript types package (`packages/shared`)
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
- Redesigned admin dashboard with warm/light theme matching project design system
- Decomposed 800-line Manage.tsx into focused tab components
- Admin routes moved from `/manage` to `/admin` with backward redirect
- Batch-loaded queries eliminate N+1 anti-patterns in manage users, orders, promos

### Removed
- Express 4 framework (22+ dead files: routes, middleware, services, lib)
- better-sqlite3 embedded database
- Custom JWT/bcrypt authentication system
- `x-manage-key` shared password admin auth
- Backend `.env.example` (superseded by root `.env.example`)
- `jsonwebtoken`, `bcrypt` dependencies
- `express-rate-limit` replaced by custom rate limit store
- `cors`, `helmet` replaced by Elysia equivalents
- `pino`, `pino-http`, `pino-pretty` logging (replaced by Bun console)
- `prom-client` metrics (to be re-added in future phase if needed)
- `npm-run-all` dev dependency
- `node --watch` dev runner (replaced by `bun --watch`)

### Fixed
- N/A (initial migration)
