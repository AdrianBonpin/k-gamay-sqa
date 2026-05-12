/**
 * Promote an existing user to admin role.
 *
 * Usage:
 *   bun auth:promote user@example.com
 *   DATABASE_URL=... bun auth:promote user@example.com
 */

import { eq } from 'drizzle-orm';
import { getDb, schema, closeDb } from '../apps/backend/src/db';

async function main() {
  const email = process.argv[2]?.trim();

  if (!email || !email.includes('@')) {
    console.error('Usage: bun auth:promote <email>');
    console.error('       bun auth:promote user@example.com');
    process.exit(1);
  }

  const db = getDb();

  try {
    const users = await db
      .select({ id: schema.user.id, name: schema.user.name, role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.email, email));

    if (users.length === 0) {
      console.error(`❌ User "${email}" not found. Have they signed up yet?`);
      process.exit(1);
    }

    const user = users[0];

    if (user.role?.includes('admin')) {
      console.log(`User "${email}" is already an admin (role: ${user.role}).`);
    } else {
      await db
        .update(schema.user)
        .set({ role: 'admin' })
        .where(eq(schema.user.email, email));
      console.log(`✅ User "${email}" (${user.name}) promoted to admin.`);
    }
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
