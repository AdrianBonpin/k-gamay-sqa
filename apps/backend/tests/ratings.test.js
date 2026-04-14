'use strict';

const request = require('supertest');
const { freshApp } = require('./setup');

let app;
let tokenA;
let tokenB;
let menu;

const DELIVERY = { name: 'Tester', address: '1 Main St', phone: '555-1234' };

async function signup(email, password = 'password123', name = 'Test') {
  const res = await request(app).post('/api/auth/signup').send({ email, password, name });
  return res.body.token;
}

async function getMenu() {
  const res = await request(app).get('/api/menu');
  return res.body;
}

async function placeOrder(token, items) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items, delivery: DELIVERY });
  return res.body;
}

async function deliverOrder(token, orderId) {
  await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'in_progress' });
  await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'delivered' });
}

beforeEach(async () => {
  app = freshApp();
  tokenA = await signup('a@a.com', 'password123', 'Alice');
  tokenB = await signup('b@b.com', 'password123', 'Bob');
  menu = await getMenu();
});

describe('POST /api/ratings', () => {
  it('rejects rating without delivered order (403 NOT_ELIGIBLE)', async () => {
    const item = menu[0];
    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ELIGIBLE');
  });

  it('accepts rating after delivery and supports upsert', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    const r1 = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 4, review: 'Tasty' });
    expect(r1.status).toBe(200);
    expect(r1.body.rating.stars).toBe(4);
    expect(r1.body.rating.review).toBe('Tasty');

    const r2 = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5, review: 'Even better' });
    expect(r2.status).toBe(200);
    expect(r2.body.rating.stars).toBe(5);
    expect(r2.body.rating.review).toBe('Even better');
    expect(r2.body.rating.id).toBe(r1.body.rating.id);
  });

  it('rejects stars=0 with VALIDATION', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('rejects stars=6 with VALIDATION', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('rejects review longer than 500 chars', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5, review: 'a'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('GET /api/ratings/:menuId', () => {
  it('returns summary with correct average across multiple users', async () => {
    const item = menu[0];

    // Create third user and deliver orders for all three
    const tokenC = await signup('c@c.com', 'password123', 'Carol');

    for (const tok of [tokenA, tokenB, tokenC]) {
      const ord = await placeOrder(tok, [{ menuId: item.id, qty: 1 }]);
      await deliverOrder(tok, ord.orderId);
    }

    // Submit 5, 4, 3 -> avg 4.0
    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5 });
    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ menuId: item.id, stars: 4 });
    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ menuId: item.id, stars: 3 });

    const res = await request(app).get(`/api/ratings/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.count).toBe(3);
    expect(res.body.summary.average).toBeCloseTo(4.0, 1);
    expect(res.body.ratings).toHaveLength(3);
    expect(res.body.ratings[0]).toHaveProperty('userName');
  });
});

describe('GET /api/ratings/:menuId/mine', () => {
  it('returns null before rating, populated after', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    const before = await request(app)
      .get(`/api/ratings/${item.id}/mine`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(before.status).toBe(200);
    expect(before.body.rating).toBeNull();

    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5, review: 'Mine' });

    const after = await request(app)
      .get(`/api/ratings/${item.id}/mine`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(after.status).toBe(200);
    expect(after.body.rating).not.toBeNull();
    expect(after.body.rating.stars).toBe(5);
    expect(after.body.rating.review).toBe('Mine');
  });
});

describe('UNIQUE constraint via upsert', () => {
  it('keeps a single row when same user rates same item twice', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 3 });
    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 5 });

    const list = await request(app).get(`/api/ratings/${item.id}`);
    expect(list.body.summary.count).toBe(1);
    expect(list.body.summary.average).toBeCloseTo(5.0, 1);
    expect(list.body.ratings).toHaveLength(1);
  });
});

describe('GET /api/menu enrichment', () => {
  it('includes a rating object on every item', async () => {
    const items = await getMenu();
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(it).toHaveProperty('rating');
      expect(it.rating).toHaveProperty('average');
      expect(it.rating).toHaveProperty('count');
    }
  });

  it('reflects submitted ratings in the menu response', async () => {
    const item = menu[0];
    const order = await placeOrder(tokenA, [{ menuId: item.id, qty: 1 }]);
    await deliverOrder(tokenA, order.orderId);

    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ menuId: item.id, stars: 4 });

    const updated = await getMenu();
    const found = updated.find((i) => i.id === item.id);
    expect(found.rating.count).toBe(1);
    expect(found.rating.average).toBeCloseTo(4.0, 1);
  });
});
