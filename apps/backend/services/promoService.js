'use strict';

const { getDb } = require('../db');

/**
 * Look up a promo by code and validate it against optional user context.
 * @param {string} code
 * @param {{userId?: number}} [opts]
 * @returns {{code:string, discount:number, description:string, firstOrderOnly:boolean} | null}
 */
function lookupPromo(code, opts = {}) {
  if (typeof code !== 'string') return null;
  const key = code.trim().toUpperCase();
  if (!key) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly
         FROM promos WHERE code = ?`,
    )
    .get(key);
  if (!row) return null;

  // Expiry check.
  if (row.expiresAt) {
    const exp = new Date(row.expiresAt).getTime();
    if (Number.isFinite(exp) && exp <= Date.now()) {
      return null;
    }
  }

  // Global maxUses.
  if (Number.isInteger(row.maxUses) && row.maxUses > 0) {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE promoCode = ?').get(row.code);
    if (n >= row.maxUses) return null;
  }

  const userId = opts && opts.userId;
  if (Number.isInteger(userId) && userId > 0) {
    if (Number.isInteger(row.maxPerUser) && row.maxPerUser > 0) {
      const { n } = db
        .prepare('SELECT COUNT(*) AS n FROM orders WHERE userId = ? AND promoCode = ?')
        .get(userId, row.code);
      if (n >= row.maxPerUser) return null;
    }
    if (row.firstOrderOnly) {
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE userId = ?').get(userId);
      if (n > 0) return null;
    }
  } else {
    // No user context: firstOrderOnly cannot be validated here, defer.
    // maxPerUser cannot be validated either. lookupPromo without userId is
    // only safe to call for *shape* validation (e.g. /api/promo/validate).
  }

  return {
    code: row.code,
    discount: row.discount,
    description: row.description,
    firstOrderOnly: Boolean(row.firstOrderOnly),
  };
}

/**
 * List currently active (non-expired) promos for public display.
 */
function listActivePromos() {
  const db = getDb();
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT code, discount, description, firstOrderOnly
         FROM promos
        WHERE expiresAt IS NULL OR expiresAt > ?
        ORDER BY code ASC`,
    )
    .all(now);
  return rows.map((r) => ({
    code: r.code,
    discount: r.discount,
    description: r.description,
    firstOrderOnly: Boolean(r.firstOrderOnly),
  }));
}

module.exports = { lookupPromo, listActivePromos };
