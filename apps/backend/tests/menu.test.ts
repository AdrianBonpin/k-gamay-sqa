import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('GET /api/menu', () => {
  it('returns array of menu items with rating summaries', async () => {
    const res = await request('/api/menu');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const item = body[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('price');
    expect(item).toHaveProperty('category');
    expect(item).toHaveProperty('rating');
    expect(item.rating).toHaveProperty('average');
    expect(item.rating).toHaveProperty('count');
  });
});
