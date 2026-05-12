'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireManageAuth } = require('../middleware/manageAuth');
const { asyncHandler, HttpError } = require('../lib/asyncHandler');
const { toCents, fromCents, applyDiscountCents, formatMoney } = require('../lib/money');
const ratingService = require('../services/ratingService');
const config = require('../config');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════
// All management routes require the manage password.
// ═══════════════════════════════════════════════════════════════════════
router.use(requireManageAuth);

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD — overview stats
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const orderCount = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
    const menuCount = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n;
    const promoCount = db.prepare('SELECT COUNT(*) AS n FROM promos').get().n;
    const ratingCount = db.prepare('SELECT COUNT(*) AS n FROM ratings').get().n;

    const revenue = db
      .prepare(
        "SELECT COALESCE(SUM(totalCents), 0) AS total FROM orders WHERE status != 'pending'",
      )
      .get().total;

    const pendingOrders = db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'").get().n;
    const inProgressOrders = db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'in_progress'").get().n;
    const deliveredOrders = db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'delivered'").get().n;

    return res.json({
      ok: true,
      stats: {
        users: userCount,
        orders: orderCount,
        menuItems: menuCount,
        promos: promoCount,
        ratings: ratingCount,
        revenue: fromCents(revenue),
        revenueCents: revenue,
        ordersByStatus: {
          pending: pendingOrders,
          in_progress: inProgressOrders,
          delivered: deliveredOrders,
        },
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════

// List all users
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const users = db
      .prepare('SELECT id, email, name, createdAt FROM users ORDER BY id DESC')
      .all();

    // Attach order counts
    const enriched = users.map((u) => {
      const { n } = db
        .prepare('SELECT COUNT(*) AS n FROM orders WHERE userId = ?')
        .get(u.id);
      return { ...u, orderCount: n };
    });

    return res.json(enriched);
  }),
);

// Get single user with their orders
router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid user id');
    }
    const user = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(id);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

    const orders = db
      .prepare(
        `SELECT id, total, totalCents, status, createdAt, promoCode, discount, deliveryAddressId
         FROM orders WHERE userId = ? ORDER BY createdAt DESC`,
      )
      .all(id);

    const enrichedOrders = orders.map((o) => {
      const items = db
        .prepare(
          `SELECT oi.id, oi.menuId, oi.qty, oi.priceAtOrder,
                  m.name, m.description, m.imageUrl, m.category
           FROM order_items oi
           JOIN menu_items m ON m.id = oi.menuId
           WHERE oi.orderId = ?`,
        )
        .all(o.id);

      let delivery = null;
      if (o.deliveryAddressId) {
        const addr = db
          .prepare('SELECT name, address, phone FROM delivery_addresses WHERE id = ?')
          .get(o.deliveryAddressId);
        if (addr) delivery = addr;
      }

      const totalCents = Number.isInteger(o.totalCents) ? o.totalCents : toCents(o.total);
      return {
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        total: fromCents(totalCents),
        totalCents,
        promoCode: o.promoCode || null,
        discount: typeof o.discount === 'number' ? o.discount : 0,
        items,
        delivery,
      };
    });

    return res.json({ ...user, orders: enrichedOrders });
  }),
);

// Delete user (cascades to orders, ratings, etc.)
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid user id');
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

    // Delete related data in order (ratings cascade via FK, orders cascade items via FK)
    db.prepare('DELETE FROM delivery_addresses WHERE userId = ?').run(id);
    db.prepare('DELETE FROM ratings WHERE userId = ?').run(id);
    db.prepare('DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE userId = ?)').run(id);
    db.prepare('DELETE FROM orders WHERE userId = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return res.json({ ok: true, deleted: id });
  }),
);

// ═══════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════

