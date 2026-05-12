import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { lookupPromo } from './promoService';
import { toCents, fromCents, applyDiscountCents } from '../lib/money';
import { HttpError } from '../lib/errors';
import { config } from '../config';

const VALID_STATUSES = ['pending', 'in_progress', 'delivered'] as const;
const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'delivered',
};

const AUTO_ADVANCE_STEP_MS = 5_000;

function scheduleAutoAdvance(orderId: number, createdAt: Date = new Date()) {
  if (!config.autoAdvanceOrders) return;
  const db = getDb();
  const ageMs = Date.now() - createdAt.getTime();

  const advance = (from: string, to: string) => async () => {
    try {
      await db
        .update(schema.orders)
        .set({ status: to })
        .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, from)));
    } catch (err) {
      console.error(`auto-advance ${orderId} ${from}->${to} failed:`, err);
    }
  };

  const delay1 = Math.max(0, AUTO_ADVANCE_STEP_MS - ageMs);
  const delay2 = Math.max(0, AUTO_ADVANCE_STEP_MS * 2 - ageMs);

  setTimeout(advance('pending', 'in_progress'), delay1).unref();
  setTimeout(advance('in_progress', 'delivered'), delay2).unref();
}

/**
 * On startup, catch up any orders still pending/in_progress:
 * - Fully aged orders (older than the second tick) → set to 'delivered' immediately.
 * - Mid-cycle orders → schedule the remaining timer.
 */
export async function resumeAutoAdvance() {
  if (!config.autoAdvanceOrders) return;
  const db = getDb();
  // Age check in SQL avoids Node/pg timezone parsing for `timestamp without tz`.
  const totalMs = AUTO_ADVANCE_STEP_MS * 2;
  const finalized = await db.execute(
    sql`update orders
        set status = 'delivered'
        where status in ('pending', 'in_progress')
          and now() - created_at > make_interval(secs => ${totalMs / 1000})
        returning id`,
  );
  if (finalized.rowCount && finalized.rowCount > 0) {
    console.log(`[auto-advance] finalized ${finalized.rowCount} stuck orders on startup`);
  }
}

interface CreateOrderInput {
  userId: string;
  items: { menuId: number; qty: number }[];
  promoCode?: string;
  paymentMethod?: string;
  delivery: { name: string; address: string; phone: string };
}

export async function createOrder(input: CreateOrderInput) {
  const { userId, items, promoCode, paymentMethod, delivery } = input;

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'ORDER_ITEMS_REQUIRED', 'Order must contain at least one item');
  }

  // Validate delivery
  if (!delivery || typeof delivery !== 'object') {
    throw new HttpError(400, 'DELIVERY_REQUIRED', 'Delivery details are required');
  }
  if (!delivery.name?.trim()) throw new HttpError(400, 'DELIVERY_NAME_REQUIRED', 'Delivery name is required');
  if (!delivery.address?.trim()) throw new HttpError(400, 'DELIVERY_ADDRESS_REQUIRED', 'Delivery address is required');
  if (!delivery.phone?.trim()) throw new HttpError(400, 'DELIVERY_PHONE_REQUIRED', 'Delivery phone is required');

  const db = getDb();

  // Check promo
  let appliedPromo: string | null = null;
  let discountFraction = 0;
  if (promoCode !== undefined && promoCode !== null && promoCode !== '') {
    const promo = await lookupPromo(promoCode, { userId });
    if (!promo) throw new HttpError(400, 'PROMO_INVALID', 'Promo code is invalid');
    appliedPromo = promo.code;
    discountFraction = promo.discount;
  }

  // Resolve menu items and calculate subtotal
  let subtotalCents = 0;
  const resolvedItems: { menuId: number; qty: number; priceAtOrder: number }[] = [];

  for (const it of items) {
    if (!Number.isInteger(it.menuId) || it.menuId <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_MENU', 'Invalid menuId in items');
    }
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_QTY', 'Invalid qty in items');
    }
    const [menuRow] = await db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.id, it.menuId));
    if (!menuRow) {
      throw new HttpError(400, 'MENU_ITEM_NOT_FOUND', `Menu item ${it.menuId} not found`);
    }
    const priceCents = toCents(menuRow.price);
    subtotalCents += priceCents * it.qty;
    resolvedItems.push({ menuId: menuRow.id, qty: it.qty, priceAtOrder: menuRow.price });
  }

  const totalCents = applyDiscountCents(subtotalCents, discountFraction);

  // Insert delivery address
  const [addr] = await db
    .insert(schema.deliveryAddresses)
    .values({
      userId,
      name: delivery.name.trim(),
      address: delivery.address.trim(),
      phone: delivery.phone.trim(),
    })
    .returning();

  // Insert order
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      totalCents,
      status: 'pending',
      promoCode: appliedPromo,
      discount: discountFraction,
      deliveryAddressId: addr.id,
      paymentMethod: paymentMethod ?? null,
    })
    .returning();

  // Insert order items
  for (const ri of resolvedItems) {
    await db.insert(schema.orderItems).values({
      orderId: order.id,
      menuId: ri.menuId,
      qty: ri.qty,
      priceAtOrder: ri.priceAtOrder,
    });
  }

  // Fetch hydrated order
  const itemsResult = await db
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
    .where(eq(schema.orderItems.orderId, order.id));

  scheduleAutoAdvance(order.id);

  return {
    orderId: order.id,
    total: fromCents(order.totalCents),
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    promoCode: order.promoCode ?? null,
    discount: order.discount ?? 0,
    paymentMethod: order.paymentMethod ?? null,
    items: itemsResult.map((it) => ({
      id: it.id,
      menuId: it.menuId,
      qty: it.qty,
      priceAtOrder: it.priceAtOrder,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      category: it.category,
    })),
    delivery: {
      name: delivery.name.trim(),
      address: delivery.address.trim(),
      phone: delivery.phone.trim(),
    },
  };
}

