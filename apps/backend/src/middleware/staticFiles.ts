import { join } from 'path';

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
 * Attempts to serve a static file or index.html (SPA fallback) for a
 * given path.  Returns a Response if the file exists, or null if the
 * path should be handled elsewhere (e.g. as a 404 API response).
 *
 * Call this from a catch-all route handler for paths that do NOT start
 * with /api/.  Asset paths (with a file extension) are served with
 * long-lived cache headers; everything else falls back to index.html
 * for client-side routing.
 */
export async function tryServeFrontend(path: string): Promise<Response | null> {
  // Never serve frontend for API paths
  if (path.startsWith('/api/')) return null;

  const fileExt = ext(path);
  const filePath = path === '/' ? 'index.html' : path.slice(1);
  const full = join(DIST, filePath);

  // If the URL looks like an asset (has an extension), serve it directly
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
    return null;
  }

  // SPA fallback: serve index.html for client-side routing
  const index = Bun.file(join(DIST, 'index.html'));
  if (await index.exists()) {
    return new Response(index, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return null;
}
