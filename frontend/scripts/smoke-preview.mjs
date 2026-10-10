/**
 * One-off smoke test: serves dist/ locally and verifies the prerendered
 * shell for key routes responds with real content (SPA root present).
 * Usage: node scripts/smoke-preview.mjs
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  let file = join(dist, p);
  // Prerendered routes are written as `<route>/index.html` directories.
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (p === '/' || !existsSync(file)) {
    // SPA fallback, mirroring vercel.json rewrites.
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(dist, 'index.html')));
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

const routes = ['/', '/about', '/map', '/categories', '/emergency'];

server.listen(4173, () => {
  let done = 0;
  let failed = false;
  for (const route of routes) {
    fetch(`http://localhost:4173${route}`)
      .then(async (r) => {
        const body = await r.text();
        const ok = r.status === 200 && body.includes('id="root"');
        console.log(`${ok ? 'PASS' : 'FAIL'} ${route} status=${r.status} bytes=${body.length}`);
        if (!ok) failed = true;
      })
      .catch((e) => {
        console.error(`FAIL ${route}: ${e.message}`);
        failed = true;
      })
      .finally(() => {
        if (++done === routes.length) {
          server.close();
          process.exit(failed ? 1 : 0);
        }
      });
  }
});

setTimeout(() => {
  console.error('FAIL: smoke test timed out');
  process.exit(1);
}, 15000);
