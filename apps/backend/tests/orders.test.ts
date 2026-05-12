import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request } from './setup';

let authCookie: string;

async function signupAndGetCookie(email: string = 'order-test@test.com') {
  const app = (await import('./setup')).getApp();
  // Use app.fetch directly to capture Set-Cookie header
  const res = await app.fetch(
    new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', name: 'Order Tester' }),
    }),
  );
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    // Extract just the cookie name=value part (before first ;)
    return setCookie.split(';')[0];
  }
  throw new Error('No set-cookie header in signup response');
}

async function getFirstMenuItemId() {
  const menuRes = await request('/api/menu');
  const menu = await menuRes.json();
  return menu[0].id;
}

beforeAll(async () => {
  await freshApp();
  authCookie = await signupAndGetCookie();
});

describe('POST /api/orders', () => {
  it('creates an order with valid items and delivery', async () => {
    const menuId = await getFirstMenuItemId();
    const res = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        items: [{ menuId, qty: 2 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.orderId).toBe('string');
    expect(body.status).toBe('pending');
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.length).toBe(1);
  });

  it('rejects order without auth', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ menuId: 1, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid menu item', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        items: [{ menuId: 99999, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders', () => {
  it('lists orders for authenticated user', async () => {
    const res = await request('/api/orders', {
      headers: { Cookie: authCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  async function createTestOrder() {
    const menuId = await getFirstMenuItemId();
    const res = await request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        items: [{ menuId, qty: 1 }],
        delivery: { name: 'Home', address: '123 St', phone: '555-1234' },
      }),
    });
    return (await res.json()).orderId;
  }

  it('advances order from pending to in_progress', async () => {
    const orderId = await createTestOrder();
    const res = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
  });

  it('rejects invalid status transition (skipping in_progress)', async () => {
    const orderId = await createTestOrder();
    const res = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ status: 'delivered' }),
    });
    expect(res.status).toBe(400);
  });
});
