import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createProvider } from './provider.js';
import { Store, Workflow } from './workflow.js';
import { configured, login, verify } from './auth.js';
import { seedDemo } from './fixtures.js';

export function createApp({ env = process.env, store = new Store(), provider = createProvider(env) } = {}) {
  if (env.DEMO_MODE && env.DEMO_MODE !== 'true') throw new Error('DEMO_MODE must be true; live operation is disabled');
  const workflow = new Workflow(store, provider);
  const server = http.createServer(async (req, res) => {
    const send = (status, value, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" }); res.end(type === 'application/json' ? JSON.stringify(value) : value); };
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      if (req.method === 'GET' && files[pathname]) { const [file, type] = files[pathname]; return send(200, readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), type); }
      if (!pathname.startsWith('/api/')) return send(404, { error: 'Not found' });
      if (!configured(env)) return send(503, { error: 'Configuration error: REVIEW_PASSWORD and SESSION_SECRET are required' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Origin rejected' });
      let body = {};
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON required' });
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) return send(413, { error: 'Request too large' }); }
        try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'Invalid JSON' }); }
      }
      if (pathname === '/api/login' && req.method === 'POST') return send(200, { token: login(body.password, env) });
      if (!verify(req.headers.authorization?.replace(/^Bearer /, ''), env)) return send(401, { error: 'Authentication required' });
      if (pathname === '/api/state' && req.method === 'GET') return send(200, store.state);
      if (req.method === 'POST') {
        if (pathname === '/api/generate') return send(200, await workflow.generate(body.topic));
        if (pathname === '/api/review') return send(200, workflow.review(body.id, body.action, body.caption, body.scheduledAt));
        if (pathname === '/api/publish') return send(200, await workflow.publish(body.id));
        if (pathname === '/api/tick') return send(200, await workflow.tick());
      }
      send(404, { error: 'Not found' });
    } catch (error) { send(error.status || 400, { error: error.message }); }
  });
  return { server, workflow };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = new Store(new URL('../runtime/state.json', import.meta.url));
  seedDemo(store);
  const { server, workflow } = createApp({ store });
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('AI Content Workflow Agent — local demo ready'));
  const timer = setInterval(() => workflow.tick().catch(() => console.error('scheduler_failed')), 15000);
  timer.unref(); server.on('close', () => clearInterval(timer));
}
