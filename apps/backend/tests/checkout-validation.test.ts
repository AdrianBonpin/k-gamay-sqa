import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

async function signupAndGetCookie(email: string) {
  const { getApp } = await import('./setup');
  const app = getApp();
  const res = await app.fetch(
    new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', name: 'Checkout Tester' }),
    }),
  );
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('No cookie in signup');
  return setCookie.split(';')[0];
}

async function getFirstMenuItemId() {
  const res = await request('/api/menu');
  const menu = await res.json();
  return menu[0].id;
}

let authCookie: string;
let menuId: number;

beforeAll(async () => {
  await freshApp();
  authCookie = await signupAndGetCookie(`validate-${Date.now()}@test.com`);
  menuId = await getFirstMenuItemId();
});

const validOrder = (overrides?: Record<string, unknown>) => ({
  items: [{ menuId, qty: 1 }],
  delivery: { name: 'Test', address: '123 St', phone: '555-1234' },
  ...overrides,
});

describe('POST /api/orders — input validation', () => {
  it('rejects phone number with letters', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: 'abc-defg' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects phone number too short', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: '123' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects name exceeding 200 chars', async () => {
    const longName = 'A'.repeat(201);
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: longName, address: 'X', phone: '555-0000' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects address exceeding 500 chars', async () => {
    const longAddr = 'A'.repeat(501);
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'X', address: longAddr, phone: '555-0000' } }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid payment method', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ paymentMethod: 'bitcoin' }),
      ),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PAYMENT_METHOD');
  });

  it('accepts valid payment method "cod"', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ paymentMethod: 'cod' }),
      ),
    });
    expect(res.status).toBe(200);
  });

  it('accepts phone with valid characters like + and ()', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': authCookie },
      body: JSON.stringify(
        validOrder({ delivery: { name: 'A', address: 'B', phone: '+63 (917) 123-4567' } }),
      ),
    });
    expect(res.status).toBe(200);
  });
});