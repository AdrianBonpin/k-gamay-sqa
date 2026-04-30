import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

let authCookie: string;
let menuItemId: number;

async function signupAndGetCookie() {
  const app = (await import('./setup')).getApp();
  const res = await app.fetch(
    new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rating-test@test.com', password: 'password123', name: 'Rating Tester' }),
    }),
  );
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    return setCookie.split(';')[0];
  }
  throw new Error('No set-cookie header in signup response');
}

async function placeDeliveredOrder(cookie: string) {
  const menuRes = await request('/api/menu');
  const menu = await menuRes.json();
  menuItemId = menu[0].id;

  const createRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      items: [{ menuId: menuItemId, qty: 1 }],
      delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
    }),
  });
  const order = await createRes.json();

  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'delivered' }),
  });
}

beforeAll(async () => {
  await freshApp();
  authCookie = await signupAndGetCookie();
  await placeDeliveredOrder(authCookie);
});

afterEach(async () => {
  await cleanDb();
});

describe('POST /api/ratings', () => {
  it('submits a rating for a delivered item', async () => {
    const res = await request('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ menuId: menuItemId, stars: 4, review: 'Great!' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rating.stars).toBe(4);
    expect(body.rating.review).toBe('Great!');
  });

  it('rejects rating without auth', async () => {
    const res = await request('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId: 1, stars: 5 }),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/ratings/:menuId', () => {
  it('returns summary and ratings list', async () => {
    const res = await request(`/api/ratings/${menuItemId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('ratings');
    expect(Array.isArray(body.ratings)).toBe(true);
  });
});

describe('GET /api/ratings/summary', () => {
  it('returns total ratings count', async () => {
    const res = await request('/api/ratings/summary');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    // total may be a number or string from SQL; accept both
    const total = Number(body.total);
    expect(Number.isFinite(total)).toBe(true);
  });
});
