'use strict';

const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { signToken } = require('../middleware/auth');
const { revoke } = require('../middleware/tokenDenylist');
const { HttpError } = require('../lib/asyncHandler');
const config = require('../config');
const logger = require('../lib/logger');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Fixed dummy hash used to equalize timing on login for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', config.bcryptCost);

function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function truncatePassword(password) {
  const buf = Buffer.from(password, 'utf8');
  if (buf.byteLength > 72) {
    return buf.slice(0, 72).toString('utf8');
  }
  return password;
}

async function signup({ email, password, name }) {
  if (!validateEmail(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', 'Invalid email');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      'INVALID_PASSWORD',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  if (typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, 'INVALID_NAME', 'Name is required');
  }

  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    logger.info({ op: 'auth.signup', outcome: 'duplicate_email' }, 'signup duplicate');
    return {
      duplicate: true,
      response: {
        ok: true,
        message: 'Check your inbox to verify your account',
      },
    };
  }

  const pwd = truncatePassword(password);
  const passwordHash = await bcrypt.hash(pwd, config.bcryptCost);
  const info = db
    .prepare('INSERT INTO users (email, passwordHash, name) VALUES (?, ?, ?)')
    .run(normalizedEmail, passwordHash, name.trim());

  const user = {
    id: info.lastInsertRowid,
    email: normalizedEmail,
    name: name.trim(),
  };
  const { token } = signToken(user);
  logger.info({ op: 'auth.signup', userId: user.id }, 'signup ok');
  return { duplicate: false, response: { token, user } };
}

async function login({ email, password }) {
  if (!validateEmail(email) || typeof password !== 'string' || !password) {
    await bcrypt.compare('x', DUMMY_HASH);
    throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
  }
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const row = db
    .prepare('SELECT id, email, passwordHash, name FROM users WHERE email = ?')
    .get(normalizedEmail);

  const pwd = truncatePassword(password);
  if (!row) {
    await bcrypt.compare(pwd, DUMMY_HASH);
    throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
  }
  const ok = await bcrypt.compare(pwd, row.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
  }
  const user = { id: row.id, email: row.email, name: row.name };
  const { token } = signToken(user);
  logger.info({ op: 'auth.login', userId: user.id }, 'login ok');
  return { token, user };
}

function logout({ jti }) {
  if (jti) revoke(jti);
  return { ok: true };
}

module.exports = { signup, login, logout, DUMMY_HASH, MIN_PASSWORD_LENGTH };
