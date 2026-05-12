import { Elysia, t } from 'elysia';
import { eq, ne, and, sql, inArray, desc, asc } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { HttpError } from '../lib/errors';
import { toCents, fromCents, applyDiscountCents } from '../lib/money';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RatingSummary = { menuId: number; average: number; count: number };

/** Fetch rating summaries for an array of menu item IDs. */
async function ratingSummariesForMenuIds(ids: number[]): Promise<Map<number, RatingSummary>> {
  const db = getDb();
  const map = new Map<number, RatingSummary>();
  for (const id of ids) {
    map.set(id, { menuId: id, average: 0, count: 0 });
  }
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      menuId: schema.ratings.menuId,
      average: sql<number>`(round(avg(${schema.ratings.stars})::numeric, 1))::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(inArray(schema.ratings.menuId, ids))
    .groupBy(schema.ratings.menuId);

  for (const r of rows) {
    map.set(r.menuId, {
      menuId: r.menuId,
      average: Number(r.average ?? 0),
      count: Number(r.count ?? 0),
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const manageRoutes = new Elysia({ prefix: '/manage' })

      // ═══════════════════════════════════════════════════════════════════
      // DASHBOARD
      // ═══════════════════════════════════════════════════════════════════
      .get('/', async () => {
        const db = getDb();

        const [userRow] = await db
          .select({ n: sql<number>`count(*)::int` }).from(schema.user);
        const [orderRow] = await db
          .select({ n: sql<number>`count(*)::int` }).from(schema.orders);
        const [menuRow] = await db
          .select({ n: sql<number>`count(*)::int` }).from(schema.menuItems);
        const [promoRow] = await db
          .select({ n: sql<number>`count(*)::int` }).from(schema.promos);
        const [ratingRow] = await db
          .select({ n: sql<number>`count(*)::int` }).from(schema.ratings);
        const [revenueRow] = await db
          .select({ total: sql<number>`coalesce(sum(${schema.orders.totalCents}), 0)` })
          .from(schema.orders)
          .where(ne(schema.orders.status, 'pending'));

        const [pendingRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orders)
          .where(eq(schema.orders.status, 'pending'));
        const [inProgressRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orders)
          .where(eq(schema.orders.status, 'in_progress'));
        const [deliveredRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orders)
          .where(eq(schema.orders.status, 'delivered'));

        const revenueCents = Number(revenueRow.total);

        return {
          ok: true,
          stats: {
            users: Number(userRow.n),
            orders: Number(orderRow.n),
            menuItems: Number(menuRow.n),
            promos: Number(promoRow.n),
            ratings: Number(ratingRow.n),
            revenue: fromCents(revenueCents),
            revenueCents,
            ordersByStatus: {
              pending: Number(pendingRow.n),
              in_progress: Number(inProgressRow.n),
              delivered: Number(deliveredRow.n),
            },
          },
        };
      })

      // ═══════════════════════════════════════════════════════════════════
      // USERS
      // ═══════════════════════════════════════════════════════════════════

      // List all users
      .get('/users', async () => {
        const db = getDb();
        const users = await db
          .select({
            id: schema.user.id,
            email: schema.user.email,
            name: schema.user.name,
            createdAt: schema.user.createdAt,
          })
          .from(schema.user)
          .orderBy(desc(schema.user.createdAt));

        // Attach order counts per user
        const enriched = await Promise.all(
          users.map(async (u) => {
            const [row] = await db
              .select({ n: sql<number>`count(*)::int` })
              .from(schema.orders)
              .where(eq(schema.orders.userId, u.id));
            return {
              ...u,
              createdAt: u.createdAt.toISOString(),
              orderCount: Number(row.n),
            };
          }),
        );

        return enriched;
      })

      // Get single user with their orders
      .get(
        '/users/:id',
        async ({ params }) => {
          const { id } = params;
          const db = getDb();

          const [user] = await db
            .select({
              id: schema.user.id,
              email: schema.user.email,
              name: schema.user.name,
              createdAt: schema.user.createdAt,
            })
            .from(schema.user)
            .where(eq(schema.user.id, id));

          if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

          const orders = await db
            .select({
              id: schema.orders.id,
              totalCents: schema.orders.totalCents,
              status: schema.orders.status,
              createdAt: schema.orders.createdAt,
              promoCode: schema.orders.promoCode,
              discount: schema.orders.discount,
              deliveryAddressId: schema.orders.deliveryAddressId,
            })
            .from(schema.orders)
            .where(eq(schema.orders.userId, id))
            .orderBy(desc(schema.orders.createdAt));

          const enrichedOrders = await Promise.all(
            orders.map(async (o) => {
              const items = await db
                .select({
                  id: schema.orderItems.id,
                  menuId: schema.orderItems.menuId,
                  qty: schema.orderItems.qty,
                  priceAtOrder: schema.orderItems.priceAtOrder,
                  name: schema.menuItems.name,
                  description: schema.menuItems.description,
                  imageUrl: schema.menuItems.imageUrl,
                  category: schema.menuItems.category,
                })
                .from(schema.orderItems)
                .innerJoin(schema.menuItems, eq(schema.orderItems.menuId, schema.menuItems.id))
                .where(eq(schema.orderItems.orderId, o.id));

              let delivery = null;
              if (o.deliveryAddressId) {
                const [addr] = await db
                  .select({
                    name: schema.deliveryAddresses.name,
                    address: schema.deliveryAddresses.address,
                    phone: schema.deliveryAddresses.phone,
                  })
                  .from(schema.deliveryAddresses)
                  .where(eq(schema.deliveryAddresses.id, o.deliveryAddressId));
                if (addr) delivery = addr;
              }

              return {
                id: o.id,
                status: o.status,
                createdAt: o.createdAt.toISOString(),
                total: fromCents(o.totalCents),
                totalCents: o.totalCents,
                promoCode: o.promoCode ?? null,
                discount: typeof o.discount === 'number' ? o.discount : 0,
                items,
                delivery,
              };
            }),
          );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
            orders: enrichedOrders,
          };
        },
      )

      // Delete user (cascades to related records)
      .delete('/users/:id', async ({ params }) => {
        const { id } = params;
        const db = getDb();

        const [user] = await db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.id, id));

        if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

        // Delete related data manually for tables without FK cascades on userId
        await db.delete(schema.deliveryAddresses).where(eq(schema.deliveryAddresses.userId, id));
        await db.delete(schema.ratings).where(eq(schema.ratings.userId, id));

        // order_items cascade when orders are deleted (FK onDelete: 'cascade')
        await db.delete(schema.orders).where(eq(schema.orders.userId, id));

        // User delete cascades to session/account via FK onDelete: 'cascade'
        await db.delete(schema.user).where(eq(schema.user.id, id));

        return { ok: true, deleted: id };
      })

      // ═══════════════════════════════════════════════════════════════════
      // ORDERS
      // ═══════════════════════════════════════════════════════════════════

      // List all orders (across all users)
      .get('/orders', async ({ query }) => {
        const db = getDb();
        const status = query.status as string | undefined;

        let orderRows;
        if (status && ['pending', 'in_progress', 'delivered'].includes(status)) {
          orderRows = await db
            .select({
              id: schema.orders.id,
              userId: schema.orders.userId,
              totalCents: schema.orders.totalCents,
              status: schema.orders.status,
              createdAt: schema.orders.createdAt,
              promoCode: schema.orders.promoCode,
              discount: schema.orders.discount,
              deliveryAddressId: schema.orders.deliveryAddressId,
              userEmail: schema.user.email,
              userName: schema.user.name,
            })
            .from(schema.orders)
            .innerJoin(schema.user, eq(schema.orders.userId, schema.user.id))
            .where(eq(schema.orders.status, status))
            .orderBy(desc(schema.orders.createdAt));
        } else {
          orderRows = await db
            .select({
              id: schema.orders.id,
              userId: schema.orders.userId,
              totalCents: schema.orders.totalCents,
              status: schema.orders.status,
              createdAt: schema.orders.createdAt,
              promoCode: schema.orders.promoCode,
              discount: schema.orders.discount,
              deliveryAddressId: schema.orders.deliveryAddressId,
              userEmail: schema.user.email,
              userName: schema.user.name,
            })
            .from(schema.orders)
            .innerJoin(schema.user, eq(schema.orders.userId, schema.user.id))
            .orderBy(desc(schema.orders.createdAt));
        }

        const enriched = await Promise.all(
          orderRows.map(async (o) => {
            const items = await db
              .select({
                id: schema.orderItems.id,
                menuId: schema.orderItems.menuId,
                qty: schema.orderItems.qty,
                priceAtOrder: schema.orderItems.priceAtOrder,
                name: schema.menuItems.name,
                imageUrl: schema.menuItems.imageUrl,
              })
              .from(schema.orderItems)
              .innerJoin(schema.menuItems, eq(schema.orderItems.menuId, schema.menuItems.id))
              .where(eq(schema.orderItems.orderId, o.id));

            let delivery = null;
            if (o.deliveryAddressId) {
              const [addr] = await db
                .select({
                  name: schema.deliveryAddresses.name,
                  address: schema.deliveryAddresses.address,
                  phone: schema.deliveryAddresses.phone,
                })
                .from(schema.deliveryAddresses)
                .where(eq(schema.deliveryAddresses.id, o.deliveryAddressId));
              if (addr) delivery = addr;
            }

            return {
              id: o.id,
              userId: o.userId,
              userEmail: o.userEmail,
              userName: o.userName,
              status: o.status,
              createdAt: o.createdAt.toISOString(),
              total: fromCents(o.totalCents),
              totalCents: o.totalCents,
              promoCode: o.promoCode ?? null,
              discount: typeof o.discount === 'number' ? o.discount : 0,
              items,
              delivery,
            };
          }),
        );

        return enriched;
      })

      // Get single order (admin — any user)
      .get('/orders/:id', async ({ params }) => {
        const orderId = Number(params.id);
        if (!Number.isInteger(orderId) || orderId <= 0) {
          throw new HttpError(400, 'INVALID_ID', 'Invalid order id');
        }

        const db = getDb();
        const [o] = await db
          .select({
            id: schema.orders.id,
            userId: schema.orders.userId,
            totalCents: schema.orders.totalCents,
            status: schema.orders.status,
            createdAt: schema.orders.createdAt,
            promoCode: schema.orders.promoCode,
            discount: schema.orders.discount,
            deliveryAddressId: schema.orders.deliveryAddressId,
            userEmail: schema.user.email,
            userName: schema.user.name,
          })
          .from(schema.orders)
          .innerJoin(schema.user, eq(schema.orders.userId, schema.user.id))
          .where(eq(schema.orders.id, orderId));

        if (!o) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');

        const items = await db
          .select({
            id: schema.orderItems.id,
            menuId: schema.orderItems.menuId,
            qty: schema.orderItems.qty,
            priceAtOrder: schema.orderItems.priceAtOrder,
            name: schema.menuItems.name,
            description: schema.menuItems.description,
            imageUrl: schema.menuItems.imageUrl,
            category: schema.menuItems.category,
          })
          .from(schema.orderItems)
          .innerJoin(schema.menuItems, eq(schema.orderItems.menuId, schema.menuItems.id))
          .where(eq(schema.orderItems.orderId, orderId));

        let delivery = null;
        if (o.deliveryAddressId) {
          const [addr] = await db
            .select({
              name: schema.deliveryAddresses.name,
              address: schema.deliveryAddresses.address,
              phone: schema.deliveryAddresses.phone,
            })
            .from(schema.deliveryAddresses)
            .where(eq(schema.deliveryAddresses.id, o.deliveryAddressId));
          if (addr) delivery = addr;
        }

        return {
          id: o.id,
          userId: o.userId,
          userEmail: o.userEmail,
          userName: o.userName,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          total: fromCents(o.totalCents),
          totalCents: o.totalCents,
          promoCode: o.promoCode ?? null,
          discount: typeof o.discount === 'number' ? o.discount : 0,
          items,
          delivery,
        };
      })

      // Update order status (admin — any transition allowed)
      .patch(
        '/orders/:id/status',
        async ({ params, body }) => {
          const orderId = Number(params.id);
          if (!Number.isInteger(orderId) || orderId <= 0) {
            throw new HttpError(400, 'INVALID_ID', 'Invalid order id');
          }

          const { status } = body;
          if (!['pending', 'in_progress', 'delivered'].includes(status)) {
            throw new HttpError(
              400,
              'INVALID_STATUS',
              'Status must be: pending, in_progress, or delivered',
            );
          }

          const db = getDb();
          const [existing] = await db
            .select({ id: schema.orders.id, status: schema.orders.status })
            .from(schema.orders)
            .where(eq(schema.orders.id, orderId));

          if (!existing) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');

          await db
            .update(schema.orders)
            .set({ status })
            .where(eq(schema.orders.id, orderId));

          const [updated] = await db
            .select({
              id: schema.orders.id,
              userId: schema.orders.userId,
              totalCents: schema.orders.totalCents,
              status: schema.orders.status,
              createdAt: schema.orders.createdAt,
              promoCode: schema.orders.promoCode,
              discount: schema.orders.discount,
              deliveryAddressId: schema.orders.deliveryAddressId,
              userEmail: schema.user.email,
              userName: schema.user.name,
            })
            .from(schema.orders)
            .innerJoin(schema.user, eq(schema.orders.userId, schema.user.id))
            .where(eq(schema.orders.id, orderId));

          return {
            id: updated.id,
            userId: updated.userId,
            userEmail: updated.userEmail,
            userName: updated.userName,
            status: updated.status,
            createdAt: updated.createdAt.toISOString(),
            total: fromCents(updated.totalCents),
            totalCents: updated.totalCents,
            promoCode: updated.promoCode ?? null,
            discount: typeof updated.discount === 'number' ? updated.discount : 0,
            deliveryAddressId: updated.deliveryAddressId,
            previousStatus: existing.status,
          };
        },
        {
          body: t.Object({
            status: t.Union([
              t.Literal('pending'),
              t.Literal('in_progress'),
              t.Literal('delivered'),
            ]),
          }),
        },
      )

      // ═══════════════════════════════════════════════════════════════════
      // MENU ITEMS
      // ═══════════════════════════════════════════════════════════════════

      .get('/menu', async () => {
        const db = getDb();
        const items = await db
          .select()
          .from(schema.menuItems)
          .orderBy(schema.menuItems.category, schema.menuItems.id);

        const ids = items.map((it) => it.id);
        const summaries = await ratingSummariesForMenuIds(ids);

        return items.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          price: it.price,
          imageUrl: it.imageUrl,
          category: it.category,
          rating: summaries.get(it.id) ?? { menuId: it.id, average: 0, count: 0 },
        }));
      })

      .post(
        '/menu',
        async ({ body }) => {
          const { name, description, price, imageUrl, category } = body;

          if (typeof name !== 'string' || !name.trim()) {
            throw new HttpError(400, 'INVALID_NAME', 'Name is required');
          }
          if (typeof price !== 'number' || price <= 0) {
            throw new HttpError(400, 'INVALID_PRICE', 'Price must be a positive number');
          }
          if (typeof category !== 'string' || !category.trim()) {
            throw new HttpError(400, 'INVALID_CATEGORY', 'Category is required');
          }

          const db = getDb();
          const [item] = await db
            .insert(schema.menuItems)
            .values({
              name: name.trim(),
              description: typeof description === 'string' ? description.trim() : '',
              price,
              imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
              category: category.trim(),
            })
            .returning();

          return new Response(JSON.stringify(item), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            description: t.Optional(t.String()),
            price: t.Number(),
            imageUrl: t.Optional(t.String()),
            category: t.String({ minLength: 1 }),
          }),
        },
      )

      .patch(
        '/menu/:id',
        async ({ params, body }) => {
          const id = Number(params.id);
          if (!Number.isInteger(id) || id <= 0) {
            throw new HttpError(400, 'INVALID_ID', 'Invalid menu item id');
          }

          const db = getDb();
          const [existing] = await db
            .select()
            .from(schema.menuItems)
            .where(eq(schema.menuItems.id, id));

          if (!existing) throw new HttpError(404, 'MENU_NOT_FOUND', 'Menu item not found');

          const updates: Record<string, unknown> = {};
          if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
          if (body.description !== undefined) updates.description = String(body.description);
          if (typeof body.price === 'number' && body.price > 0) updates.price = body.price;
          if (body.imageUrl !== undefined) updates.imageUrl = String(body.imageUrl);
          if (typeof body.category === 'string' && body.category.trim()) updates.category = body.category.trim();

          if (Object.keys(updates).length === 0) {
            throw new HttpError(400, 'NO_UPDATES', 'No valid fields to update');
          }

          await db
            .update(schema.menuItems)
            .set(updates as any)
            .where(eq(schema.menuItems.id, id));

          const [updated] = await db
            .select()
            .from(schema.menuItems)
            .where(eq(schema.menuItems.id, id));

          return updated;
        },
        {
          body: t.Object({
            name: t.Optional(t.String()),
            description: t.Optional(t.String()),
            price: t.Optional(t.Number()),
            imageUrl: t.Optional(t.String()),
            category: t.Optional(t.String()),
          }),
        },
      )

      .delete('/menu/:id', async ({ params }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) {
          throw new HttpError(400, 'INVALID_ID', 'Invalid menu item id');
        }

        const db = getDb();
        const [existing] = await db
          .select({ id: schema.menuItems.id })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.id, id));

        if (!existing) throw new HttpError(404, 'MENU_NOT_FOUND', 'Menu item not found');

        // Check if item is referenced in any order_items
        const [usageRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orderItems)
          .where(eq(schema.orderItems.menuId, id));

        const usageCount = Number(usageRow.n);
        if (usageCount > 0) {
          throw new HttpError(
            409,
            'MENU_IN_USE',
            `Cannot delete: menu item is referenced in ${usageCount} order(s). Remove those orders first.`,
          );
        }

        // ratings cascade via FK onDelete: 'cascade'
        await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id));

        return { ok: true, deleted: id };
      })

      // ═══════════════════════════════════════════════════════════════════
      // PROMOS
      // ═══════════════════════════════════════════════════════════════════

      .get('/promos', async () => {
        const db = getDb();
        const rows = await db
          .select({
            code: schema.promos.code,
            discount: schema.promos.discount,
            description: schema.promos.description,
            expiresAt: schema.promos.expiresAt,
            maxUses: schema.promos.maxUses,
            maxPerUser: schema.promos.maxPerUser,
            firstOrderOnly: schema.promos.firstOrderOnly,
          })
          .from(schema.promos)
          .orderBy(asc(schema.promos.code));

        // Attach usage count per promo
        const enriched = await Promise.all(
          rows.map(async (p) => {
            const [row] = await db
              .select({ n: sql<number>`count(*)::int` })
              .from(schema.orders)
              .where(eq(schema.orders.promoCode, p.code));

            return {
              ...p,
              expiresAt: p.expiresAt?.toISOString() ?? null,
              firstOrderOnly: Boolean(p.firstOrderOnly),
              useCount: Number(row.n),
            };
          }),
        );

        return enriched;
      })

      .post(
        '/promos',
        async ({ body }) => {
          const { code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly } =
            body;

          if (typeof code !== 'string' || !code.trim()) {
            throw new HttpError(400, 'INVALID_CODE', 'Promo code is required');
          }
          if (typeof discount !== 'number' || discount <= 0 || discount > 1) {
            throw new HttpError(400, 'INVALID_DISCOUNT', 'Discount must be between 0 and 1');
          }

          const key = code.trim().toUpperCase();
          const db = getDb();

          const [exists] = await db
            .select({ code: schema.promos.code })
            .from(schema.promos)
            .where(eq(schema.promos.code, key));

          if (exists) {
            throw new HttpError(409, 'PROMO_EXISTS', `Promo code ${key} already exists`);
          }

          await db.insert(schema.promos).values({
            code: key,
            discount,
            description: typeof description === 'string' ? description.trim() : '',
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxUses: maxUses ?? null,
            maxPerUser: maxPerUser ?? null,
            firstOrderOnly: firstOrderOnly ? 1 : 0,
          });

          const [promo] = await db
            .select({
              code: schema.promos.code,
              discount: schema.promos.discount,
              description: schema.promos.description,
              expiresAt: schema.promos.expiresAt,
              maxUses: schema.promos.maxUses,
              maxPerUser: schema.promos.maxPerUser,
              firstOrderOnly: schema.promos.firstOrderOnly,
            })
            .from(schema.promos)
            .where(eq(schema.promos.code, key));

          return new Response(
            JSON.stringify({
              ...promo,
              expiresAt: promo.expiresAt?.toISOString() ?? null,
              firstOrderOnly: Boolean(promo.firstOrderOnly),
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        },
        {
          body: t.Object({
            code: t.String({ minLength: 1 }),
            discount: t.Number(),
            description: t.Optional(t.String()),
            expiresAt: t.Optional(t.String()),
            maxUses: t.Optional(t.Number()),
            maxPerUser: t.Optional(t.Number()),
            firstOrderOnly: t.Optional(t.Boolean()),
          }),
        },
      )

      .delete('/promos/:code', async ({ params }) => {
        const code = params.code.toUpperCase();
        const db = getDb();

        const [exists] = await db
          .select({ code: schema.promos.code })
          .from(schema.promos)
          .where(eq(schema.promos.code, code));

        if (!exists) throw new HttpError(404, 'PROMO_NOT_FOUND', 'Promo not found');

        await db.delete(schema.promos).where(eq(schema.promos.code, code));

        return { ok: true, deleted: code };
      })

      // ═══════════════════════════════════════════════════════════════════
      // RATINGS
      // ═══════════════════════════════════════════════════════════════════

      .get('/ratings', async ({ query }) => {
        const db = getDb();
        const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
        const offset = Math.max(Number(query.offset) || 0, 0);

        const ratings = await db
          .select({
            id: schema.ratings.id,
            userId: schema.ratings.userId,
            menuId: schema.ratings.menuId,
            stars: schema.ratings.stars,
            review: schema.ratings.review,
            createdAt: schema.ratings.createdAt,
            userName: schema.user.name,
            userEmail: schema.user.email,
            menuName: schema.menuItems.name,
          })
          .from(schema.ratings)
          .innerJoin(schema.user, eq(schema.ratings.userId, schema.user.id))
          .innerJoin(schema.menuItems, eq(schema.ratings.menuId, schema.menuItems.id))
          .orderBy(desc(schema.ratings.createdAt))
          .limit(limit)
          .offset(offset);

        const [totalRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.ratings);

        return {
          ratings: ratings.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          })),
          total: Number(totalRow.n),
          limit,
          offset,
        };
      })

      // Delete a rating
      .delete('/ratings/:id', async ({ params }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) {
          throw new HttpError(400, 'INVALID_ID', 'Invalid rating id');
        }

        const db = getDb();
        const [existing] = await db
          .select({ id: schema.ratings.id })
          .from(schema.ratings)
          .where(eq(schema.ratings.id, id));

        if (!existing) throw new HttpError(404, 'RATING_NOT_FOUND', 'Rating not found');

        await db.delete(schema.ratings).where(eq(schema.ratings.id, id));

        return { ok: true, deleted: id };
      });
