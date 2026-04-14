'use strict';

const request = require('supertest');
const { freshApp } = require('./setup');

let app;
let tokenA;
let tokenB;

const DELIVERY = { name: 'Tester', address: '1 Main St', phone: '555-1234' };

async function signup(email, password = 'password123', name = 'Test') {
  const res = await request(app).post('/api/auth/signup').send({ email, password, name });
  return res.body.token;
}

async function getMenu() {
  const res = await request(app).get('/api/menu');
  return res.body;
}

beforeEach(async () => {
  app = freshApp();
  tokenA = await signup('a@a.com', 'password123', 'Alice');
  tokenB = await signup('b@b.com', 'password123', 'Bob');
});

describe('POST /api/orders', () => {
  it('creates an order with 2 items and computes correct total', async () => {
    const menu = await getMenu();
    const i1 = menu[0];
    const i2 = menu[1];
    const expected = Math.round((i1.price * 2 + i2.price * 1) * 100) / 100;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        items: [
          { menuId: i1.id, qty: 2 },
          { menuId: i2.id, qty: 1 },
        ],
        delivery: DELIVERY,
      });
    expect(res.status).toBe(201);
    expect(res.body.total).toBeCloseTo(expected, 2);
    expect(res.body.items).toHaveLength(2);
  });

  it('rejects invalid menuId', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ menuId: 99999, qty: 1 }], delivery: DELIVERY });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MENU_ITEM_NOT_FOUND');
  });

  it('applies WELCOME 15% off on first order; rejects on second order', async () => {
    const menu = await getMenu();
    const item = menu[0];
    const expectedTotal = Math.round(item.price * 1 * (1 - 0.15) * 100) / 100;

    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        items: [{ menuId: item.id, qty: 1 }],
        promoCode: 'WELCOME',
        delivery: DELIVERY,
      });
    expect(first.status).toBe(201);
    expect(first.body.total).toBeCloseTo(expectedTotal, 2);
    expect(first.body.promoCode).toBe('WELCOME');
    expect(first.body.discount).toBeCloseTo(0.15);

    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        items: [{ menuId: item.id, qty: 1 }],
        promoCode: 'WELCOME',
        delivery: DELIVERY,
      });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('PROMO_INVALID');
  });

  it('applies SAVE10 10% off', async () => {
    const menu = await getMenu();
    const item = menu[0];
    const expected = Math.round(item.price * 1 * (1 - 0.1) * 100) / 100;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        items: [{ menuId: item.id, qty: 1 }],
        promoCode: 'SAVE10',
        delivery: DELIVERY,
      });
    expect(res.status).toBe(201);
    expect(res.body.total).toBeCloseTo(expected, 2);
    expect(res.body.promoCode).toBe('SAVE10');
  });

  it('returns 401 when missing auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ menuId: 1, qty: 1 }], delivery: DELIVERY });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_MISSING');
  });
});

describe('GET /api/orders/:id', () => {
  it("prevents user A from reading user B's order (404)", async () => {
    const menu = await getMenu();
    const create = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ items: [{ menuId: menu[0].id, qty: 1 }], delivery: DELIVERY });
    expect(create.status).toBe(201);
    const orderId = create.body.orderId;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });
});

describe('PATCH /api/orders/:id/status', () => {
  let orderId;
  beforeEach(async () => {
    const menu = await getMenu();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ menuId: menu[0].id, qty: 1 }], delivery: DELIVERY });
    orderId = res.body.orderId;
  });

  it('advances pending → in_progress', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('advances in_progress → delivered', async () => {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'in_progress' });
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });

  it('rejects backward transition (in_progress → pending)', async () => {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'in_progress' });
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'pending' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_STATUS_TRANSITION_INVALID');
  });

  it('rejects skipping pending → delivered', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_STATUS_TRANSITION_INVALID');
  });

  it("returns 404 when another user tries to advance owner's order", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns 404 for non-existent order', async () => {
    const res = await request(app)
      .patch('/api/orders/999999/status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });
});