// List all orders (across all users)
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const status = req.query.status;
    let rows;
    if (status && ['pending', 'in_progress', 'delivered'].includes(status)) {
      rows = db
        .prepare(
          `SELECT o.id, o.userId, o.total, o.totalCents, o.status, o.createdAt,
                  o.promoCode, o.discount, o.deliveryAddressId,
                  u.email AS userEmail, u.name AS userName
           FROM orders o
           JOIN users u ON u.id = o.userId
           WHERE o.status = ?
           ORDER BY o.createdAt DESC`,
        )
        .all(status);
    } else {
      rows = db
        .prepare(
          `SELECT o.id, o.userId, o.total, o.totalCents, o.status, o.createdAt,
                  o.promoCode, o.discount, o.deliveryAddressId,
                  u.email AS userEmail, u.name AS userName
           FROM orders o
           JOIN users u ON u.id = o.userId
           ORDER BY o.createdAt DESC`,
        )
        .all();
    }

    const enriched = rows.map((o) => {
      const items = db
        .prepare(
          `SELECT oi.id, oi.menuId, oi.qty, oi.priceAtOrder,
                  m.name, m.imageUrl
           FROM order_items oi
           JOIN menu_items m ON m.id = oi.menuId
           WHERE oi.orderId = ?`,
        )
        .all(o.id);

      let delivery = null;
      if (o.deliveryAddressId) {
        const addr = db
          .prepare('SELECT name, address, phone FROM delivery_addresses WHERE id = ?')
          .get(o.deliveryAddressId);
        if (addr) delivery = addr;
      }

      const totalCents = Number.isInteger(o.totalCents) ? o.totalCents : toCents(o.total);
      return {
        id: o.id,
        userId: o.userId,
        userEmail: o.userEmail,
        userName: o.userName,
        status: o.status,
        createdAt: o.createdAt,
        total: fromCents(totalCents),
        totalCents,
        promoCode: o.promoCode || null,
        discount: typeof o.discount === 'number' ? o.discount : 0,
        items,
        delivery,
      };
    });

    return res.json(enriched);
  }),
);

// Get single order (admin — any user)
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid order id');
    }

    const o = db
      .prepare(
        `SELECT o.id, o.userId, o.total, o.totalCents, o.status, o.createdAt,
                o.promoCode, o.discount, o.deliveryAddressId,
                u.email AS userEmail, u.name AS userName
         FROM orders o
         JOIN users u ON u.id = o.userId
         WHERE o.id = ?`,
      )
      .get(id);
    if (!o) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');

    const items = db
      .prepare(
        `SELECT oi.id, oi.menuId, oi.qty, oi.priceAtOrder,
                m.name, m.description, m.imageUrl, m.category
         FROM order_items oi
         JOIN menu_items m ON m.id = oi.menuId
         WHERE oi.orderId = ?`,
      )
      .all(o.id);

    let delivery = null;
    if (o.deliveryAddressId) {
      const addr = db
        .prepare('SELECT name, address, phone FROM delivery_addresses WHERE id = ?')
        .get(o.deliveryAddressId);
      if (addr) delivery = addr;
    }

    const totalCents = Number.isInteger(o.totalCents) ? o.totalCents : toCents(o.total);
    return res.json({
      id: o.id,
      userId: o.userId,
      userEmail: o.userEmail,
      userName: o.userName,
      status: o.status,
      createdAt: o.createdAt,
      total: fromCents(totalCents),
      totalCents,
      promoCode: o.promoCode || null,
      discount: typeof o.discount === 'number' ? o.discount : 0,
      items,
      delivery,
    });
  }),
);

// Update order status (admin — any transition allowed, unlike user-facing API)
router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    const { status } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid order id');
    }
    if (!['pending', 'in_progress', 'delivered'].includes(status)) {
      throw new HttpError(
        400,
        'INVALID_STATUS',
        'Status must be: pending, in_progress, or delivered',
      );
    }

    const existing = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);

    const updated = db
      .prepare(
        `SELECT o.id, o.userId, o.total, o.totalCents, o.status, o.createdAt,
                o.promoCode, o.discount, o.deliveryAddressId,
                u.email AS userEmail, u.name AS userName
         FROM orders o
         JOIN users u ON u.id = o.userId
         WHERE o.id = ?`,
      )
      .get(id);

    return res.json({
      ...updated,
      previousStatus: existing.status,
      total: fromCents(
        Number.isInteger(updated.totalCents) ? updated.totalCents : toCents(updated.total),
      ),
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/menu',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const items = db
      .prepare(
        'SELECT id, name, description, price, imageUrl, category FROM menu_items ORDER BY category, id',
      )
      .all();

    const ids = items.map((it) => it.id);
    const summaries = ratingService.getSummariesForMenuIds(ids);
    const enriched = items.map((it) => ({
      ...it,
      rating: summaries.get(it.id) || { menuId: it.id, average: 0, count: 0 },
    }));

    return res.json(enriched);
  }),
);

router.post(
  '/menu',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { name, description, price, imageUrl, category } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 'INVALID_NAME', 'Name is required');
    }
    if (typeof price !== 'number' || price <= 0) {
      throw new HttpError(400, 'INVALID_PRICE', 'Price must be a positive number');
    }
    if (typeof category !== 'string' || !category.trim()) {
      throw new HttpError(400, 'INVALID_CATEGORY', 'Category is required');
    }

    const info = db
      .prepare(
        'INSERT INTO menu_items (name, description, price, imageUrl, category) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        name.trim(),
        typeof description === 'string' ? description.trim() : '',
        price,
        typeof imageUrl === 'string' ? imageUrl.trim() : '',
        category.trim(),
      );

    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(item);
  }),
);

