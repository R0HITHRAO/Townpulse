/**
 * Preview smoke test: serves dist/ locally (mirroring the Vercel rewrite rule),
 * then checks both the served HTML and the rendered application.
 *
 * Why a browser is involved
 * -------------------------
 * The HTTP checks below catch a missing file or a broken SPA fallback, but every
 * path returns the same 200 `index.html`, so they cannot see a route that loads
 * and *then* navigates somewhere else. A deep link is exactly that failure mode:
 * `/listings/<id>` or `/admin` can serve 200, boot the app, and land on `/`
 * (a stray redirect, a route guard, or a catch-all route winning) while the
 * response looks perfect. That is why the last two checks load the URL in a real
 * browser and assert both the URL and the heading it renders.
 *
 * The browser is the locally installed Chrome or Edge — `playwright-core`
 * ships no browser download. Set `SMOKE_BROWSER_CHANNEL=msedge` (or `chrome`) to
 * choose one; set `SMOKE_SKIP_BROWSER=1` to run the HTTP checks alone on a
 * machine with no browser.
 *
 * Usage: npm run build && node scripts/smoke-preview.mjs
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}

const PORT = Number(process.env.SMOKE_PORT || 4173);
const BASE = `http://localhost:${PORT}`;

// Fixtures. The repository snapshot ships no listings, so the listing deep link
// is checked against a record supplied at request time instead of on disk.
const LISTING_ID = 'osm-smoke-1';
const LISTING_NAME = 'Smoke Test Pharmacy';
const SNAPSHOT = {
  generated_from: null,
  attribution: 'smoke test fixture',
  town: null,
  categories: [],
  listings: [
    {
      id: LISTING_ID,
      name: LISTING_NAME,
      address: '1 Test Road, Bhavani',
      verified: true,
      status: 'active',
      description: 'Fixture used by the preview smoke test.',
      category: { id: 2, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
      lat: 11.4455,
      lng: 77.6819,
      phone: '+91 90000 00000',
      hours: { all_days: '9:00 AM - 9:00 PM' },
    },
  ],
};
const ADMIN_USER = {
  id: 'u-smoke-admin',
  name: 'Smoke Admin',
  email: 'smoke@townpulse.test',
  role: 'admin',
  phone_verified: true,
  email_verified: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};
// Text unique to the homepage hero: if it is on screen, the deep link bounced.
const HOME_HERO = 'Find what you need right around you.';

const failures = [];
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label, detail) => {
  failures.push(detail ? `${label}: ${detail}` : label);
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
};

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const requestPath = req.url.split('?')[0];
  let file = join(dist, requestPath);
  // Prerendered routes are written as `<route>/index.html` directories.
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (requestPath === '/' || !existsSync(file)) {
    // SPA fallback, mirroring the vercel.json rewrite.
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(dist, 'index.html')));
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

/** Deep links must serve the shell too, even though no file exists for them. */
const routes = ['/', '/about', '/map', '/categories', '/emergency', `/listings/${LISTING_ID}`, '/admin'];

async function checkHttp(route) {
  const response = await fetch(`${BASE}${route}`);
  const body = await response.text();
  const ok = response.status === 200 && body.includes('id="root"');
  if (ok) pass(`http ${route} status=${response.status} bytes=${body.length}`);
  else fail(`http ${route}`, `status=${response.status} bytes=${body.length}`);
}

async function launchBrowser() {
  const channels = [process.env.SMOKE_BROWSER_CHANNEL, 'chrome', 'msedge'].filter(Boolean);
  let lastError;
  for (const channel of channels) {
    try {
      const browser = await chromium.launch({ channel });
      console.log(`browser: ${channel} ${browser.version()}`);
      return browser;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `no Chrome or Edge could be launched${lastError ? ` (${lastError.message.split('\n')[0]})` : ''}`
  );
}

/**
 * Loads `path` as a fresh document — the deep-link case a crawler or a pasted
 * link produces — and fails if the app ends somewhere else or renders the wrong
 * page.
 */
async function checkDeepLink(context, { path, heading }) {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() !== 200) {
      fail(`deep link ${path}`, `document status=${response ? response.status() : 'none'}`);
      return;
    }

    // Wait for the lazy route to mount and settle on its heading.
    await page
      .waitForFunction(
        (expected) => {
          const el = document.querySelector('h1');
          return !!el && el.textContent.trim() === expected;
        },
        heading,
        { timeout: 10_000 }
      )
      .catch(() => {});

    const finalUrl = page.url();
    const finalPath = new URL(finalUrl).pathname;
    const renderedHeading = (await page.locator('h1').first().textContent().catch(() => null))?.trim();
    // Collapse whitespace: the hero heading is split across inline elements, so
    // `innerText` contains newlines where the source has spaces.
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const bouncedHome = body.includes(HOME_HERO);

    if (finalPath === path) pass(`deep link ${path} kept its URL`);
    else fail(`deep link ${path}`, `URL changed to ${finalPath}`);

    if (renderedHeading === heading) pass(`deep link ${path} rendered "${heading}"`);
    else fail(`deep link ${path}`, `rendered "${renderedHeading ?? 'no heading'}"`);

    if (bouncedHome) fail(`deep link ${path}`, 'homepage hero is on screen');
    else pass(`deep link ${path} did not fall back to the homepage`);
  } finally {
    await page.close();
  }
}

async function checkBrowser() {
  if (process.env.SMOKE_SKIP_BROWSER === '1') {
    console.log('SKIP browser checks (SMOKE_SKIP_BROWSER=1)');
    return;
  }

  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    fail('browser checks', `${error.message} — install Chrome/Edge or set SMOKE_SKIP_BROWSER=1`);
    return;
  }

  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });

    // Sign in as an administrator before any application script runs, so the
    // /admin deep link exercises the page itself rather than the login guard.
    await context.addInitScript((user) => {
      try {
        localStorage.setItem('townpulse_access_token', 'smoke-token');
        localStorage.setItem('townpulse_user', JSON.stringify(user));
      } catch {
        /* storage unavailable — the guard will redirect and the check will say so */
      }
    }, ADMIN_USER);

    // There is no backend behind the static preview: answer API calls explicitly
    // so the pages take their offline paths instead of parsing the HTML fallback.
    await context.route('**/api/**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'smoke test: no backend' }),
      })
    );
    await context.route('**/data/listings.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SNAPSHOT),
      })
    );
    // Keep the run deterministic and offline: no map tiles, fonts or analytics.
    await context.route('https://**', (route) => route.abort());

    await checkDeepLink(context, { path: `/listings/${LISTING_ID}`, heading: LISTING_NAME });
    await checkDeepLink(context, { path: '/admin', heading: 'Town Administrator Console' });

    await context.close();
  } finally {
    await browser.close();
  }
}

const watchdog = setTimeout(() => {
  console.error('FAIL: smoke test timed out');
  process.exit(1);
}, 60_000);

server.on('error', (error) => {
  console.error(`FAIL: could not serve dist on ${PORT} — ${error.message}`);
  process.exit(1);
});

server.listen(PORT, async () => {
  try {
    for (const route of routes) await checkHttp(route);
    await checkBrowser();
  } catch (error) {
    fail('smoke test', error.stack || error.message);
  } finally {
    clearTimeout(watchdog);
    server.close();
    if (failures.length > 0) {
      console.error(`\n${failures.length} check(s) failed.`);
      process.exit(1);
    }
    console.log('\nAll preview smoke checks passed.');
    process.exit(0);
  }
});
