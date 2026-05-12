import { sql, eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { auth } from '../auth';

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

const MOCK_REVIEWERS = [
  { id: 'mock-priya-m', name: 'Priya M.', email: 'priya.m@example.com' },
  { id: 'mock-marcus-l', name: 'Marcus L.', email: 'marcus.l@example.com' },
  { id: 'mock-aiko-t', name: 'Aiko T.', email: 'aiko.t@example.com' },
  { id: 'mock-david-r', name: 'David R.', email: 'david.r@example.com' },
  { id: 'mock-sofia-g', name: 'Sofia G.', email: 'sofia.g@example.com' },
  { id: 'mock-james-w', name: 'James W.', email: 'james.w@example.com' },
  { id: 'mock-emma-c', name: 'Emma C.', email: 'emma.c@example.com' },
  { id: 'mock-leo-k', name: 'Leo K.', email: 'leo.k@example.com' },
];

const POSITIVE_REVIEWS = [
  'Absolutely loved this — would order again in a heartbeat.',
  'Arrived hot and packed beautifully. 10/10.',
  'My new go-to. Portion size was generous too.',
  'Perfectly seasoned, fresh ingredients. Chef knows what they’re doing.',
  'Better than the restaurant down the street, honestly.',
  'Quick delivery and the flavor was on point.',
  null,
  'Family devoured it. Will reorder this weekend.',
];

const MIXED_REVIEWS = [
  'Good but a bit pricey for the portion.',
  'Tasty, though I’d like it a touch spicier.',
  'Solid choice. Nothing wrong with it, nothing surprising either.',
  null,
];

// Deterministic pseudo-random so the seeded data is stable across restarts.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kgamay.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

  const [existingAdmin] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, adminEmail));

  if (!existingAdmin) {
    try {
      // Create user via Better-Auth's internal signup API
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: 'Admin',
        },
      });

      // Set the role to admin
      await db
        .update(schema.user)
        .set({ role: 'admin' })
        .where(eq(schema.user.email, adminEmail));

      console.log(`Admin user created: ${adminEmail}`);
    } catch (err) {
      console.error('Failed to create admin user:', err);
    }
  }

  // Seed mock ratings (display-only, idempotent).
  const ratingsCount = await db.select({ n: sql<number>`count(*)` }).from(schema.ratings);
  if (Number(ratingsCount[0].n) === 0) {
    // Ensure mock reviewer users exist (insert directly — no auth credentials).
    for (const r of MOCK_REVIEWERS) {
      await db
        .insert(schema.user)
        .values({
          id: r.id,
          email: r.email,
          name: r.name,
          emailVerified: true,
        })
        .onConflictDoNothing();
    }

    const items = await db.select().from(schema.menuItems);
    const rand = mulberry32(0xc0ffee);

    for (const item of items) {
      // 3–5 ratings per menu item.
      const n = 3 + Math.floor(rand() * 3);
      // Shuffle reviewers and take n unique ones for this item (unique (userId, menuId)).
      const pool = [...MOCK_REVIEWERS];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const reviewers = pool.slice(0, n);

      for (const reviewer of reviewers) {
        // Weighted: mostly 4–5 stars, occasional 3.
        const roll = rand();
        const stars = roll < 0.55 ? 5 : roll < 0.9 ? 4 : 3;
        const reviewPool = stars >= 4 ? POSITIVE_REVIEWS : MIXED_REVIEWS;
        const review = reviewPool[Math.floor(rand() * reviewPool.length)] ?? null;

        await db
          .insert(schema.ratings)
          .values({
            userId: reviewer.id,
            menuId: item.id,
            stars,
            review,
          })
          .onConflictDoNothing();
      }
    }
  }
}
