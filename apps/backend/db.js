'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const SEED_MENU = require('./seed/menu.json');

const DEFAULT_DB_PATH = path.join(__dirname, 'db.sqlite');

const ISO_DEFAULT = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

// Promo seed data (migrated away from in-memory PROMO_CODES).
// maxUses null => unlimited. expiresAt null => never expires.
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

function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function init(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (${ISO_DEFAULT})
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      imageUrl TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (${ISO_DEFAULT}),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (${ISO_DEFAULT}),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      menuId INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      priceAtOrder REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menuId) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS promos (
      code TEXT PRIMARY KEY,
      discount REAL NOT NULL,
      description TEXT NOT NULL,
      expiresAt TEXT,
      maxUses INTEGER,
      maxPerUser INTEGER,
      firstOrderOnly INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      menuId INTEGER NOT NULL,
      stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
      review TEXT,
      createdAt TEXT NOT NULL DEFAULT (${ISO_DEFAULT}),
      UNIQUE(userId, menuId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(menuId) REFERENCES menu_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ratings_menu ON ratings(menuId);
  `);

  ensureColumn(db, 'orders', 'promoCode', 'promoCode TEXT');
  ensureColumn(db, 'orders', 'discount', 'discount REAL DEFAULT 0');
  ensureColumn(db, 'orders', 'totalCents', 'totalCents INTEGER');
  ensureColumn(db, 'orders', 'deliveryAddressId', 'deliveryAddressId INTEGER');

  // Migrate legacy createdAt values (e.g. 'YYYY-MM-DD HH:MM:SS') to ISO 'YYYY-MM-DDTHH:MM:SS.sssZ'.
  migrateLegacyDates(db);
}

function migrateLegacyDates(db) {
  const tables = ['users', 'orders', 'delivery_addresses'];
  for (const t of tables) {
    const rows = db
      .prepare(
        `SELECT id, createdAt FROM ${t} WHERE createdAt NOT LIKE '%T%' OR createdAt NOT LIKE '%Z'`,
      )
      .all();
    if (!rows.length) continue;
    const upd = db.prepare(`UPDATE ${t} SET createdAt = ? WHERE id = ?`);
    const tx = db.transaction((items) => {
      for (const r of items) {
        const iso = toIso(r.createdAt);
        upd.run(iso, r.id);
      }
    });
    tx(rows);
  }
}

function toIso(value) {
  if (typeof value !== 'string' || !value) {
    return new Date().toISOString();
  }
  if (value.includes('T') && value.endsWith('Z')) return value;
  // Legacy "YYYY-MM-DD HH:MM:SS" → assume UTC.
  const withT = value.replace(' ', 'T');
  const d = new Date(withT.endsWith('Z') ? withT : `${withT}Z`);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function seedIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get();
  if (row.n === 0) {
    const insert = db.prepare(
      'INSERT INTO menu_items (name, description, price, imageUrl, category) VALUES (?, ?, ?, ?, ?)',
    );
    const tx = db.transaction((items) => {
      for (const it of items) {
        insert.run(it.name, it.description, it.price, it.imageUrl, it.category);
      }
    });
    tx(SEED_MENU);
  }

  // Seed promos if table is empty.
  const promoCount = db.prepare('SELECT COUNT(*) AS n FROM promos').get();
  if (promoCount.n === 0) {
    const insert = db.prepare(
      `INSERT INTO promos (code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = db.transaction((items) => {
      for (const p of items) {
        insert.run(
          p.code,
          p.discount,
          p.description,
          p.expiresAt,
          p.maxUses,
          p.maxPerUser,
          p.firstOrderOnly,
        );
      }
    });
    tx(SEED_PROMOS);
  }
}

function createDb(dbPath = process.env.DB_PATH || DEFAULT_DB_PATH) {
  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  init(db);
  seedIfEmpty(db);
  return db;
}

let _singleton = null;

function getDb() {
  if (!_singleton) {
    _singleton = createDb();
  }
  return _singleton;
}

function resetDb() {
  if (_singleton) {
    try {
      _singleton.close();
    } catch (_) {
      /* ignore */
    }
  }
  _singleton = null;
}

function closeDb() {
  if (_singleton) {
    try {
      _singleton.close();
    } catch (_) {
      /* ignore */
    }
    _singleton = null;
  }
}

module.exports = { createDb, getDb, resetDb, closeDb, SEED_MENU, SEED_PROMOS };
