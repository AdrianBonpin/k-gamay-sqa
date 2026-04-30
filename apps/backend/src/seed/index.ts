import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';

const SEED_PROMOS = [
  {
    code: 'SAVE10',
    discount: 0.1,
    description: '10% off your order',
    expiresAt: null,
    maxUses: null,
    maxPerUser: 3,
    firstOrderOnly: 0,
  },
  {
    code: 'WELCOME',
    discount: 0.15,
    description: '15% off for new users',
    expiresAt: null,
    maxUses: null,
    maxPerUser: 1,
    firstOrderOnly: 1,
  },
];

export async function seed() {
  const db = getDb();

  // Seed menu items from JSON (import at runtime via Bun)
  const menuFile = Bun.file(new URL('./menu.json', import.meta.url).pathname);
  const menuData: Array<{
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
  }> = await menuFile.json();

  const menuCount = await db.select({ n: sql<number>`count(*)` }).from(schema.menuItems);
  if (Number(menuCount[0].n) === 0) {
    for (const item of menuData) {
      await db.insert(schema.menuItems).values(item).onConflictDoNothing();
    }
  }

  // Seed promo codes
  const promoCount = await db.select({ n: sql<number>`count(*)` }).from(schema.promos);
  if (Number(promoCount[0].n) === 0) {
    for (const promo of SEED_PROMOS) {
      await db
        .insert(schema.promos)
        .values({
          code: promo.code,
          discount: promo.discount,
          description: promo.description,
          expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
          maxUses: promo.maxUses,
          maxPerUser: promo.maxPerUser,
          firstOrderOnly: promo.firstOrderOnly,
        })
        .onConflictDoNothing();
    }
  }
}
