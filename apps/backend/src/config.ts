function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseBool(v: string | undefined, dflt = false): boolean {
  if (v === undefined || v === null || v === '') return dflt;
  return /^(1|true|yes|on)$/i.test(v);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  get isProd() { return this.env === 'production'; },
  get isTest() { return this.env === 'test'; },
  port: Number(process.env.PORT) || 4000,
  bodyLimit: process.env.BODY_LIMIT || '20kb',
  corsOrigins: parseList(process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173'),
  autoAdvanceOrders: parseBool(process.env.AUTO_ADVANCE_ORDERS, false),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/k-gamay',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('BETTER_AUTH_SECRET must be set in production'); })()
    : 'dev-only-better-auth-secret-change-me'),
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
};
