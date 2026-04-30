import { eq, sql, and, or, isNull, gte } from 'drizzle-orm';
import { getDb, schema } from '../db';

export async function lookupPromo(
  code: string,
  opts?: { userId?: string },
) {
  if (typeof code !== 'string') return null;
  const key = code.trim().toUpperCase();
  if (!key) return null;

  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.promos)
    .where(eq(schema.promos.code, key));

  if (!row) return null;

  // Expiry check
  if (row.expiresAt) {
    const exp = row.expiresAt.getTime();
    if (exp <= Date.now()) return null;
  }

  // Global maxUses
  if (row.maxUses !== null && row.maxUses > 0) {
    const [countRow] = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.orders)
      .where(eq(schema.orders.promoCode, row.code));
    if (Number(countRow.n) >= row.maxUses) return null;
  }

  const userId = opts?.userId;
  if (userId) {
    // Per-user maxUses
    if (row.maxPerUser !== null && row.maxPerUser > 0) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.orders)
        .where(
          and(eq(schema.orders.userId, userId), eq(schema.orders.promoCode, row.code)),
        );
      if (Number(countRow.n) >= row.maxPerUser) return null;
    }
    // First order only
    if (row.firstOrderOnly) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.orders)
        .where(eq(schema.orders.userId, userId));
      if (Number(countRow.n) > 0) return null;
    }
  }

  return {
    code: row.code,
    discount: row.discount,
    description: row.description,
    firstOrderOnly: Boolean(row.firstOrderOnly),
  };
}

export async function listActivePromos() {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      code: schema.promos.code,
      discount: schema.promos.discount,
      description: schema.promos.description,
      firstOrderOnly: schema.promos.firstOrderOnly,
    })
    .from(schema.promos)
    .where(
      or(isNull(schema.promos.expiresAt), gte(schema.promos.expiresAt, now)),
    )
    .orderBy(schema.promos.code);

  return rows.map((r) => ({
    code: r.code,
    discount: r.discount,
    description: r.description,
    firstOrderOnly: Boolean(r.firstOrderOnly),
  }));
}
