'use strict';

const { getDb } = require('../db');
const { lookupPromo } = require('./promoService');
const { toCents, fromCents, applyDiscountCents } = require('../lib/money');
const { HttpError } = require('../lib/asyncHandler');
const config = require('../config');
const logger = require('../lib/logger');

const VALID_STATUSES = ['pending', 'in_progress', 'delivered'];
const NEXT_STATUS = { pending: 'in_progress', in_progress: 'delivered' };

// Map<orderId, { toInProgress?: NodeJS.Timeout, toDelivered?: NodeJS.Timeout }>
const autoAdvanceTimers = new Map();

function hydrateOrderRow(db, order) {
  const items = db
    .prepare(
      `SELECT oi.id, oi.menuId, oi.qty, oi.priceAtOrder,
              m.name, m.description, m.imageUrl, m.category
         FROM order_items oi
         JOIN menu_items m ON m.id = oi.menuId
        WHERE oi.orderId = ?`,
    )
    .all(order.id);

  let delivery = null;
  if (order.deliveryAddressId) {
    const addr = db
      .prepare('SELECT name, address, phone FROM delivery_addresses WHERE id = ?')
      .get(order.deliveryAddressId);
    if (addr) delivery = addr;
  }

  const totalCents = Number.isInteger(order.totalCents) ? order.totalCents : toCents(order.total);

  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    createdAt: order.createdAt,
    total: fromCents(totalCents),
    totalCents,
    promoCode: order.promoCode || null,
    discount: typeof order.discount === 'number' ? order.discount : 0,
    items,
    delivery,
  };
}

function validateItemsPayload(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'ORDER_ITEMS_REQUIRED', 'Order must contain at least one item');
  }
  const normalized = [];
  for (const it of items) {
    const menuId = Number(it && it.menuId);
    const qty = Number(it && it.qty);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_MENU', 'Invalid menuId in items');
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new HttpError(400, 'ORDER_ITEM_INVALID_QTY', 'Invalid qty in items');
    }
    normalized.push({ menuId, qty });
  }
  return normalized;
}

function validateDelivery(delivery) {
  if (!delivery || typeof delivery !== 'object') {
    throw new HttpError(400, 'DELIVERY_REQUIRED', 'Delivery details are required');
  }
  const name = typeof delivery.name === 'string' ? delivery.name.trim() : '';
  const address = typeof delivery.address === 'string' ? delivery.address.trim() : '';
  const phone = typeof delivery.phone === 'string' ? delivery.phone.trim() : '';
  if (!name) throw new HttpError(400, 'DELIVERY_NAME_REQUIRED', 'Delivery name is required');
  if (!address)
    throw new HttpError(400, 'DELIVERY_ADDRESS_REQUIRED', 'Delivery address is required');
  if (!phone) throw new HttpError(400, 'DELIVERY_PHONE_REQUIRED', 'Delivery phone is required');
  return { name, address, phone };
}

