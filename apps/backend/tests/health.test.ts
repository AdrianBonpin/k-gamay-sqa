import { describe, it, expect, beforeAll } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

beforeAll(async () => {
  await freshApp();
});

describe('GET /api/health', () => {
  it('returns 200 with ok status when DB is up', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe('ok');
    expect(body.service).toBe('food-delivery-backend');
  });
});
