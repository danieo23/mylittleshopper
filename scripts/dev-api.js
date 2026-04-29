/**
 * Lightweight dev API server — wraps Vercel-format handlers so they run locally.
 * Usage: node scripts/dev-api.js
 * Starts on PORT env var (default 3001).
 */

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// Load .env.local into process.env
try {
  const env = readFileSync(join(root, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
} catch {}

// Lazy-load route handlers
const routes = {
  '/api/agent':           () => import('../api/agent.js'),
  '/api/analyze':         () => import('../api/analyze.js'),
  '/api/lens':            () => import('../api/lens.js'),
  '/api/conversations':   () => import('../api/conversations.js'),
  '/api/feedback':        () => import('../api/feedback.js'),
  '/api/admin-brands':    () => import('../api/admin-brands.js'),
  '/api/style-tags':      () => import('../api/style-tags.js'),
  '/api/upload-wardrobe': () => import('../api/upload-wardrobe.js'),
  '/api/wardrobe-profile':() => import('../api/wardrobe-profile.js'),
};

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url, 'http://localhost');
  const loader = routes[url.pathname];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (!loader) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `No handler for ${url.pathname}` }));
    return;
  }

  try {
    const mod = await loader();
    const handler = mod.default;

    const body  = await bodyOf(req);
    const query = Object.fromEntries(url.searchParams);

    // Build a Vercel-compatible request object
    const vReq = Object.assign(req, { body, query });

    // Build a Vercel-compatible response object
    let statusCode = 200;
    const headers  = { 'Content-Type': 'application/json' };
    const vRes = {
      status(code)      { statusCode = code; return vRes; },
      setHeader(k, v)   { headers[k] = v; return vRes; },
      json(data)        { send(JSON.stringify(data)); },
      send(data)        { send(data); },
      end(data)         { send(data ?? ''); },
    };
    function send(body) {
      res.writeHead(statusCode, headers);
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    }

    await handler(vReq, vRes);
  } catch (err) {
    console.error(`[dev-api] ${url.pathname} error:`, err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }
});

const PORT = process.env.DEV_API_PORT ?? 3001;
server.listen(PORT, () => console.log(`[dev-api] listening on http://localhost:${PORT}`));