function createOrder({ userId, items, promoCode, delivery }) {
  const db = getDb();
  const normalizedItems = validateItemsPayload(items);
  const deliveryInfo = validateDelivery(delivery);

  let appliedPromo = null;
  let discountFraction = 0;
  if (promoCode !== undefined && promoCode !== null && promoCode !== '') {
    const promo = lookupPromo(promoCode, { userId });
    if (!promo) {
      throw new HttpError(400, 'PROMO_INVALID', 'Promo code is invalid');
    }
    appliedPromo = promo.code;
    discountFraction = promo.discount;
  }

  const tx = db.transaction(() => {
    const placeholders = normalizedItems.map(() => '?').join(',');
    const ids = normalizedItems.map((it) => it.menuId);
    const menuRows = db
      .prepare(`SELECT id, price, name FROM menu_items WHERE id IN (${placeholders})`)
      .all(...ids);
    const menuMap = new Map(menuRows.map((r) => [r.id, r]));
    for (const it of normalizedItems) {
      if (!menuMap.has(it.menuId)) {
        throw new HttpError(400, 'MENU_ITEM_NOT_FOUND', `Menu item ${it.menuId} not found`);
      }
    }

    let subtotalCents = 0;
    const resolvedItems = [];
    for (const it of normalizedItems) {
      const menu = menuMap.get(it.menuId);
      const priceCents = toCents(menu.price);
      subtotalCents += priceCents * it.qty;
      resolvedItems.push({
        menuId: menu.id,
        qty: it.qty,
        priceAtOrder: menu.price,
      });
    }
    const totalCents = applyDiscountCents(subtotalCents, discountFraction);
    const totalDollars = fromCents(totalCents);

    const addrInfo = db
      .prepare('INSERT INTO delivery_addresses (userId, name, address, phone) VALUES (?, ?, ?, ?)')
      .run(userId, deliveryInfo.name, deliveryInfo.address, deliveryInfo.phone);
    const deliveryAddressId = addrInfo.lastInsertRowid;

    const info = db
      .prepare(
        `INSERT INTO orders (userId, total, totalCents, status, promoCode, discount, deliveryAddressId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        totalDollars,
        totalCents,
        'pending',
        appliedPromo,
        discountFraction,
        deliveryAddressId,
      );
    const orderId = info.lastInsertRowid;

    const itemStmt = db.prepare(
      'INSERT INTO order_items (orderId, menuId, qty, priceAtOrder) VALUES (?, ?, ?, ?)',
    );
    for (const ri of resolvedItems) {
      itemStmt.run(orderId, ri.menuId, ri.qty, ri.priceAtOrder);
    }
    return orderId;
  });
  const orderId = tx();

  // Auto-advance (config-gated, never in tests).
  if (config.autoAdvanceOrders && config.env !== 'test') {
    scheduleAutoAdvance(orderId);
  }

  const row = db
    .prepare(
      `SELECT id, userId, total, totalCents, status, createdAt, promoCode, discount, deliveryAddressId
         FROM orders WHERE id = ?`,
    )
    .get(orderId);
  return hydrateOrderRow(db, row);
}

function scheduleAutoAdvance(orderId) {
  const handles = {};
  handles.toInProgress =
    setTimeout(() => {
      try {
        const db = getDb();
        db.prepare(
          "UPDATE orders SET status = 'in_progress' WHERE id = ? AND status = 'pending'",
        ).run(orderId);
        logger.info(
          { op: 'order.auto_advance', orderId, to: 'in_progress' },
          'order auto-advanced',
        );
      } catch (err) {
        logger.error({ err, op: 'order.auto_advance', orderId }, 'auto-advance failed');
      }
    }, 30_000).unref?.() ?? handles.toInProgress;
  handles.toDelivered =
    setTimeout(() => {
      try {
        const db = getDb();
        db.prepare(
          "UPDATE orders SET status = 'delivered' WHERE id = ? AND status = 'in_progress'",
        ).run(orderId);
        logger.info({ op: 'order.auto_advance', orderId, to: 'delivered' }, 'order auto-advanced');
      } catch (err) {
        logger.error({ err, op: 'order.auto_advance', orderId }, 'auto-advance failed');
      } finally {
        autoAdvanceTimers.delete(orderId);
      }
    }, 90_000).unref?.() ?? handles.toDelivered;
  autoAdvanceTimers.set(orderId, handles);
}

function cancelAutoAdvance(orderId) {
  const h = autoAdvanceTimers.get(orderId);
  if (!h) return;
  if (h.toInProgress) clearTimeout(h.toInProgress);
  if (h.toDelivered) clearTimeout(h.toDelivered);
  autoAdvanceTimers.delete(orderId);
}

function cancelAllAutoAdvance() {
  for (const id of Array.from(autoAdvanceTimers.keys())) {
    cancelAutoAdvance(id);
  }
}

function listOrders({ userId }) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.id, o.userId, o.total, o.totalCents, o.status, o.createdAt,
              o.promoCode, o.discount, o.deliveryAddressId,
              oi.id AS itemId, oi.menuId, oi.qty, oi.priceAtOrder,
              m.name, m.description, m.imageUrl, m.category
         FROM orders o
         LEFT JOIN order_items oi ON oi.orderId = o.id
         LEFT JOIN menu_items m ON m.id = oi.menuId
        WHERE o.userId = ?
        ORDER BY o.createdAt DESC, o.id DESC`,
    )
    .all(userId);

  const ordersById = new Map();
  for (const r of rows) {
    if (!ordersById.has(r.id)) {
      const totalCents = Number.isInteger(r.totalCents) ? r.totalCents : toCents(r.total);
      ordersById.set(r.id, {
        id: r.id,
        userId: r.userId,
        status: r.status,
        createdAt: r.createdAt,
        total: fromCents(totalCents),
        totalCents,
        promoCode: r.promoCode || null,
        discount: typeof r.discount === 'number' ? r.discount : 0,
        deliveryAddressId: r.deliveryAddressId,
        items: [],
        delivery: null,
      });
    }
    if (r.itemId) {
      ordersById.get(r.id).items.push({
        id: r.itemId,
        menuId: r.menuId,
        qty: r.qty,
        priceAtOrder: r.priceAtOrder,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        category: r.category,
      });
    }
  }

  const addrIds = [...ordersById.values()]
    .map((o) => o.deliveryAddressId)
    .filter((x) => Number.isInteger(x));
  if (addrIds.length > 0) {
    const placeholders = addrIds.map(() => '?').join(',');
    const addrs = db
      .prepare(
        `SELECT id, name, address, phone FROM delivery_addresses WHERE id IN (${placeholders})`,
      )
      .all(...addrIds);
    const addrMap = new Map(addrs.map((a) => [a.id, a]));
    for (const o of ordersById.values()) {
      if (o.deliveryAddressId && addrMap.has(o.deliveryAddressId)) {
        const a = addrMap.get(o.deliveryAddressId);
        o.delivery = { name: a.name, address: a.address, phone: a.phone };
      }
    }
  }

  return [...ordersById.values()].map((o) => {
    const { deliveryAddressId, ...rest } = o;
    return rest;
  });
}

function getOrder({ userId, orderId }) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, userId, total, totalCents, status, createdAt, promoCode, discount, deliveryAddressId
         FROM orders WHERE id = ?`,
    )
    .get(orderId);
  if (!row || row.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return hydrateOrderRow(db, row);
}

function updateStatus({ userId, orderId, status }) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new HttpError(400, 'ORDER_STATUS_INVALID', 'Invalid status value');
  }
  const db = getDb();
  const row = db.prepare('SELECT id, userId, status FROM orders WHERE id = ?').get(orderId);
  if (!row || row.userId !== userId) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  const expectedNext = NEXT_STATUS[row.status];
  if (!expectedNext || expectedNext !== status) {
    throw new HttpError(
      400,
      'ORDER_STATUS_TRANSITION_INVALID',
      `Cannot transition order from ${row.status} to ${status}`,
    );
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
  const updated = db
    .prepare(
      `SELECT id, userId, total, totalCents, status, createdAt, promoCode, discount, deliveryAddressId
         FROM orders WHERE id = ?`,
    )
    .get(orderId);
  return hydrateOrderRow(db, updated);
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateStatus,
  hydrateOrderRow,
  cancelAutoAdvance,
  cancelAllAutoAdvance,
  autoAdvanceTimers,
};
