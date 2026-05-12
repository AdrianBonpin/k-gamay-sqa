import { eq, sql, inArray } from 'drizzle-orm';
import { getDb, schema } from '../db';

export async function listMenuItems() {
  const db = getDb();
  const items = await db
    .select()
    .from(schema.menuItems)
    .orderBy(schema.menuItems.category, schema.menuItems.id);

  // Enrich with rating summaries
  const ids = items.map((it) => it.id);
  const summaries = ids.length > 0 ? await getRatingSummariesForMenuIds(ids) : new Map();

  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    price: it.price,
    imageUrl: it.imageUrl,
    category: it.category,
    rating: summaries.get(it.id) || { menuId: it.id, average: 0, count: 0 },
  }));
}

async function getRatingSummariesForMenuIds(ids: number[]) {
  const db = getDb();
  const rows = await db
    .select({
      menuId: schema.ratings.menuId,
      average: sql<number>`(round(avg(${schema.ratings.stars})::numeric, 1))::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(inArray(schema.ratings.menuId, ids))
    .groupBy(schema.ratings.menuId);

  const map = new Map<number, { menuId: number; average: number; count: number }>();
  for (const id of ids) {
    map.set(id, { menuId: id, average: 0, count: 0 });
  }
  for (const r of rows) {
    map.set(r.menuId, {
      menuId: r.menuId,
      average: Number(r.average ?? 0),
      count: Number(r.count ?? 0),
    });
  }
  return map;
}
