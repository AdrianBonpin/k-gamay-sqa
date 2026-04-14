'use strict';

const request = require('supertest');
const { freshApp } = require('./setup');

let app;
beforeEach(() => {
  app = freshApp();
});

describe('POST /api/auth/signup', () => {
  it('signs up a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'password123', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.name).toBe('Alice');
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'password123', name: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL');
    expect(res.body.error.message).toMatch(/email/i);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'b@c.com', password: 'short', name: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(res.body.error.message).toMatch(/8 characters/);
  });

  it('does not leak existence on duplicate email (generic 201, no token)', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup2' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toMatch(/inbox/i);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'u@u.com', password: 'password123', name: 'U' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@u.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('u@u.com');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@u.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toMatch(/invalid credentials/i);
  });

  it('returns 401 on unknown email (generic)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toMatch(/invalid credentials/i);
  });
});

describe('JWT payload', () => {
  it('contains only sub/jti/iss (minimal payload)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'min@jwt.com', password: 'password123', name: 'Min' });
    expect(res.status).toBe(201);
    const token = res.body.token;
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    expect(payload.sub).toBeDefined();
    expect(payload.jti).toBeDefined();
    expect(payload.iss).toBe('k-gamay');
    expect(payload.email).toBeUndefined();
    expect(payload.name).toBeUndefined();
  });
});
