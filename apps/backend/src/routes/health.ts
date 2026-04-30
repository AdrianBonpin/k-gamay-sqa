import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export const healthRoutes = new Elysia()
  .get('/api/health', async () => {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      return { ok: true, db: 'ok', service: 'food-delivery-backend', uptime: process.uptime() };
    } catch {
      return new Response(
        JSON.stringify({ ok: false, db: 'error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }
  });