export async function listOrders(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(sql`${schema.orders.createdAt} desc`);

  // Fetch items and delivery for each order
  const result = [];
  for (const order of rows) {
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
      .where(eq(schema.orderItems.orderId, order.id));

    let delivery = null;
    if (order.deliveryAddressId) {
      const [addr] = await db
        .select({ name: schema.deliveryAddresses.name, address: schema.deliveryAddresses.address, phone: schema.deliveryAddresses.phone })
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, order.deliveryAddressId));
      if (addr) delivery = addr;
    }

    result.push({
      id: order.id,
      userId: order.userId,
      total: fromCents(order.totalCents),
      totalCents: order.totalCents,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      promoCode: order.promoCode ?? null,
      discount: order.discount ?? 0,
      paymentMethod: order.paymentMethod ?? null,
      items: items.map((it) => ({
        id: it.id,
        menuId: it.menuId,
        qty: it.qty,
        priceAtOrder: it.priceAtOrder,
        name: it.name,
        description: it.description,
        imageUrl: it.imageUrl,
        category: it.category,
      })),
      delivery,
    });
  }
  return result;
}

export async function getOrder(userId: string, orderId: string | number) {
  if (!orderId) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

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
  if (order.deliveryAddressId) {
    const [addr] = await db
      .select({ name: schema.deliveryAddresses.name, address: schema.deliveryAddresses.address, phone: schema.deliveryAddresses.phone })
      .from(schema.deliveryAddresses)
      .where(eq(schema.deliveryAddresses.id, order.deliveryAddressId));
    if (addr) delivery = addr;
  }

  return {
    id: order.id,
    userId: order.userId,
    total: fromCents(order.totalCents),
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    promoCode: order.promoCode ?? null,
    discount: order.discount ?? 0,
    paymentMethod: order.paymentMethod ?? null,
    items: items.map((it) => ({
      id: it.id,
      menuId: it.menuId,
      qty: it.qty,
      priceAtOrder: it.priceAtOrder,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      category: it.category,
    })),
    delivery,
  };
}

export async function updateOrderStatus(userId: string, orderId: string | number, status: string) {
  if (!orderId) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  if (!VALID_STATUSES.includes(status as any)) {
    throw new HttpError(400, 'ORDER_STATUS_INVALID', 'Invalid status value');
  }

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const expectedNext = NEXT_STATUS[order.status];
  if (!expectedNext || expectedNext !== status) {
    throw new HttpError(
      400,
      'ORDER_STATUS_TRANSITION_INVALID',
      `Cannot transition order from ${order.status} to ${status}`,
    );
  }

  await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, orderId));

  return getOrder(userId, orderId);
}
