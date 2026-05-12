import { join } from 'path';
import type { Elysia } from 'elysia';

/**
 * Resolved at import time (Bun). Points to frontend/dist relative to this
 * source file:  src/middleware/staticFiles.ts  →  ../../../frontend/dist
 */
const DIST = join(import.meta.dir, '../../../frontend/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function ext(path: string): string {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i).toLowerCase() : '';
}

/**
 * Production-only plugin that serves the built frontend SPA from
 * `apps/frontend/dist`.  Asset paths (with a file extension) are served
 * directly with long-lived cache headers.  All other paths fall back to
 * `index.html` so that React Router can handle client-side routing.
 *
 * This plugin MUST be registered **after** all `/api/*` routes so that
 * API requests are never intercepted.
 */
export function serveFrontend(app: Elysia): Elysia {
  return app
    // ── Static assets (hashed filenames → immutable cache) ──────────
    .get('*', async ({ path, set }) => {
      // Never intercept API calls
      if (path.startsWith('/api/')) return;

      const fileExt = ext(path);
      const filePath = path === '/' ? 'index.html' : path.slice(1);
      const full = join(DIST, filePath);

      // If the URL looks like an asset (has an extension), serve it
      // directly or return 404 if missing.
      if (fileExt) {
        const file = Bun.file(full);
        if (await file.exists()) {
          const isHtml = fileExt === '.html';
          return new Response(file, {
            headers: {
              'Content-Type': MIME[fileExt] ?? 'application/octet-stream',
              'Cache-Control': isHtml
                ? 'no-cache'
                : 'public, max-age=31536000, immutable',
            },
          });
        }
        set.status = 404;
        return 'Not found';
      }

      // ── SPA fallback: serve index.html for client-side routing ────
      const index = Bun.file(join(DIST, 'index.html'));
      if (await index.exists()) {
        return new Response(index, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // No dist directory present (shouldn't happen in production, but
      // let the request continue to the 404 handler).
    });
}
