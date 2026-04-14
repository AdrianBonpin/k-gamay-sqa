'use strict';

const { getDb } = require('../db');
const { HttpError } = require('../lib/asyncHandler');

const REVIEW_MAX_LEN = 500;

function validateStars(stars) {
  const n = Number(stars);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new HttpError(400, 'VALIDATION', 'Stars must be an integer between 1 and 5');
  }
  return n;
}

function validateReview(review) {
  if (review === undefined || review === null || review === '') return null;
  if (typeof review !== 'string') {
    throw new HttpError(400, 'VALIDATION', 'Review must be a string');
  }
  const trimmed = review.trim();
  if (trimmed.length > REVIEW_MAX_LEN) {
    throw new HttpError(400, 'VALIDATION', `Review must be ${REVIEW_MAX_LEN} characters or fewer`);
  }
  return trimmed.length === 0 ? null : trimmed;
}

function validateMenuId(menuId) {
  const n = Number(menuId);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
  }
  return n;
}

function userHasDeliveredItem(db, userId, menuId) {
  const row = db
    .prepare(
      `SELECT 1 AS ok
         FROM orders o
         JOIN order_items oi ON oi.orderId = o.id
        WHERE o.userId = ? AND oi.menuId = ? AND o.status = 'delivered'
        LIMIT 1`,
    )
    .get(userId, menuId);
  return !!row;
}

function upsertRating({ userId, menuId, stars, review }) {
  const mid = validateMenuId(menuId);
  const s = validateStars(stars);
  const r = validateReview(review);

  const db = getDb();
  // Check menu item exists
  const menuExists = db.prepare('SELECT 1 AS ok FROM menu_items WHERE id = ?').get(mid);
  if (!menuExists) {
    throw new HttpError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
  }

  if (!userHasDeliveredItem(db, userId, mid)) {
    throw new HttpError(403, 'NOT_ELIGIBLE', 'You can rate items only after delivery');
  }

  db.prepare(
    `INSERT INTO ratings (userId, menuId, stars, review)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId, menuId) DO UPDATE SET
       stars = excluded.stars,
       review = excluded.review,
       createdAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).run(userId, mid, s, r);

  const row = db
    .prepare(
      `SELECT r.id, r.userId, r.menuId, r.stars, r.review, r.createdAt, u.name AS userName
         FROM ratings r
         JOIN users u ON u.id = r.userId
        WHERE r.userId = ? AND r.menuId = ?`,
    )
    .get(userId, mid);
  return row;
}

function listRatingsForItem(menuId, { limit = 20, offset = 0 } = {}) {
  const mid = validateMenuId(menuId);
  const db = getDb();
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  return db
    .prepare(
      `SELECT r.id, r.userId, r.menuId, r.stars, r.review, r.createdAt, u.name AS userName
         FROM ratings r
         JOIN users u ON u.id = r.userId
        WHERE r.menuId = ?
        ORDER BY r.createdAt DESC, r.id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(mid, lim, off);
}

function getSummary(menuId) {
  const mid = validateMenuId(menuId);
  const db = getDb();
  const row = db
    .prepare('SELECT AVG(stars) AS avg, COUNT(*) AS cnt FROM ratings WHERE menuId = ?')
    .get(mid);
  const avg = row && row.avg != null ? Math.round(row.avg * 10) / 10 : 0;
  const count = row ? Number(row.cnt) : 0;
  return { menuId: mid, average: avg, count };
}

function getSummariesForMenuIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return new Map();
  const cleaned = ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
  if (cleaned.length === 0) return new Map();
  const db = getDb();
  const placeholders = cleaned.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT menuId, AVG(stars) AS avg, COUNT(*) AS cnt
         FROM ratings
        WHERE menuId IN (${placeholders})
        GROUP BY menuId`,
    )
    .all(...cleaned);
  const map = new Map();
  for (const id of cleaned) {
    map.set(id, { menuId: id, average: 0, count: 0 });
  }
  for (const r of rows) {
    map.set(r.menuId, {
      menuId: r.menuId,
      average: r.avg != null ? Math.round(r.avg * 10) / 10 : 0,
      count: Number(r.cnt) || 0,
    });
  }
  return map;
}

function getMyRating({ userId, menuId }) {
  const mid = validateMenuId(menuId);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT r.id, r.userId, r.menuId, r.stars, r.review, r.createdAt, u.name AS userName
         FROM ratings r
         JOIN users u ON u.id = r.userId
        WHERE r.userId = ? AND r.menuId = ?`,
    )
    .get(userId, mid);
  return row || null;
}

function getTotalRatingsCount() {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM ratings').get();
  return row ? Number(row.n) : 0;
}

module.exports = {
  upsertRating,
  listRatingsForItem,
  getSummary,
  getSummariesForMenuIds,
  getMyRating,
  getTotalRatingsCount,
};
