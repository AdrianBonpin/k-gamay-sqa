/**
 * Wipe the database — drop all tables, re-run migrations, and re-seed.
 *
 * Usage:
 *   bun db:wipe                       # wipe dev DB
 *   DATABASE_URL=... bun db:wipe      # wipe specific DB
 *
 * WARNING: This DESTROYS all data. There is no undo.
 */

import { Pool } from 'pg';
import { $ } from 'bun';
import { seed } from '../apps/backend/src/seed/index';

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/k-gamay';
const BACKEND_DIR = new URL('../apps/backend', import.meta.url).pathname;

async function main() {
  console.log(`\n⚠️  WIPING database...\n`);

  // ── Step 1: Drop all tables via schema reset ─────────────────────
  const pool = new Pool({ connectionString: DB_URL });
  try {
    console.log(`  Dropping all tables...`);
    await pool.query(`DROP SCHEMA public CASCADE`);
    await pool.query(`CREATE SCHEMA public`);
    await pool.query(`GRANT ALL ON SCHEMA public TO postgres`);
    await pool.query(`GRANT ALL ON SCHEMA public TO public`);
    console.log(`  ✅ All tables dropped.`);

    // Clean drizzle migration tracking table
    await pool.query(`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`).catch(() => {});
    await pool.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`).catch(() => {});
  } finally {
    await pool.end();
  }

  // ── Step 2: Run migrations ───────────────────────────────────────
  console.log(`  Running migrations...`);
  const result = await $`cd ${BACKEND_DIR} && bun run db:migrate`.env({ DATABASE_URL: DB_URL }).quiet();
  if (result.exitCode !== 0) {
    console.error(`  ❌ Migration failed:\n${result.stderr.toString()}`);
    process.exit(1);
  }
  console.log(`  ✅ Migrations applied.`);

  // ── Step 3: Re-seed ──────────────────────────────────────────────
  console.log(`  Seeding data...`);
  process.env.DATABASE_URL = DB_URL;
  await seed();
  console.log(`  ✅ Seed complete.`);

  console.log(`\n✅ Database wiped and re-seeded successfully.\n`);
}

main().catch((err) => {
  console.error('❌ Wipe failed:', err);
  process.exit(1);
});
