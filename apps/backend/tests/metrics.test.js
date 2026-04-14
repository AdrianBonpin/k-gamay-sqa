'use strict';

const request = require('supertest');
const { freshApp } = require('./setup');

let app;
beforeEach(() => {
  app = freshApp();
});

describe('GET /metrics', () => {
  it('returns 200 text containing http_requests_total', async () => {
    // Make a request first to ensure the counter is populated.
    await request(app).get('/api/health');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
  });
});

describe('GET /api/health', () => {
  it('pings DB and returns uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('ok');
    expect(res.body.service).toBe('food-delivery-backend');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('echoes x-request-id header', async () => {
    const res = await request(app).get('/api/health').set('x-request-id', 'fixed-test-id-123');
    expect(res.headers['x-request-id']).toBe('fixed-test-id-123');
  });
});
