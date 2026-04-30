import { beforeEach, afterEach } from 'bun:test';
import type { Elysia } from 'elysia';

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/k-gamay-test';
process.env.BETTER_AUTH_SECRET = 'test-secret-do-not-use-in-prod';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.CORS_ORIGIN = 'http://localhost:5173';

let currentApp: Elysia | null = null;

export async function freshApp() {
  // In Bun's ESM context, import() caches modules so repeated calls
  // return the same instances. Since createApp() returns a fresh Elysia
  // instance each time and the DB connection is managed via the singleton
  // pattern (getDb/closeDb), cache clearing is not needed -- resetting
  // the database data is sufficient for test isolation.
  const { createApp } = await import('../src/app');
  const { getDb } = await import('../src/db');
  const { seed } = await import('../src/seed');

  // Ensure DB is seeded (seed is idempotent -- checks for existing data)
  const db = getDb();
  await seed();

  const app = createApp();
  currentApp = app;
  return app;
}

export function getApp() {
  if (!currentApp) throw new Error('Call freshApp() first');
  return currentApp;
}

// Helper: make a request to the test app
export async function request(path: string, init?: RequestInit) {
  const app = getApp();
  return app.fetch(new Request(`http://localhost${path}`, init));
}

// Helper: clean mutable database tables between tests
// Preserves seeded data (menu_items, promos) and user/session tables
// (managed by better-auth).
export async function cleanDb() {
  const { getDb, schema } = await import('../src/db');
  const db = getDb();
  await db.delete(schema.orderItems).execute();
  await db.delete(schema.orders).execute();
  await db.delete(schema.deliveryAddresses).execute();
  await db.delete(schema.ratings).execute();
}
