/**
 * Promote an existing user to admin role.
 *
 * Usage:
 *   bun run scripts/promote-admin.ts user@example.com
 *
 * Or with explicit DB URL:
 *   DATABASE_URL=postgres://... bun run scripts/promote-admin.ts user@example.com
 *
 * To also seed the initial admin if it doesn't exist:
 *   bun run scripts/promote-admin.ts admin@kgamay.com --create
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Minimal inline schema for the user table
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

const userTable = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => a.includes('@'));
  const createFlag = args.includes('--create');

  if (!email) {
    console.error('Usage: bun run scripts/promote-admin.ts <email> [--create]');
    console.error('       bun run scripts/promote-admin.ts user@example.com');
    console.error('       bun run scripts/promote-admin.ts user@example.com --create');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/k-gamay';
  console.log(`Connecting to database...`);

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool, { schema: { user: userTable } });

  try {
    const users = await db.select().from(userTable).where(eq(userTable.email, email));

    if (users.length === 0) {
      if (createFlag) {
        console.log(`User "${email}" not found and --create not yet supported for full auth signup.`);
        console.log(`Please sign up first at the app, then re-run this script.`);
      } else {
        console.log(`User "${email}" not found. Use --create to create it (requires sign-up first).`);
      }
      process.exit(1);
    }

    const user = users[0];
    if (user.role?.includes('admin')) {
      console.log(`User "${email}" is already an admin (role: ${user.role}).`);
    } else {
      await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.email, email));
      console.log(`✅ User "${email}" (${user.name}) promoted to admin.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