router.patch(
  '/menu/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid menu item id');
    }

    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'MENU_NOT_FOUND', 'Menu item not found');

    const { name, description, price, imageUrl, category } = req.body || {};
    const updates = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = String(description);
    if (typeof price === 'number' && price > 0) updates.price = price;
    if (imageUrl !== undefined) updates.imageUrl = String(imageUrl);
    if (typeof category === 'string' && category.trim()) updates.category = category.trim();

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'NO_UPDATES', 'No valid fields to update');
    }

    const fields = Object.keys(updates)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE menu_items SET ${fields} WHERE id = ?`).run(...values, id);

    const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    return res.json(updated);
  }),
);

router.delete(
  '/menu/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid menu item id');
    }

    const existing = db.prepare('SELECT id FROM menu_items WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'MENU_NOT_FOUND', 'Menu item not found');

    // Check if item is referenced in any order_items
    const { n } = db
      .prepare('SELECT COUNT(*) AS n FROM order_items WHERE menuId = ?')
      .get(id);
    if (n > 0) {
      throw new HttpError(
        409,
        'MENU_IN_USE',
        `Cannot delete: menu item is referenced in ${n} order(s). Remove those orders first.`,
      );
    }

    db.prepare('DELETE FROM ratings WHERE menuId = ?').run(id);
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);

    return res.json({ ok: true, deleted: id });
  }),
);

// ═══════════════════════════════════════════════════════════════════════
// PROMOS
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/promos',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const promos = db
      .prepare(
        `SELECT p.code, p.discount, p.description, p.expiresAt, p.maxUses, p.maxPerUser, p.firstOrderOnly
         FROM promos p
         ORDER BY p.code ASC`,
      )
      .all();

    // Attach usage count
    const enriched = promos.map((p) => {
      const { n } = db
        .prepare('SELECT COUNT(*) AS n FROM orders WHERE promoCode = ?')
        .get(p.code);
      return {
        ...p,
        firstOrderOnly: Boolean(p.firstOrderOnly),
        useCount: n,
      };
    });

    return res.json(enriched);
  }),
);

router.post(
  '/promos',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly } =
      req.body || {};

    if (typeof code !== 'string' || !code.trim()) {
      throw new HttpError(400, 'INVALID_CODE', 'Promo code is required');
    }
    if (typeof discount !== 'number' || discount <= 0 || discount > 1) {
      throw new HttpError(400, 'INVALID_DISCOUNT', 'Discount must be between 0 and 1');
    }

    const key = code.trim().toUpperCase();

    const exists = db.prepare('SELECT code FROM promos WHERE code = ?').get(key);
    if (exists) {
      throw new HttpError(409, 'PROMO_EXISTS', `Promo code ${key} already exists`);
    }

    db.prepare(
      `INSERT INTO promos (code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      key,
      discount,
      typeof description === 'string' ? description.trim() : '',
      expiresAt || null,
      maxUses || null,
      maxPerUser || null,
      firstOrderOnly ? 1 : 0,
    );

    const promo = db
      .prepare(
        'SELECT code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly FROM promos WHERE code = ?',
      )
      .get(key);
    return res.status(201).json({ ...promo, firstOrderOnly: Boolean(promo.firstOrderOnly) });
  }),
);

router.delete(
  '/promos/:code',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const code = req.params.code.toUpperCase();
    const exists = db.prepare('SELECT code FROM promos WHERE code = ?').get(code);
    if (!exists) throw new HttpError(404, 'PROMO_NOT_FOUND', 'Promo not found');

    db.prepare('DELETE FROM promos WHERE code = ?').run(code);
    return res.json({ ok: true, deleted: code });
  }),
);

// ═══════════════════════════════════════════════════════════════════════
// RATINGS
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/ratings',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const ratings = db
      .prepare(
        `SELECT r.id, r.userId, r.menuId, r.stars, r.review, r.createdAt,
                u.name AS userName, u.email AS userEmail,
                m.name AS menuName
         FROM ratings r
         JOIN users u ON u.id = r.userId
         JOIN menu_items m ON m.id = r.menuId
         ORDER BY r.createdAt DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) AS n FROM ratings').get().n;

    return res.json({ ratings, total, limit, offset });
  }),
);

// Delete a rating
router.delete(
  '/ratings/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Invalid rating id');
    }

    const existing = db.prepare('SELECT id FROM ratings WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'RATING_NOT_FOUND', 'Rating not found');

    db.prepare('DELETE FROM ratings WHERE id = ?').run(id);
    return res.json({ ok: true, deleted: id });
  }),
);

module.exports = router;
