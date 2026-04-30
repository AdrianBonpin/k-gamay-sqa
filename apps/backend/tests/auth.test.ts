import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { freshApp, request, cleanDb } from './setup';

beforeAll(async () => {
  await freshApp();
});

afterEach(async () => {
  await cleanDb();
});

describe('POST /api/auth/signup', () => {
  it('creates a user and returns token + user', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test User' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.name).toBe('Test User');
  });

  it('rejects invalid email', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '123', name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    // Signup first
    await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@test.com', password: 'password123', name: 'Login User' }),
    });
    // Login
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@test.com', password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(body.user.email).toBe('login@test.com');
  });

  it('rejects invalid credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });
});
