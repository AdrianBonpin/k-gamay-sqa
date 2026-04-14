'use strict';

const client = require('prom-client');

// Use a dedicated registry. Re-use across freshApp() rebuilds so we don't
// re-register metrics on the default registry (prom-client deduplicates by name).
const registry = new client.Registry();

// Guard default metrics registration.
if (!registry._defaultMetricsCollected) {
  client.collectDefaultMetrics({ register: registry });
  registry._defaultMetricsCollected = true;
}

function getOrRegister(factory, name) {
  const existing = registry.getSingleMetric(name);
  if (existing) return existing;
  const m = factory();
  // Ensure only on our registry.
  return m;
}

const httpRequestDuration = getOrRegister(
  () =>
    new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
  'http_request_duration_seconds',
);

const httpRequestsTotal = getOrRegister(
  () =>
    new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [registry],
    }),
  'http_requests_total',
);

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = (req.route && req.route.path) || req.baseUrl || req.path || 'unknown';
    const fullRoute = req.baseUrl ? `${req.baseUrl}${req.route ? req.route.path : ''}` : route;
    const method = req.method;
    const status = String(res.statusCode);
    const durSec = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.labels(method, fullRoute, status).observe(durSec);
    httpRequestsTotal.labels(method, fullRoute, status).inc();
  });
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

module.exports = {
  registry,
  metricsMiddleware,
  metricsHandler,
  httpRequestDuration,
  httpRequestsTotal,
};
