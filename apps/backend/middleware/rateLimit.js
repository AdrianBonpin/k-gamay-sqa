'use strict';

const rateLimit = require('express-rate-limit');
const config = require('./../config');

const isTest = config.env === 'test';

function envelope(code, message) {
  return (req, res) => {
    res.status(429).json({
      error: { code, message, requestId: req.id },
    });
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: envelope('RATE_LIMITED_AUTH', 'Too many auth attempts, please try again later.'),
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: envelope('RATE_LIMITED', 'Too many requests, please slow down.'),
});

module.exports = { authLimiter, globalLimiter };
