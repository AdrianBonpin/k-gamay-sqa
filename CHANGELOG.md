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
