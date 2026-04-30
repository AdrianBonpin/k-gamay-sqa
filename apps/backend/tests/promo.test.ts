import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('POST /api/promo/validate', () => {
  it('validates SAVE10 promo', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SAVE10' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount).toBe(0.1);
  });

  it('rejects invalid promo', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALID' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it('requires promo code', async () => {
    const res = await request('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/promo/codes', () => {
  it('returns active promos', async () => {
    const res = await request('/api/promo/codes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
