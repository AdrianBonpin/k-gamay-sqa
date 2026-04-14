'use strict';

const request = require('supertest');
const { freshApp } = require('./setup');

let app;
beforeEach(() => {
  app = freshApp();
});

describe('promoService.lookupPromo (DB-backed)', () => {
  it('normalizes lowercase to match SAVE10', () => {
    const { lookupPromo } = require('../services/promoService');
    const p = lookupPromo('save10');
    expect(p).not.toBeNull();
    expect(p.code).toBe('SAVE10');
    expect(p.discount).toBeCloseTo(0.1);
  });

  it('matches exact uppercase SAVE10', () => {
    const { lookupPromo } = require('../services/promoService');
    const p = lookupPromo('SAVE10');
    expect(p.code).toBe('SAVE10');
  });

  it('trims whitespace and matches WELCOME', () => {
    const { lookupPromo } = require('../services/promoService');
    const p = lookupPromo('  WELCOME  ');
    expect(p).not.toBeNull();
    expect(p.code).toBe('WELCOME');
    expect(p.discount).toBeCloseTo(0.15);
  });

  it('returns null for unknown codes', () => {
    const { lookupPromo } = require('../services/promoService');
    expect(lookupPromo('NOPE')).toBeNull();
  });

  it('returns null for non-string inputs', () => {
    const { lookupPromo } = require('../services/promoService');
    expect(lookupPromo(null)).toBeNull();
    expect(lookupPromo(undefined)).toBeNull();
    expect(lookupPromo(123)).toBeNull();
    expect(lookupPromo('')).toBeNull();
  });

  it('returns null for expired promo', () => {
    const { getDb } = require('../db');
    const { lookupPromo } = require('../services/promoService');
    const db = getDb();
    db.prepare(
      `INSERT INTO promos (code, discount, description, expiresAt, maxUses, maxPerUser, firstOrderOnly)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('EXPIRED', 0.5, 'expired promo', '2000-01-01T00:00:00.000Z', null, null, 0);
    expect(lookupPromo('EXPIRED')).toBeNull();
  });

  it('enforces maxPerUser (SAVE10 maxPerUser=3)', async () => {
    const { getDb } = require('../db');
    const { lookupPromo } = require('../services/promoService');
    const db = getDb();
    // Insert a user and 3 prior orders with SAVE10.
    const userId = db
      .prepare('INSERT INTO users (email, passwordHash, name) VALUES (?, ?, ?)')
      .run('maxuser@x.com', 'hash', 'Max').lastInsertRowid;
    const ins = db.prepare(
      `INSERT INTO orders (userId, total, totalCents, status, promoCode, discount)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    ins.run(userId, 10, 1000, 'delivered', 'SAVE10', 0.1);
    ins.run(userId, 10, 1000, 'delivered', 'SAVE10', 0.1);
    ins.run(userId, 10, 1000, 'delivered', 'SAVE10', 0.1);
    // Without userId — still valid (shape only).
    expect(lookupPromo('SAVE10')).not.toBeNull();
    // With userId — should be null because limit reached.
    expect(lookupPromo('SAVE10', { userId })).toBeNull();
  });

  it('enforces firstOrderOnly for WELCOME on second order', () => {
    const { getDb } = require('../db');
    const { lookupPromo } = require('../services/promoService');
    const db = getDb();
    const userId = db
      .prepare('INSERT INTO users (email, passwordHash, name) VALUES (?, ?, ?)')
      .run('welcome@x.com', 'hash', 'Wel').lastInsertRowid;
    db.prepare(
      `INSERT INTO orders (userId, total, totalCents, status, promoCode, discount)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(userId, 10, 1000, 'delivered', null, 0);
    expect(lookupPromo('WELCOME', { userId })).toBeNull();
  });
});

describe('GET /api/promo/codes', () => {
  it('returns the 2 seeded active promos', async () => {
    const res = await request(app).get('/api/promo/codes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const codes = res.body.map((p) => p.code).sort();
    expect(codes).toEqual(['SAVE10', 'WELCOME']);
    const save = res.body.find((p) => p.code === 'SAVE10');
    expect(save.discount).toBeCloseTo(0.1);
    expect(save.description).toMatch(/10%/);
  });
});

describe('POST /api/promo/validate', () => {
  it('returns valid=true for SAVE10', async () => {
    const res = await request(app).post('/api/promo/validate').send({ code: 'save10' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.code).toBe('SAVE10');
    expect(res.body.discount).toBeCloseTo(0.1);
  });

  it('returns valid=false for bogus code', async () => {
    const res = await request(app).post('/api/promo/validate').send({ code: 'NOPE' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.discount).toBe(0);
  });

  it('returns 400 envelope when code missing', async () => {
    const res = await request(app).post('/api/promo/validate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROMO_CODE_REQUIRED');
  });
});
