import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { HttpError } from '../lib/errors';

const REVIEW_MAX_LEN = 500;

interface UpsertRatingInput {
  userId: string;
  menuId: number;
  stars: number;
  review?: string | null;
}

export async function upsertRating(input: UpsertRatingInput) {
  const { userId, menuId, stars, review } = input;

  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new HttpError(400, 'VALIDATION', 'Stars must be an integer between 1 and 5');
  }
  let sanitizedReview: string | null = null;
  if (review !== undefined && review !== null && review !== '') {
    if (typeof review !== 'string') throw new HttpError(400, 'VALIDATION', 'Review must be a string');
    const trimmed = review.trim();
    if (trimmed.length > REVIEW_MAX_LEN) {
      throw new HttpError(400, 'VALIDATION', `Review must be ${REVIEW_MAX_LEN} characters or fewer`);
    }
    if (trimmed.length > 0) sanitizedReview = trimmed;
  }

  const db = getDb();

  // Check menu item exists
  const [menuRow] = await db
    .select({ id: schema.menuItems.id })
    .from(schema.menuItems)
    .where(eq(schema.menuItems.id, menuId));
  if (!menuRow) {
    throw new HttpError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
  }

  // Check user has a delivered order with this item
  const [delivered] = await db
    .select({ ok: sql<number>`1` })
    .from(schema.orders)
    .innerJoin(schema.orderItems, eq(schema.orders.id, schema.orderItems.orderId))
    .where(
      and(
        eq(schema.orders.userId, userId),
        eq(schema.orderItems.menuId, menuId),
        eq(schema.orders.status, 'delivered'),
      ),
    )
    .limit(1);
  if (!delivered) {
    throw new HttpError(403, 'NOT_ELIGIBLE', 'You can rate items only after delivery');
  }

  // Upsert
  await db
    .insert(schema.ratings)
    .values({ userId, menuId, stars, review: sanitizedReview })
    .onConflictDoUpdate({
      target: [schema.ratings.userId, schema.ratings.menuId],
      set: { stars, review: sanitizedReview, createdAt: new Date() },
    });

  const [row] = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(and(eq(schema.ratings.userId, userId), eq(schema.ratings.menuId, menuId)));

  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function listRatingsForItem(menuId: number, opts: { limit?: number; offset?: number } = {}) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const limit = Math.min(Math.max(opts.limit || 20, 1), 100);
  const offset = Math.max(opts.offset || 0, 0);

  const db = getDb();
  const rows = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(eq(schema.ratings.menuId, menuId))
    .orderBy(sql`${schema.ratings.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getRatingSummary(menuId: number) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const db = getDb();
  const [row] = await db
    .select({
      average: sql<number>`coalesce(round(avg(${schema.ratings.stars})::numeric, 1), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(eq(schema.ratings.menuId, menuId));

  return { menuId, average: row?.average ?? 0, count: row?.count ?? 0 };
}

export async function getMyRating(userId: string, menuId: number) {
  if (!Number.isInteger(menuId) || menuId <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  const db = getDb();
  const [row] = await db
    .select({
      id: schema.ratings.id,
      userId: schema.ratings.userId,
      menuId: schema.ratings.menuId,
      stars: schema.ratings.stars,
      review: schema.ratings.review,
      createdAt: schema.ratings.createdAt,
    })
    .from(schema.ratings)
    .where(and(eq(schema.ratings.userId, userId), eq(schema.ratings.menuId, menuId)));

  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}

export async function getTotalRatingsCount() {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.ratings);
  return row?.n ?? 0;
}
