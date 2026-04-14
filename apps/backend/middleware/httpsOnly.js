'use strict';

const config = require('../config');

function httpsOnly(req, res, next) {
  if (config.env !== 'production') return next();
  const proto = req.headers['x-forwarded-proto'];
  if (proto === 'http') {
    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  return next();
}

module.exports = { httpsOnly };
